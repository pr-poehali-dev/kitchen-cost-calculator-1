import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [showPreview, setShowPreview] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pendingSwitchRef = useRef<Template | null>(null);

  const loadTemplates = useCallback(async (keepSelectedId?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/?doc_type=${selectedDocType}`, { headers: authHeaders() });
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        const keep = keepSelectedId ? data.find((t: Template) => t.id === keepSelectedId) : null;
        const def = keep || data.find((t: Template) => t.is_default) || data[0];
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

  const saveTemplate = async (tpl?: Template) => {
    const target = tpl ?? selectedTemplate;
    if (!target) return;
    setSaving(true);
    try {
      await fetch(`${API}/?id=${target.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          name: target.name,
          blocks: target.blocks,
          settings: target.settings,
        }),
      });
      setIsDirty(false);
      if (!tpl) toast.success('Сохранено');
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const switchTemplate = async (t: Template) => {
    if (selectedTemplate && selectedTemplate.id === t.id) return;
    if (isDirty && selectedTemplate) {
      const confirmed = window.confirm('Есть несохранённые изменения. Сохранить перед переключением?');
      if (confirmed) {
        await saveTemplate(selectedTemplate);
      }
    }
    // Берём актуальную версию шаблона из синхронизированного массива
    const fresh = templates.find(tpl => tpl.id === t.id) ?? t;
    setSelectedTemplate(fresh);
    setEditingBlock(null);
    setIsDirty(false);
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Удалить шаблон?')) return;
    await fetch(`${API}/?id=${id}`, { method: 'DELETE', headers: authHeaders() });
    toast.success('Удалён');
    await loadTemplates();
  };

  const setDefault = async (id: string) => {
    await fetch(`${API}/?id=${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ is_default: true }),
    });
    toast.success('Шаблон применён — теперь он активный для этого типа документа');
    await loadTemplates(id);
  };

  const duplicateTemplate = async () => {
    if (!selectedTemplate) return;
    const res = await fetch(`${API}/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        doc_type: selectedDocType,
        name: `${selectedTemplate.name} (копия)`,
        blocks: selectedTemplate.blocks,
        settings: selectedTemplate.settings,
        is_default: false,
      }),
    });
    const data = await res.json();
    if (data.id) {
      toast.success('Шаблон скопирован');
      loadTemplates();
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;
    const docLabel = DOC_TYPES.find(d => d.id === selectedDocType)?.label || selectedDocType;
    const confirmed = window.confirm(
      `Применить шаблон «${selectedTemplate.name}» ко всем документам типа «${docLabel}»?\n\nВсе существующие договоры этого типа будут формироваться по новому шаблону. Это действие нельзя отменить автоматически.`
    );
    if (!confirmed) return;
    if (isDirty) await saveTemplate();
    await setDefault(selectedTemplate.id);
  };

  const handleUpdateTemplate = (t: Template) => {
    setSelectedTemplate(t);
    setTemplates(prev => prev.map(tpl => tpl.id === t.id ? t : tpl));
    setIsDirty(true);
    if (iframeRef.current && showPreview) {
      iframeRef.current.srcdoc = buildPreviewHtml(t);
    }
  };

  const handlePreview = () => {
    setShowPreview(p => !p);
  };

  const docLabel = DOC_TYPES.find(d => d.id === selectedDocType)?.label || selectedDocType;

  const previewHtml = selectedTemplate ? buildPreviewHtml(selectedTemplate) : '';

  return (
    <div className="flex flex-col h-full bg-[hsl(220,14%,11%)] border border-border rounded-lg overflow-hidden">
      {/* Шапка */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Icon name="FileEdit" size={15} className="text-emerald-400" />
            <span className="text-sm font-medium text-foreground">Конструктор документов</span>
          </div>
          {/* Тип документа */}
          <select
            value={selectedDocType}
            onChange={e => setSelectedDocType(e.target.value)}
            className="bg-[hsl(220,14%,14%)] border border-border rounded px-2 py-1 text-xs text-foreground"
          >
            {DOC_TYPES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
          {/* Список шаблонов */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {loading ? (
              <span className="text-xs text-[hsl(var(--text-muted))]">Загрузка...</span>
            ) : (
              <>
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => switchTemplate(t)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-all ${
                      selectedTemplate?.id === t.id
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                        : 'border-border text-[hsl(var(--text-muted))] hover:border-border/80 hover:text-foreground'
                    }`}
                  >
                    {t.is_default && <Icon name="Star" size={9} className="text-gold" />}
                    {t.name}
                  </button>
                ))}
                <button
                  onClick={createTemplate}
                  className="flex items-center gap-1 px-2 py-1 border border-dashed border-border text-[hsl(var(--text-muted))] rounded text-xs hover:text-emerald-400 hover:border-emerald-500/40 transition-all"
                >
                  <Icon name="Plus" size={10} /> Новый
                </button>
              </>
            )}
          </div>
        </div>
        {/* Кнопка показа preview */}
        <button
          onClick={handlePreview}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs transition-all ${
            showPreview
              ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400'
              : 'border-border text-[hsl(var(--text-muted))] hover:text-emerald-400'
          }`}
        >
          <Icon name="PanelRight" size={12} />
          {showPreview ? 'Скрыть превью' : 'Показать превью'}
        </button>
      </div>

      {/* Split layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Левая панель — редактор */}
        <div className={`overflow-y-auto transition-all ${showPreview ? 'w-1/2' : 'w-full'}`}>
          {selectedTemplate ? (
            <div className="p-4">
              <DocTemplateEditor
                template={selectedTemplate}
                saving={saving}
                isDirty={isDirty}
                editingBlock={editingBlock}
                onUpdate={handleUpdateTemplate}
                onSave={saveTemplate}
                onApply={handleApplyTemplate}
                onDelete={() => deleteTemplate(selectedTemplate.id)}
                onSetDefault={() => setDefault(selectedTemplate.id)}
                onPreview={handlePreview}
                onDuplicate={duplicateTemplate}
                onEditBlock={setEditingBlock}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-[hsl(var(--text-muted))]">
              {templates.length === 0
                ? 'Нажмите «Новый» чтобы создать первый шаблон'
                : 'Выберите шаблон слева'}
            </div>
          )}
        </div>

        {/* Правая панель — live preview */}
        {showPreview && (
          <div className="w-1/2 border-l border-border flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center gap-2 shrink-0">
              <Icon name="Eye" size={12} className="text-[hsl(var(--text-muted))]" />
              <span className="text-xs text-[hsl(var(--text-muted))]">Предпросмотр — обновляется в реальном времени</span>
            </div>
            {selectedTemplate ? (
              <iframe
                ref={iframeRef}
                srcDoc={previewHtml}
                className="flex-1 w-full"
                style={{ background: '#e8e8e8' }}
                title="Предпросмотр"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-[hsl(var(--text-muted))]">
                Выберите шаблон для предпросмотра
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}