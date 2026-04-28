import Icon from '@/components/ui/icon';
import type { ParsedCollection } from './tmfParser';

// ─── Шаг 1: загрузка файла ────────────────────────────────────────────────────

interface UploadStepProps {
  loading: boolean;
  error: string;
  inputRef: React.RefObject<HTMLInputElement>;
  onFile: (file: File) => void;
}

export function TmfUploadStep({ loading, error, inputRef, onFile }: UploadStepProps) {
  return (
    <>
      <p className="text-xs text-[hsl(var(--text-muted))]">
        Каждый цвет будет создан как отдельный материал. Варианты = доступные покрытия для этого цвета.
      </p>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); }}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-border hover:border-gold rounded-xl px-6 py-10 text-center cursor-pointer transition-colors group"
      >
        <Icon name="FileSpreadsheet" size={36} className="text-[hsl(var(--text-muted))] group-hover:text-gold mx-auto mb-3 transition-colors" />
        <p className="text-sm font-medium text-foreground">Перетащи файл или нажми для выбора</p>
        <p className="text-xs text-[hsl(var(--text-muted))] mt-1">.xlsx — прайс-лист ТМФ</p>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
          onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
      </div>
      {loading && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-[hsl(var(--text-muted))]">
          <Icon name="Loader2" size={15} className="animate-spin text-gold" /> Читаю файл...
        </div>
      )}
      {error && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">{error}</div>
      )}
    </>
  );
}

// ─── Шаг 2: превью коллекций ──────────────────────────────────────────────────

interface PreviewStepProps {
  fileName: string;
  collections: ParsedCollection[];
  selected: Set<string>;
  sheetNames: string[];
  onToggle: (sheetName: string) => void;
  onImport: () => void;
  onClose: () => void;
}

export function TmfPreviewStep({ fileName, collections, selected, sheetNames, onToggle, onImport, onClose }: PreviewStepProps) {
  const totalColors = collections
    .filter(c => selected.has(c.config.sheetName))
    .reduce((sum, c) => sum + c.colors.length, 0);

  return (
    <>
      <div className="text-xs text-[hsl(var(--text-muted))] flex items-center gap-2">
        <Icon name="FileSpreadsheet" size={12} className="text-gold" /> {fileName}
      </div>

      <div className="space-y-2 max-h-80 overflow-auto scrollbar-thin">
        {collections.map(col => {
          const isSel = selected.has(col.config.sheetName);
          return (
            <div
              key={col.config.sheetName}
              onClick={() => col.found && onToggle(col.config.sheetName)}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                !col.found
                  ? 'opacity-40 border-border bg-[hsl(220,12%,13%)] cursor-not-allowed'
                  : isSel
                    ? 'border-gold/50 bg-gold/5 cursor-pointer'
                    : 'border-border bg-[hsl(220,12%,14%)] hover:border-gold/30 cursor-pointer'
              }`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${isSel && col.found ? 'bg-gold border-gold' : 'border-border'}`}>
                {isSel && col.found && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{col.config.label}</div>
                {col.found ? (
                  <>
                    <div className="text-[10px] text-[hsl(var(--text-muted))] mt-0.5 flex gap-3 flex-wrap">
                      <span className="text-gold font-medium">{col.colors.length} цветов</span>
                      {col.config.variants
                        .filter(v => col.prices[v.key] !== undefined)
                        .map(v => (
                          <span key={v.key}>{v.label}: <span className="text-foreground font-mono">{col.prices[v.key].toLocaleString('ru-RU')} ₽</span></span>
                        ))}
                    </div>
                    <div className="text-[10px] text-[hsl(var(--text-muted))] mt-1">
                      {col.colors.slice(0, 4).map(c => c.colorName).join(', ')}
                      {col.colors.length > 4 && ` и ещё ${col.colors.length - 4}...`}
                    </div>
                  </>
                ) : (
                  <div className="text-[10px] text-[hsl(var(--text-muted))]">лист не найден в файле</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Показываем реальные листы файла если есть не найденные */}
      {collections.some(c => !c.found) && sheetNames.length > 0 && (
        <div className="text-xs bg-amber-400/10 border border-amber-400/20 rounded px-3 py-2 space-y-1">
          <div className="text-amber-400 font-medium flex items-center gap-1.5">
            <Icon name="AlertTriangle" size={12} /> Листы в файле:
          </div>
          <div className="text-[hsl(var(--text-muted))] font-mono break-all">
            {sheetNames.join(' · ')}
          </div>
        </div>
      )}

      <div className="text-xs text-[hsl(var(--text-muted))] bg-[hsl(220,12%,14%)] rounded border border-border px-3 py-2">
        Будет создано: <span className="text-foreground font-medium">{totalColors}</span> материалов
        · Поставщик: <span className="text-foreground">Евсеев</span>
        · Тип: <span className="text-foreground">МДФ</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onImport}
          disabled={selected.size === 0}
          className="flex-1 py-2.5 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Icon name="Database" size={14} />
          Импортировать
        </button>
        <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
          Отмена
        </button>
      </div>
    </>
  );
}

// ─── Шаг 3: готово ────────────────────────────────────────────────────────────

interface DoneStepProps {
  result: { created: number; updated: number };
  onClose: () => void;
}

export function TmfDoneStep({ result, onClose }: DoneStepProps) {
  return (
    <div className="text-center py-4 space-y-3">
      <Icon name="CheckCircle" size={36} className="text-green-400 mx-auto" />
      <div className="text-sm font-medium text-foreground">Готово!</div>
      <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
        {result.created > 0 && (
          <div className="bg-green-400/10 border border-green-400/20 rounded p-2 text-center">
            <div className="text-xl font-bold text-green-400">{result.created}</div>
            <div className="text-[10px] text-[hsl(var(--text-muted))]">создано</div>
          </div>
        )}
        {result.updated > 0 && (
          <div className="bg-gold/10 border border-gold/20 rounded p-2 text-center">
            <div className="text-xl font-bold text-gold">{result.updated}</div>
            <div className="text-[10px] text-[hsl(var(--text-muted))]">обновлено</div>
          </div>
        )}
      </div>
      <button onClick={onClose} className="px-6 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90">
        Закрыть
      </button>
    </div>
  );
}