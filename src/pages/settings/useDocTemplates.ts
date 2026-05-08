import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { API, authHeaders, type Template } from './docTemplateTypes';
import { API_URLS } from '@/config/api';

export function useDocTemplates(selectedDocType: string) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<Template | null>(null);
  const [downloadingDocx, setDownloadingDocx] = useState(false);

  // Refs — всегда актуальные значения без проблем с замыканиями
  const savedTemplatesRef = useRef<Template[]>([]);
  const currentTemplateRef = useRef<Template | null>(null);
  const isDirtyRef = useRef(false);
  const pendingSwitchRef = useRef<Template | null>(null);

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
        currentTemplateRef.current = def;
        setSelectedTemplate(def);
      } else {
        currentTemplateRef.current = null;
        setSelectedTemplate(null);
      }
    } catch {
      toast.error('Ошибка загрузки шаблонов');
    } finally {
      setLoading(false);
    }
  }, [selectedDocType]);

  // Сохраняет переданный шаблон — или берёт из ref (всегда актуальный)
  const saveTemplate = useCallback(async (tpl?: Template) => {
    const target = tpl ?? currentTemplateRef.current;
    if (!target || !target.id) { console.warn('[saveTemplate] no target or id, target=', target); return; }
    setSaving(true);
    try {
      const body = JSON.stringify({ name: target.name, blocks: target.blocks, settings: target.settings });
      const res = await fetch(`${API}/?id=${target.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log('[saveTemplate] success');
      // Обновляем серверную копию
      savedTemplatesRef.current = savedTemplatesRef.current.map(t =>
        t.id === target.id ? { ...t, name: target.name, blocks: target.blocks, settings: target.settings } : t
      );
      isDirtyRef.current = false;
      setIsDirty(false);
      if (!tpl) toast.success('Сохранено');
    } catch (e) {
      toast.error('Ошибка сохранения');
      console.error('[saveTemplate] error:', e);
    } finally {
      setSaving(false);
    }
  }, []);

  const doSwitch = useCallback((t: Template) => {
    const fresh = savedTemplatesRef.current.find(tpl => tpl.id === t.id) ?? t;
    currentTemplateRef.current = fresh;
    setSelectedTemplate(fresh);
    setTemplates(savedTemplatesRef.current);
    isDirtyRef.current = false;
    setIsDirty(false);
    pendingSwitchRef.current = null;
    setPendingSwitch(null);
  }, []);

  const switchTemplate = useCallback((t: Template) => {
    const cur = currentTemplateRef.current;
    if (cur && cur.id === t.id) return;
    if (isDirtyRef.current && cur) {
      pendingSwitchRef.current = t;
      setPendingSwitch(t);
      return;
    }
    doSwitch(t);
  }, [doSwitch]);

  const confirmSwitch = useCallback(async (save: boolean) => {
    const target = pendingSwitchRef.current;
    if (!target) return;
    if (save) {
      await saveTemplate(currentTemplateRef.current ?? undefined);
    }
    doSwitch(target);
  }, [saveTemplate, doSwitch]);

  const createTemplate = useCallback(async () => {
    const res = await fetch(`${API}/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        doc_type: selectedDocType,
        name: 'Мой шаблон',
        settings: { fontSize: 9.5, lineHeight: 1.0, marginMm: 10 },
        is_default: savedTemplatesRef.current.length === 0,
      }),
    });
    const data = await res.json();
    if (data.id) { toast.success('Шаблон создан'); loadTemplates(); }
  }, [selectedDocType, loadTemplates]);

  const deleteTemplate = useCallback(async (id: string) => {
    await fetch(`${API}/?id=${id}`, { method: 'DELETE', headers: authHeaders() });
    toast.success('Шаблон удалён');
    await loadTemplates();
  }, [loadTemplates]);

  const setDefault = useCallback(async (id: string) => {
    await fetch(`${API}/?id=${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ is_default: true }),
    });
    toast.success('Шаблон применён — теперь он активный для этого типа документа');
    await loadTemplates(id);
  }, [loadTemplates]);

  const duplicateTemplate = useCallback(async () => {
    const cur = currentTemplateRef.current;
    if (!cur) return;
    const res = await fetch(`${API}/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        doc_type: selectedDocType,
        name: `${cur.name} (копия)`,
        blocks: cur.blocks,
        settings: cur.settings,
        is_default: false,
      }),
    });
    const data = await res.json();
    if (data.id) { toast.success('Шаблон скопирован'); loadTemplates(); }
  }, [selectedDocType, loadTemplates]);

  const handleApplyTemplate = useCallback(async (docLabel: string) => {
    const cur = currentTemplateRef.current;
    if (!cur) return;
    const confirmed = window.confirm(
      `Применить шаблон «${cur.name}» ко всем документам типа «${docLabel}»?\n\nВсе существующие договоры этого типа будут формироваться по новому шаблону. Это действие нельзя отменить автоматически.`
    );
    if (!confirmed) return;
    if (isDirtyRef.current) await saveTemplate();
    await setDefault(cur.id);
  }, [saveTemplate, setDefault]);

  const downloadDocx = useCallback(async () => {
    const cur = currentTemplateRef.current;
    if (!cur) return;
    if (isDirtyRef.current) await saveTemplate();
    setDownloadingDocx(true);
    try {
      const url = `${API_URLS.docBuilder}/?action=doc_docx&client_id=preview&doc=${cur.doc_type}`;
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
        a.download = `${cur.name} — пример.docx`;
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
  }, [saveTemplate]);

  const handleUpdateTemplate = useCallback((
    t: Template,
    updatePreviewFn?: (t: Template) => void
  ) => {
    currentTemplateRef.current = t;
    isDirtyRef.current = true;
    setSelectedTemplate(t);
    setTemplates(prev => prev.map(tpl => tpl.id === t.id ? t : tpl));
    setIsDirty(true);
    updatePreviewFn?.(t);
  }, []);

  return {
    templates, selectedTemplate, saving, loading, isDirty, pendingSwitch, downloadingDocx,
    loadTemplates, saveTemplate, switchTemplate, confirmSwitch,
    createTemplate, deleteTemplate, setDefault, duplicateTemplate,
    handleApplyTemplate, downloadDocx, handleUpdateTemplate,
  };
}