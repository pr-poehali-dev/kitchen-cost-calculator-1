import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useStore, saveStateToDb } from '@/store/useStore';
import { getGlobalState } from '@/store/stateCore';
import { useCatalog, bulkUpsertMaterials, loadCatalog } from '@/hooks/useCatalog';
import { Modal } from '../BaseShared';
import { TMF_COLLECTIONS, tmfColorMaterialId, tmfColorVariantId } from './tmfConfig';
import { extractPrices, extractColorVariants, type ParsedCollection } from './tmfParser';
import { TmfUploadStep, TmfPreviewStep, TmfDoneStep } from './TmfImportSteps';

export { tmfColorMaterialId } from './tmfConfig';

interface Props { onClose: () => void }

export default function TmfImportModal({ onClose }: Props) {
  const store = useStore();
  const catalog = useCatalog();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [collections, setCollections] = useState<ParsedCollection[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState({ created: 0, updated: 0 });
  const [sheetNames, setSheetNames] = useState<string[]>([]);

  const handleFile = (file: File) => {
    setLoading(true);
    setError('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' });
        const results: ParsedCollection[] = [];

        // Фиксируем имена листов в локальный массив
        const allSheetNames: string[] = [...wb.SheetNames];

        // Нормализованные имена для диагностики
        setSheetNames(allSheetNames.map(n => {
          const normed = Array.from(n.normalize('NFC')).filter(c => /[a-zа-яё0-9]/i.test(c)).join('').toLowerCase().replace(/ё/g, 'е');
          return `${n} [${normed}]`;
        }));

        // Нормализация: оставляем только буквы и цифры
        const normName = (s: string) =>
          Array.from(s.normalize('NFC'))
            .filter(c => /[a-zа-яё0-9]/i.test(c))
            .join('')
            .toLowerCase()
            .replace(/ё/g, 'е');

        for (const cfg of TMF_COLLECTIONS) {
          const key = normName(cfg.sheetName);

          // Ищем по локальному массиву (не по wb.SheetNames напрямую)
          const found = allSheetNames.find(n => normName(n) === key)
            ?? allSheetNames.find(n => { const nn = normName(n); return nn.includes(key) || key.includes(nn); })
            ?? (key.length >= 5 ? allSheetNames.find(n => normName(n).startsWith(key.slice(0, 5))) : undefined);

          if (!found) {
            results.push({ config: cfg, found: false, prices: {}, colors: [] });
            continue;
          }
          const wsName = found;

          const ws = wb.Sheets[wsName];
          const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
          const prices = extractPrices(rows, cfg.variants);
          const colorMap = extractColorVariants(rows, cfg);

          const colors = Array.from(colorMap.entries()).map(([colorName, variantKeys]) => ({
            colorName,
            variantKeys: Array.from(variantKeys),
          }));

          results.push({
            config: cfg,
            found: Object.keys(prices).length > 0,
            prices,
            colors,
          });
        }

        setCollections(results);
        setSelected(new Set(results.filter(r => r.found).map(r => r.config.sheetName)));
        setStep('preview');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка чтения файла');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => { setError('Ошибка чтения файла'); setLoading(false); };
    reader.readAsArrayBuffer(file);
  };

  const handleToggle = (sheetName: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(sheetName)) next.delete(sheetName);
      else next.add(sheetName);
      return next;
    });
  };

  const handleImport = async () => {
    const tmfMfr = catalog.manufacturers.find(m =>
      m.name.toLowerCase() === 'тмф' || m.name.toLowerCase().includes('томск')
    );
    const evseyevVendor = catalog.vendors.find(v => v.name.toLowerCase().includes('евсеев'));
    const today = new Date().toISOString().slice(0, 10);
    let created = 0;
    let updated = 0;

    store.setState(s => {
      const materials = [...s.materials];

      for (const col of collections) {
        if (!selected.has(col.config.sheetName)) continue;
        if (!col.found) continue;

        for (const { colorName, variantKeys } of col.colors) {
          const matId = tmfColorMaterialId(col.config.label, colorName);
          const matName = `${col.config.label} ${colorName}`;

          const variants = variantKeys
            .map(vk => {
              const vDef = col.config.variants.find(v => v.key === vk);
              if (!vDef || col.prices[vk] === undefined) return null;
              return {
                id: tmfColorVariantId(col.config.label, colorName, vk),
                params: vDef.label,
                basePrice: col.prices[vk],
                size: undefined as string | undefined,
                thickness: undefined as number | undefined,
              };
            })
            .filter((v): v is NonNullable<typeof v> => v !== null);

          if (variants.length === 0) continue;

          const thickness = col.config.thickness;
          const existingIdx = materials.findIndex(m => m.id === matId);
          if (existingIdx >= 0) {
            materials[existingIdx] = {
              ...materials[existingIdx],
              vendorId: evseyevVendor?.id,
              typeId: 'mt2',
              thickness,
              variants,
              basePrice: variants[0].basePrice,
              priceUpdatedAt: today,
            };
            updated++;
          } else {
            materials.push({
              id: matId,
              name: matName,
              manufacturerId: tmfMfr?.id,
              vendorId: evseyevVendor?.id,
              typeId: 'mt2',
              thickness,
              unit: 'м²',
              basePrice: variants[0].basePrice,
              variants,
              priceUpdatedAt: today,
            });
            created++;
          }
        }
      }

      return { ...s, materials };
    });

    saveStateToDb();

    await bulkUpsertMaterials(getGlobalState().materials);
    await loadCatalog();

    setResult({ created, updated });
    setStep('done');
  };

  return (
    <Modal title="Импорт фасадов ТМФ" onClose={onClose}>
      <div className="space-y-4">
        {step === 'upload' && (
          <TmfUploadStep
            loading={loading}
            error={error}
            inputRef={inputRef}
            onFile={handleFile}
          />
        )}
        {step === 'preview' && (
          <TmfPreviewStep
            fileName={fileName}
            collections={collections}
            selected={selected}
            sheetNames={sheetNames}
            onToggle={handleToggle}
            onImport={handleImport}
            onClose={onClose}
          />
        )}
        {step === 'done' && (
          <TmfDoneStep result={result} onClose={onClose} />
        )}
      </div>
    </Modal>
  );
}