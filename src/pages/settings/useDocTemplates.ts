import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { API, authHeaders, type Template } from './docTemplateTypes';
import { API_URLS } from '@/config/api';

export function useDocTemplates(selectedDocType: string) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const savedTemplatesRef = useRef<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const selectedTemplateRef = useRef<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<Template | null>(null);
  const [downloadingDocx, setDownloadingDocx] = useState(false);

  const loadTemplates = useCallback(async (keepSelectedId?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/?doc_type=${selectedDocType}`, { headers: authHeaders() });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setTemplates(list);
      savedTemplatesRef.current = list;
      if (list.length > 0) {
        const keep = keepSelectedId ? list.find((t: Template) => t.id === keepSelectedId) : null;
        const def = keep || list.find((t: Template) => t.is_default) || list[0];
        selectedTemplateRef.current = def;
        setSelectedTemplate(def);
      } else {
        selectedTemplateRef.current = null;
        setSelectedTemplate(null);
      }
    } catch {
      toast.error('Ошибка загрузки шаблонов');
    } finally {
      setLoading(false);
    }
  }, [selectedDocType]);

  const saveTemplate = useCallback(async (tpl?: Template) => {
    const target = tpl ?? selectedTemplateRef.current ?? selectedTemplate;
    if (!target) return;
    setSaving(true);
    try {
      await fetch(`${API}/?id=${target.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ name: target.name, blocks: target.blocks, settings: target.settings }),
      });
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
  }, [selectedTemplate]);

  const doSwitch = (t: Template) => {
    const fresh = savedTemplatesRef.current.find(tpl => tpl.id === t.id) ?? t;
    selectedTemplateRef.current = fresh;
    setSelectedTemplate(fresh);
    setTemplates(savedTemplatesRef.current);
    setIsDirty(false);
    setPendingSwitch(null);
  };

  const switchTemplate = (t: Template) => {
    if (selectedTemplate && selectedTemplate.id === t.id) return;
    if (isDirty && selectedTemplate) { setPendingSwitch(t); return; }
    doSwitch(t);
  };

  const confirmSwitch = async (save: boolean) => {
    if (!pendingSwitch) return;
    if (save) {
      const dirty = selectedTemplate
        ? templates.find(t => t.id === selectedTemplate.id) ?? selectedTemplate
        : undefined;
      await saveTemplate(dirty);
    }
    doSwitch(pendingSwitch);
  };

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
    if (data.id) { toast.success('Шаблон создан'); loadTemplates(); }
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
    if (data.id) { toast.success('Шаблон скопирован'); loadTemplates(); }
  };

  const handleApplyTemplate = async (docLabel: string) => {
    if (!selectedTemplate) return;
    const confirmed = window.confirm(
      `Применить шаблон «${selectedTemplate.name}» ко всем документам типа «${docLabel}»?\n\nВсе существующие договоры этого типа будут формироваться по новому шаблону. Это действие нельзя отменить автоматически.`
    );
    if (!confirmed) return;
    if (isDirty) await saveTemplate();
    await setDefault(selectedTemplate.id);
  };

  const downloadDocx = async () => {
    if (!selectedTemplate) return;
    if (isDirty) await saveTemplate();
    setDownloadingDocx(true);
    try {
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
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
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

  const handleUpdateTemplate = (
    t: Template,
    updatePreviewFn?: (t: Template) => void
  ) => {
    selectedTemplateRef.current = t;
    setSelectedTemplate(t);
    setTemplates(prev => prev.map(tpl => tpl.id === t.id ? t : tpl));
    setIsDirty(true);
    updatePreviewFn?.(t);
  };

  return {
    templates, selectedTemplate, saving, loading, isDirty, pendingSwitch, downloadingDocx,
    loadTemplates, saveTemplate, switchTemplate, confirmSwitch,
    createTemplate, deleteTemplate, setDefault, duplicateTemplate,
    handleApplyTemplate, downloadDocx, handleUpdateTemplate,
  };
}