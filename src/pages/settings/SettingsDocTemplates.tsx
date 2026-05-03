import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { API_URLS } from '@/config/api';

const API = API_URLS.docTemplates;

function getToken() {
  return localStorage.getItem('kuhni_pro_token') || '';
}
function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

const DOC_TYPES = [
  { id: 'contract',      label: 'Договор бытового подряда' },
  { id: 'tech',          label: 'Технический проект' },
  { id: 'rules',         label: 'Правила эксплуатации' },
  { id: 'act',           label: 'Акт выполненных работ' },
  { id: 'delivery',      label: 'Договор доставки' },
  { id: 'delivery_calc', label: 'Калькуляция доставки' },
  { id: 'delivery_lift', label: 'Прайс доп. услуг доставки' },
  { id: 'act_delivery',  label: 'Акт приёма доставки' },
  { id: 'assembly',      label: 'Договор сборки' },
  { id: 'assembly_calc', label: 'Калькуляция сборки' },
  { id: 'assembly_extra',label: 'Прайс доп. услуг сборки' },
  { id: 'act_assembly',  label: 'Акт выполненных работ сборки' },
];

// Стандартные блоки документов — заголовки разделов которые можно редактировать
const DEFAULT_BLOCKS: Record<string, { id: string; type: string; label: string; content: string; enabled: boolean }[]> = {
  contract: [
    { id: 'header', type: 'header', label: 'Шапка документа', content: 'Приложение к договору бытового подряда на изготовление мебели № {{номер_договора}} от {{дата_договора}}', enabled: true },
    { id: 's1', type: 'section', label: 'Раздел 1. ПРЕДМЕТ ДОГОВОРА', content: '1. ПРЕДМЕТ ДОГОВОРА', enabled: true },
    { id: 's2', type: 'section', label: 'Раздел 2. РАЗРАБОТКА ТП', content: '2. РАЗРАБОТКА И СОГЛАСОВАНИЕ ТЕХНИЧЕСКОГО ПРОЕКТА', enabled: true },
    { id: 's3', type: 'section', label: 'Раздел 3. СТОИМОСТЬ', content: '3. СТОИМОСТЬ РАБОТ И ПОРЯДОК РАСЧЁТОВ', enabled: true },
    { id: 's4', type: 'section', label: 'Раздел 4. ПРАВА И ОБЯЗАННОСТИ', content: '4. ПРАВА И ОБЯЗАННОСТИ СТОРОН', enabled: true },
    { id: 's5', type: 'section', label: 'Раздел 5. ГАРАНТИЯ', content: '5. ГАРАНТИЯ И КАЧЕСТВО ВЫПОЛНЕННЫХ РАБОТ', enabled: true },
    { id: 's6', type: 'section', label: 'Раздел 6. ПРИЁМКА', content: '6. ПОРЯДОК ПРИЁМКИ ВЫПОЛНЕННЫХ РАБОТ', enabled: true },
    { id: 's7', type: 'section', label: 'Раздел 7. ОТВЕТСТВЕННОСТЬ', content: '7. ОТВЕТСТВЕННОСТЬ СТОРОН', enabled: true },
    { id: 's8', type: 'section', label: 'Раздел 8. СПОРЫ', content: '8. ПОРЯДОК РАЗРЕШЕНИЯ СПОРОВ', enabled: true },
    { id: 's9', type: 'section', label: 'Раздел 9. СРОК ДЕЙСТВИЯ', content: '9. СРОК ДЕЙСТВИЯ ДОГОВОРА', enabled: true },
    { id: 's10', type: 'section', label: 'Раздел 10. ЗАКЛЮЧЕНИЕ', content: '10. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ', enabled: true },
    { id: 's11', type: 'section', label: 'Раздел 11. РЕКВИЗИТЫ', content: '11. РЕКВИЗИТЫ СТОРОН', enabled: true },
  ],
  act: [
    { id: 'header', type: 'header', label: 'Шапка', content: 'Приложение № 4 к договору бытового подряда на изготовление мебели № {{номер_договора}} от {{дата_договора}}', enabled: true },
    { id: 'p1', type: 'paragraph', label: 'Пункт 1 — перечень мебели', content: '1. Подрядчик изготовил для Заказчика мебель по договору бытового подряда № {{номер_договора}} от {{дата_договора}}:', enabled: true },
    { id: 'p2', type: 'paragraph', label: 'Пункт 2 — комплектность', content: '2. Комплектность, количество, вид, характеристики мебели соответствуют условиям договора. Заказчик претензий не имеет.', enabled: true },
    { id: 'p3', type: 'paragraph', label: 'Пункт 3 — замечания', content: '3. В случае наличия замечаний Заказчик вправе требовать устранения замечаний, отражённых в данном акте.', enabled: true },
    { id: 'p4', type: 'paragraph', label: 'Пункт 4 — экземпляры', content: '4. Настоящий акт подписан в 2 (двух) экземплярах по одному для каждой из Сторон.', enabled: true },
  ],
};

interface Block {
  id: string;
  type: string;
  label: string;
  content: string;
  enabled: boolean;
}

interface Template {
  id: string;
  doc_type: string;
  name: string;
  is_default: boolean;
  blocks: Block[];
  settings: Record<string, string | number | boolean>;
}

const VARS = ['{{имя_клиента}}', '{{номер_договора}}', '{{дата_договора}}', '{{сумма}}', '{{сумма_прописью}}', '{{менеджер}}', '{{компания}}'];

export default function SettingsDocTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedDocType, setSelectedDocType] = useState('contract');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/?doc_type=${selectedDocType}`, { headers: authHeaders() });
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        const def = data.find((t: Template) => t.is_default) || data[0];
        setSelectedTemplate(def);
      } else {
        setSelectedTemplate(null);
      }
    } catch {
      toast.error('Ошибка загрузки шаблонов');
    } finally {
      setLoading(false);
    }
  }, [selectedDocType]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const createTemplate = async () => {
    const defaultBlocks = DEFAULT_BLOCKS[selectedDocType] || [];
    const res = await fetch(`${API}/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        doc_type: selectedDocType,
        name: 'Мой шаблон',
        blocks: defaultBlocks,
        settings: { fontSize: 9.5, lineHeight: 1.0, marginMm: 10 },
        is_default: templates.length === 0,
      }),
    });
    const data = await res.json();
    if (data.id) {
      toast.success('Шаблон создан');
      loadTemplates();
    }
  };

  const saveTemplate = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      await fetch(`${API}/?id=${selectedTemplate.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          name: selectedTemplate.name,
          blocks: selectedTemplate.blocks,
          settings: selectedTemplate.settings,
        }),
      });
      toast.success('Сохранено');
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Удалить шаблон?')) return;
    await fetch(`${API}/?id=${id}`, { method: 'DELETE', headers: authHeaders() });
    toast.success('Удалён');
    loadTemplates();
  };

  const setDefault = async (id: string) => {
    await fetch(`${API}/?id=${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ is_default: true }),
    });
    toast.success('Установлен по умолчанию');
    loadTemplates();
  };

  const updateBlock = (blockId: string, field: keyof Block, value: string | boolean) => {
    if (!selectedTemplate) return;
    setSelectedTemplate({
      ...selectedTemplate,
      blocks: selectedTemplate.blocks.map(b => b.id === blockId ? { ...b, [field]: value } : b),
    });
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    if (!selectedTemplate) return;
    const blocks = [...selectedTemplate.blocks];
    const target = idx + dir;
    if (target < 0 || target >= blocks.length) return;
    [blocks[idx], blocks[target]] = [blocks[target], blocks[idx]];
    setSelectedTemplate({ ...selectedTemplate, blocks });
  };

  const addCustomBlock = () => {
    if (!selectedTemplate) return;
    const newBlock: Block = {
      id: `custom_${Date.now()}`,
      type: 'paragraph',
      label: 'Новый пункт',
      content: 'Текст нового пункта...',
      enabled: true,
    };
    setSelectedTemplate({ ...selectedTemplate, blocks: [...selectedTemplate.blocks, newBlock] });
    setEditingBlock(newBlock.id);
  };

  const removeBlock = (blockId: string) => {
    if (!selectedTemplate) return;
    setSelectedTemplate({ ...selectedTemplate, blocks: selectedTemplate.blocks.filter(b => b.id !== blockId) });
  };

  const buildPreview = () => {
    if (!selectedTemplate) return;
    const blocks = selectedTemplate.blocks.filter(b => b.enabled);
    const s = selectedTemplate.settings as Record<string, number>;
    const fontSize = s.fontSize || 9.5;
    const lineHeight = s.lineHeight || 1.0;
    const margin = s.marginMm || 10;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:'Times New Roman',serif;font-size:${fontSize}pt;line-height:${lineHeight};margin:0;padding:0}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:${margin}mm;background:#fff}
  h1{text-align:center;font-size:${fontSize + 1}pt}
  .sec{font-weight:bold;text-align:center;margin:8px 0 3px}
  p{margin:0 0 2px;text-align:justify}
</style></head><body><div class="page">
${blocks.map(b => {
  const text = b.content
    .replace(/\{\{имя_клиента\}\}/g, 'Иванов Иван Иванович')
    .replace(/\{\{номер_договора\}\}/g, '877')
    .replace(/\{\{дата_договора\}\}/g, '02 мая 2026 г.')
    .replace(/\{\{сумма\}\}/g, '350 000')
    .replace(/\{\{сумма_прописью\}\}/g, 'триста пятьдесят тысяч')
    .replace(/\{\{менеджер\}\}/g, 'Сазонов Василий Николаевич')
    .replace(/\{\{компания\}\}/g, 'ООО «Интерьерные Решения»');
  if (b.type === 'header') return `<p style="text-align:center;font-size:8.5pt">${text}</p>`;
  if (b.type === 'section') return `<p class="sec">${text}</p>`;
  return `<p>${text}</p>`;
}).join('\n')}
</div></body></html>`;
    setPreviewHtml(html);
    setShowPreview(true);
  };

  const docLabel = DOC_TYPES.find(d => d.id === selectedDocType)?.label || selectedDocType;

  return (
    <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="FileEdit" size={15} className="text-emerald-400" />
          <span className="text-sm font-medium text-foreground">Конструктор документов</span>
        </div>
        <span className="text-xs text-[hsl(var(--text-muted))]">Настройте шаблоны для PDF и Просмотра</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Выбор типа документа */}
        <div>
          <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Тип документа</label>
          <select
            value={selectedDocType}
            onChange={e => setSelectedDocType(e.target.value)}
            className="w-full bg-[hsl(220,14%,14%)] border border-border rounded px-3 py-2 text-sm text-foreground"
          >
            {DOC_TYPES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>

        {/* Список шаблонов */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-[hsl(var(--text-muted))]">Шаблоны для «{docLabel}»</label>
            <button
              onClick={createTemplate}
              className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-xs hover:bg-emerald-500/20 transition-all"
            >
              <Icon name="Plus" size={11} /> Создать
            </button>
          </div>

          {loading ? (
            <div className="text-xs text-[hsl(var(--text-muted))] py-4 text-center">Загрузка...</div>
          ) : templates.length === 0 ? (
            <div className="text-xs text-[hsl(var(--text-muted))] py-6 text-center border border-dashed border-border rounded-lg">
              Нет шаблонов — нажмите «Создать» чтобы начать
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {templates.map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded border cursor-pointer text-xs transition-all ${
                    selectedTemplate?.id === t.id
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                      : 'border-border text-[hsl(var(--text-dim))] hover:border-border/80'
                  }`}
                >
                  {t.is_default && <Icon name="Star" size={10} className="text-gold" />}
                  {t.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Редактор выбранного шаблона */}
        {selectedTemplate && (
          <div className="space-y-3 border border-border rounded-lg p-4">
            {/* Название и действия */}
            <div className="flex items-center gap-2">
              <input
                value={selectedTemplate.name}
                onChange={e => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                className="flex-1 bg-[hsl(220,14%,14%)] border border-border rounded px-3 py-1.5 text-sm text-foreground"
                placeholder="Название шаблона"
              />
              {!selectedTemplate.is_default && (
                <button
                  onClick={() => setDefault(selectedTemplate.id)}
                  className="px-2 py-1.5 border border-border rounded text-xs text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold/40 transition-all"
                  title="Сделать по умолчанию"
                >
                  <Icon name="Star" size={12} />
                </button>
              )}
              <button onClick={buildPreview} className="px-2 py-1.5 border border-border rounded text-xs text-[hsl(var(--text-muted))] hover:text-emerald-400 transition-all" title="Предпросмотр">
                <Icon name="Eye" size={12} />
              </button>
              <button
                onClick={saveTemplate}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded text-xs hover:bg-emerald-500/30 transition-all disabled:opacity-60"
              >
                {saving ? <Icon name="Loader2" size={11} className="animate-spin" /> : <Icon name="Save" size={11} />}
                Сохранить
              </button>
              <button onClick={() => deleteTemplate(selectedTemplate.id)} className="px-2 py-1.5 border border-border rounded text-xs text-red-400/60 hover:text-red-400 transition-all">
                <Icon name="Trash2" size={12} />
              </button>
            </div>

            {/* Настройки отображения */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'fontSize', label: 'Шрифт (pt)', min: 7, max: 14, step: 0.5 },
                { key: 'lineHeight', label: 'Межстрочный', min: 0.8, max: 2, step: 0.05 },
                { key: 'marginMm', label: 'Поля (мм)', min: 5, max: 30, step: 1 },
              ].map(({ key, label, min, max, step }) => (
                <div key={key}>
                  <label className="text-xs text-[hsl(var(--text-muted))] block mb-1">{label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={min} max={max} step={step}
                      value={Number((selectedTemplate.settings as Record<string, number>)[key]) || min}
                      onChange={e => setSelectedTemplate({ ...selectedTemplate, settings: { ...selectedTemplate.settings, [key]: parseFloat(e.target.value) } })}
                      className="flex-1"
                    />
                    <span className="text-xs text-foreground w-8 text-right">
                      {Number((selectedTemplate.settings as Record<string, number>)[key]) || min}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Переменные */}
            <div>
              <p className="text-xs text-[hsl(var(--text-muted))] mb-1">Доступные переменные (кликни чтобы скопировать):</p>
              <div className="flex flex-wrap gap-1">
                {VARS.map(v => (
                  <button
                    key={v}
                    onClick={() => { navigator.clipboard.writeText(v); toast.success('Скопировано'); }}
                    className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-[10px] hover:bg-blue-500/20 transition-all"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Блоки документа */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-foreground">Блоки документа</p>
                <button
                  onClick={addCustomBlock}
                  className="flex items-center gap-1 px-2 py-1 border border-border rounded text-xs text-[hsl(var(--text-muted))] hover:text-emerald-400 transition-all"
                >
                  <Icon name="Plus" size={10} /> Добавить блок
                </button>
              </div>

              <div className="space-y-1">
                {selectedTemplate.blocks.map((block, idx) => (
                  <div key={block.id} className={`border rounded-lg transition-all ${block.enabled ? 'border-border' : 'border-border/40 opacity-50'}`}>
                    <div className="flex items-center gap-2 px-3 py-2">
                      {/* Включить/выключить */}
                      <button
                        onClick={() => updateBlock(block.id, 'enabled', !block.enabled)}
                        className={`shrink-0 ${block.enabled ? 'text-emerald-400' : 'text-[hsl(var(--text-muted))]'}`}
                      >
                        <Icon name={block.enabled ? 'Eye' : 'EyeOff'} size={13} />
                      </button>

                      {/* Тип */}
                      <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border ${
                        block.type === 'section' ? 'border-gold/40 text-gold bg-gold/10' :
                        block.type === 'header' ? 'border-blue-500/40 text-blue-400 bg-blue-500/10' :
                        'border-border text-[hsl(var(--text-muted))]'
                      }`}>
                        {block.type === 'section' ? 'раздел' : block.type === 'header' ? 'шапка' : 'текст'}
                      </span>

                      {/* Название блока */}
                      <span className="flex-1 text-xs text-foreground truncate">{block.label}</span>

                      {/* Действия */}
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0} className="text-[hsl(var(--text-muted))] hover:text-foreground disabled:opacity-30">
                          <Icon name="ChevronUp" size={12} />
                        </button>
                        <button onClick={() => moveBlock(idx, 1)} disabled={idx === selectedTemplate.blocks.length - 1} className="text-[hsl(var(--text-muted))] hover:text-foreground disabled:opacity-30">
                          <Icon name="ChevronDown" size={12} />
                        </button>
                        <button
                          onClick={() => setEditingBlock(editingBlock === block.id ? null : block.id)}
                          className={`text-[hsl(var(--text-muted))] hover:text-foreground ${editingBlock === block.id ? 'text-emerald-400' : ''}`}
                        >
                          <Icon name="Pencil" size={12} />
                        </button>
                        {block.id.startsWith('custom_') && (
                          <button onClick={() => removeBlock(block.id)} className="text-red-400/50 hover:text-red-400">
                            <Icon name="X" size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Редактор содержимого блока */}
                    {editingBlock === block.id && (
                      <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                        <div>
                          <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1">Название блока</label>
                          <input
                            value={block.label}
                            onChange={e => updateBlock(block.id, 'label', e.target.value)}
                            className="w-full bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1 text-xs text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1">Содержимое</label>
                          <textarea
                            value={block.content}
                            onChange={e => updateBlock(block.id, 'content', e.target.value)}
                            rows={3}
                            className="w-full bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1 text-xs text-foreground resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Предпросмотр */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-[90vw] h-[90vh] flex flex-col bg-[hsl(220,14%,11%)] border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-medium">Предпросмотр шаблона</span>
              <button onClick={() => setShowPreview(false)} className="text-[hsl(var(--text-muted))] hover:text-foreground">
                <Icon name="X" size={16} />
              </button>
            </div>
            <iframe
              srcDoc={previewHtml}
              className="flex-1 w-full bg-[hsl(220,12%,18%)]"
              title="Предпросмотр"
            />
          </div>
        </div>
      )}
    </div>
  );
}
