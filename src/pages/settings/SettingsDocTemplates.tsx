import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import DocTemplateEditor from './DocTemplateEditor';
import { API, authHeaders, DOC_TYPES, buildPreviewHtml, type Template, type Block } from './docTemplateTypes';
import { API_URLS } from '@/config/api';

export default function SettingsDocTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  // savedTemplates — версии с сервера, не меняются при редактировании
  const savedTemplatesRef = useRef<Template[]>([]);
  const [selectedDocType, setSelectedDocType] = useState('contract');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<Template | null>(null);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTemplates = useCallback(async (keepSelectedId?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/?doc_type=${selectedDocType}`, { headers: authHeaders() });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setTemplates(list);
      savedTemplatesRef.current = list; // сохраняем оригиналы с сервера
      if (list.length > 0) {
        const keep = keepSelectedId ? list.find((t: Template) => t.id === keepSelectedId) : null;
        const def = keep || list.find((t: Template) => t.is_default) || list[0];
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
      // Обновляем серверную копию после успешного сохранения
      savedTemplatesRef.current = savedTemplatesRef.current.map(t =>
        t.id === target.id ? { ...t, name: target.name, blocks: target.blocks, settings: target.settings } : t
      );
      setIsDirty(false);
      if (!tpl) toast.success('Сохранено');
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const doSwitch = (t: Template) => {
    // Берём версию с сервера (savedTemplatesRef), а не изменённую локально
    const fresh = savedTemplatesRef.current.find(tpl => tpl.id === t.id) ?? t;
    setSelectedTemplate(fresh);
    // Восстанавливаем templates обратно к серверной версии (откат несохранённых изменений)
    setTemplates(savedTemplatesRef.current);
    setEditingBlock(null);
    setIsDirty(false);
    setPendingSwitch(null);
  };

  const switchTemplate = (t: Template) => {
    if (selectedTemplate && selectedTemplate.id === t.id) return;
    if (isDirty && selectedTemplate) {
      setPendingSwitch(t);
      return;
    }
    doSwitch(t);
  };

  const confirmSwitch = async (save: boolean) => {
    if (!pendingSwitch) return;
    if (save) await saveTemplate(selectedTemplate ?? undefined);
    doSwitch(pendingSwitch);
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

  const updatePreview = useCallback((t: Template) => {
    if (!iframeRef.current || !showPreview) return;
    // Сохраняем позицию скролла
    const iframe = iframeRef.current;
    const scrollY = iframe.contentWindow?.scrollY ?? 0;
    const html = buildPreviewHtml(t);

    // Если iframe ещё не загружен — используем srcdoc (первая загрузка)
    if (!iframe.contentDocument?.body) {
      iframe.srcdoc = html;
      return;
    }

    // Обновляем содержимое без пересоздания iframe
    try {
      iframe.contentDocument.open();
      iframe.contentDocument.write(html);
      iframe.contentDocument.close();
      // Восстанавливаем позицию скролла после перерисовки
      requestAnimationFrame(() => {
        iframe.contentWindow?.scrollTo(0, scrollY);
      });
    } catch {
      iframe.srcdoc = html;
    }
  }, [showPreview]);

  const handleUpdateTemplate = (t: Template) => {
    setSelectedTemplate(t);
    setTemplates(prev => prev.map(tpl => tpl.id === t.id ? t : tpl));
    setIsDirty(true);
    // Дебаунс 400мс — не перерисовываем при каждом символе
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    previewDebounceRef.current = setTimeout(() => updatePreview(t), 400);
  };

  const handlePreview = () => {
    setShowPreview(p => !p);
  };

  const handleDownloadDocx = async () => {
    if (!selectedTemplate) return;
    if (isDirty) {
      await saveTemplate();
    }
    setDownloadingDocx(true);
    try {
      // Используем первого доступного клиента как тестовый, либо пустой объект
      const url = `${API_URLS.docBuilder}/?action=doc_docx&client_id=preview&doc=${selectedTemplate.doc_type}`;
      const res = await fetch(url, { headers: authHeaders() });
      const data = await res.json();
      if (data.data) {
        const binary = atob(data.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${selectedTemplate.name} — пример.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        toast.success('Пример DOCX скачан');
      } else {
        toast.error('Ошибка генерации файла');
      }
    } catch {
      toast.error('Ошибка скачивания');
    } finally {
      setDownloadingDocx(false);
    }
  };

  const docLabel = DOC_TYPES.find(d => d.id === selectedDocType)?.label || selectedDocType;

  // Начальный HTML для iframe — только при смене шаблона/типа документа, не при каждом символе
  const initialPreviewHtml = useMemo(
    () => selectedTemplate ? buildPreviewHtml(selectedTemplate) : '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedTemplate?.id, selectedDocType]
  );

  return (
    <div className="flex flex-col h-full bg-[hsl(220,14%,11%)] border border-border rounded-lg overflow-hidden">

      {/* ── Тулбар ── */}
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between shrink-0 bg-[hsl(220,14%,10%)]">
        <div className="flex items-center gap-3">
          {/* Логотип + заголовок */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-emerald-500/15 border border-emerald-500/25">
              <Icon name="FileText" size={13} className="text-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-foreground tracking-tight">Конструктор PDF</span>
          </div>

          {/* Разделитель */}
          <span className="text-border text-base font-light select-none">|</span>

          {/* Выпадающий список типа документа */}
          <div className="relative">
            <select
              value={selectedDocType}
              onChange={e => setSelectedDocType(e.target.value)}
              className="appearance-none bg-[hsl(220,14%,13%)] border border-border hover:border-border/70 rounded-md pl-3 pr-7 py-1.5 text-xs text-foreground cursor-pointer focus:outline-none focus:border-emerald-500/50 transition-colors"
            >
              {DOC_TYPES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
            <Icon name="ChevronDown" size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] pointer-events-none" />
          </div>
        </div>

        {/* Кнопка превью */}
        <button
          onClick={handlePreview}
          title={showPreview ? 'Скрыть превью' : 'Показать превью'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${
            showPreview
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'
              : 'border-border text-[hsl(var(--text-muted))] hover:text-foreground hover:border-border/70'
          }`}
        >
          <Icon name={showPreview ? 'EyeOff' : 'Eye'} size={13} />
          {showPreview ? 'Скрыть' : 'Превью'}
        </button>
      </div>

      {/* ── Таб-бар шаблонов ── */}
      <div className="border-b border-border shrink-0 bg-[hsl(220,14%,10%)]">
        <div className="flex items-end gap-0 overflow-x-auto scrollbar-none px-2">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-2.5">
              <Icon name="Loader2" size={12} className="animate-spin text-[hsl(var(--text-muted))]" />
              <span className="text-xs text-[hsl(var(--text-muted))]">Загрузка...</span>
            </div>
          ) : (
            <>
              {templates.map(t => {
                const isActive = selectedTemplate?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => switchTemplate(t)}
                    className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs whitespace-nowrap transition-all border-b-2 shrink-0 ${
                      isActive
                        ? 'border-b-emerald-500 text-foreground font-medium'
                        : 'border-b-transparent text-[hsl(var(--text-muted))] hover:text-foreground'
                    }`}
                  >
                    {t.is_default && (
                      <Icon name="Star" size={9} className="text-yellow-400 shrink-0" />
                    )}
                    {t.name}
                    {isActive && isDirty && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Есть несохранённые изменения" />
                    )}
                  </button>
                );
              })}
              <button
                onClick={createTemplate}
                className="flex items-center gap-1 px-3 py-2.5 border-b-2 border-b-transparent text-[hsl(var(--text-muted))] hover:text-emerald-400 transition-all text-xs shrink-0 border border-dashed border-border/50 rounded-t-md mx-1.5 mb-px hover:border-emerald-500/40"
              >
                <Icon name="Plus" size={11} />
                Новый
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Баннер несохранённых изменений ── */}
      {pendingSwitch && (
        <div className="shrink-0 border-b border-amber-500/25 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-500/12 via-amber-500/6 to-transparent">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 shrink-0">
                <Icon name="AlertTriangle" size={11} className="text-amber-400" />
              </div>
              <span className="text-xs text-amber-300 leading-relaxed">
                Несохранённые изменения в <span className="font-medium text-amber-200">«{selectedTemplate?.name}»</span>.
                {' '}Сохранить перед переключением на <span className="font-medium text-amber-200">«{pendingSwitch.name}»</span>?
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <button
                onClick={() => confirmSwitch(true)}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-md text-xs hover:bg-emerald-500/30 transition-all disabled:opacity-60"
              >
                {saving ? <Icon name="Loader2" size={10} className="animate-spin" /> : <Icon name="Save" size={10} />}
                Сохранить
              </button>
              <button
                onClick={() => confirmSwitch(false)}
                className="px-3 py-1 border border-border text-[hsl(var(--text-muted))] rounded-md text-xs hover:text-foreground transition-all"
              >
                Не сохранять
              </button>
              <button
                onClick={() => setPendingSwitch(null)}
                className="text-[hsl(var(--text-muted))] hover:text-foreground transition-all p-0.5 rounded"
              >
                <Icon name="X" size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Split layout ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Левая панель — редактор */}
        <div className={`overflow-y-auto transition-all bg-[hsl(220,14%,11%)] ${showPreview ? 'w-1/2' : 'w-full'}`}>
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
                onDownloadDocx={handleDownloadDocx}
                downloadingDocx={downloadingDocx}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
              <div className="w-10 h-10 rounded-full bg-[hsl(220,14%,14%)] border border-border flex items-center justify-center">
                <Icon name="FileText" size={18} className="text-[hsl(var(--text-muted))]" />
              </div>
              <p className="text-sm text-[hsl(var(--text-muted))]">
                {templates.length === 0
                  ? 'Нажмите «Новый» чтобы создать первый шаблон'
                  : 'Выберите шаблон в панели вкладок выше'}
              </p>
            </div>
          )}
        </div>

        {/* Правая панель — live preview */}
        {showPreview && (
          <div className="w-1/2 border-l border-border flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center gap-2 shrink-0 bg-[hsl(220,14%,10%)]">
              <Icon name="Eye" size={12} className="text-[hsl(var(--text-muted))]" />
              <span className="text-xs text-[hsl(var(--text-muted))]">Предпросмотр — обновляется в реальном времени</span>
              <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-500/70">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 animate-pulse" />
                live
              </span>
            </div>
            {selectedTemplate ? (
              <iframe
                ref={iframeRef}
                srcDoc={initialPreviewHtml}
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