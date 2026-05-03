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

// Блоки по умолчанию заполняются с бэкенда при создании шаблона

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
    const res = await fetch(`${API}/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        doc_type: selectedDocType,
        name: 'Мой шаблон',
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

  const addBlock = (type: string) => {
    if (!selectedTemplate) return;
    const defaults: Record<string, Partial<Block>> = {
      paragraph:  { label: 'Новый пункт',          content: 'Текст нового пункта...' },
      section:    { label: 'Новый раздел',          content: 'НАЗВАНИЕ РАЗДЕЛА' },
      divider:    { label: 'Разделитель',           content: '' },
      spacer:     { label: 'Отступ',                content: '20' },
      lines:      { label: 'Линии для записей',     content: '6' },
      table:      { label: 'Таблица',               content: 'Колонка 1;Колонка 2;Колонка 3\nЗначение 1;Значение 2;Значение 3' },
    };
    const d = defaults[type] || defaults.paragraph;
    const newBlock: Block = {
      id: `custom_${Date.now()}`,
      type,
      label: d.label || 'Блок',
      content: d.content || '',
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
  if (b.type === 'divider') return `<hr style="border:none;border-top:1px solid #000;margin:8px 0"/>`;
  if (b.type === 'spacer') return `<div style="height:${b.content || 20}px"></div>`;
  if (b.type === 'lines') {
    const count = parseInt(b.content) || 6;
    return Array(count).fill(0).map(() =>
      `<div style="border-bottom:1px solid #000;height:22px;margin-bottom:4px"></div>`
    ).join('');
  }
  if (b.type === 'table') {
    const rows = b.content.split('\n').filter(r => r.trim());
    if (!rows.length) return '';
    const header = rows[0].split(';');
    const body = rows.slice(1);
    return `<table style="width:100%;border-collapse:collapse;margin:6px 0;font-size:${fontSize}pt">
      <tr>${header.map(h => `<th style="border:1px solid #000;padding:3px 5px;background:#f0f0f0;font-weight:bold">${h}</th>`).join('')}</tr>
      ${body.map(r => `<tr>${r.split(';').map(c => `<td style="border:1px solid #000;padding:3px 5px">${c}</td>`).join('')}</tr>`).join('')}
    </table>`;
  }
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
                <div className="flex gap-1 flex-wrap justify-end">
                  {[
                    { type: 'paragraph', label: 'Текст',      icon: 'AlignLeft' },
                    { type: 'section',   label: 'Раздел',     icon: 'Heading' },
                    { type: 'divider',   label: 'Линия',      icon: 'Minus' },
                    { type: 'spacer',    label: 'Отступ',     icon: 'ArrowUpDown' },
                    { type: 'lines',     label: 'Линии',      icon: 'SeparatorHorizontal' },
                    { type: 'table',     label: 'Таблица',    icon: 'Table' },
                  ].map(({ type, label, icon }) => (
                    <button
                      key={type}
                      onClick={() => addBlock(type)}
                      className="flex items-center gap-1 px-2 py-1 border border-border rounded text-[10px] text-[hsl(var(--text-muted))] hover:text-emerald-400 hover:border-emerald-500/40 transition-all"
                      title={`Добавить: ${label}`}
                    >
                      <Icon name={icon as Parameters<typeof Icon>[0]['name']} size={10} />
                      {label}
                    </button>
                  ))}
                </div>
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
                        block.type === 'section'  ? 'border-gold/40 text-gold bg-gold/10' :
                        block.type === 'header'   ? 'border-blue-500/40 text-blue-400 bg-blue-500/10' :
                        block.type === 'divider'  ? 'border-zinc-500/40 text-zinc-400 bg-zinc-500/10' :
                        block.type === 'spacer'   ? 'border-violet-500/40 text-violet-400 bg-violet-500/10' :
                        block.type === 'lines'    ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' :
                        block.type === 'table'    ? 'border-orange-500/40 text-orange-400 bg-orange-500/10' :
                        'border-border text-[hsl(var(--text-muted))]'
                      }`}>
                        {{ section:'раздел', header:'шапка', divider:'линия', spacer:'отступ', lines:'линии', table:'таблица', paragraph:'текст' }[block.type] || block.type}
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
                        <button onClick={() => removeBlock(block.id)} className="text-red-400/30 hover:text-red-400 transition-all">
                          <Icon name="X" size={12} />
                        </button>
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
                        {block.type === 'divider' && (
                          <p className="text-[10px] text-[hsl(var(--text-muted))]">Горизонтальная линия — настройка не требуется.</p>
                        )}
                        {block.type === 'spacer' && (
                          <div>
                            <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1">Высота отступа (px)</label>
                            <input type="number" min={5} max={200} value={block.content || '20'}
                              onChange={e => updateBlock(block.id, 'content', e.target.value)}
                              className="w-24 bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1 text-xs text-foreground"
                            />
                          </div>
                        )}
                        {block.type === 'lines' && (
                          <div>
                            <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1">Количество линий</label>
                            <input type="number" min={1} max={20} value={block.content || '6'}
                              onChange={e => updateBlock(block.id, 'content', e.target.value)}
                              className="w-24 bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1 text-xs text-foreground"
                            />
                          </div>
                        )}
                        {block.type === 'table' && (
                          <div>
                            <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1">
                              Строки таблицы — первая строка заголовок, столбцы разделяй «;»
                            </label>
                            <textarea
                              value={block.content}
                              onChange={e => updateBlock(block.id, 'content', e.target.value)}
                              rows={5}
                              placeholder={'Колонка 1;Колонка 2;Колонка 3\nДанные 1;Данные 2;Данные 3'}
                              className="w-full bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1 text-xs text-foreground font-mono resize-none"
                            />
                          </div>
                        )}
                        {(block.type === 'paragraph' || block.type === 'section' || block.type === 'header') && (
                          <div>
                            <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1">Содержимое</label>
                            <textarea
                              value={block.content}
                              onChange={e => updateBlock(block.id, 'content', e.target.value)}
                              rows={3}
                              className="w-full bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1 text-xs text-foreground resize-none"
                            />
                          </div>
                        )}
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