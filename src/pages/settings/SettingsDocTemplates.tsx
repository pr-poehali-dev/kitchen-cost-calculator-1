import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import DocTemplateEditor from './DocTemplateEditor';
import { API, authHeaders, DOC_TYPES, buildPreviewHtml, type Template, type Block } from './docTemplateTypes';

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

  const handleUpdateTemplate = (t: Template) => setSelectedTemplate(t);

  const handlePreview = () => {
    if (!selectedTemplate) return;
    setPreviewHtml(buildPreviewHtml(selectedTemplate));
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
          <DocTemplateEditor
            template={selectedTemplate}
            saving={saving}
            editingBlock={editingBlock}
            onUpdate={handleUpdateTemplate}
            onSave={saveTemplate}
            onDelete={() => deleteTemplate(selectedTemplate.id)}
            onSetDefault={() => setDefault(selectedTemplate.id)}
            onPreview={handlePreview}
            onEditBlock={setEditingBlock}
          />
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
