import { useState, useCallback } from 'react';
import type { Template } from './docTemplateTypes';
import DocTemplateEditorHeader from './DocTemplateEditorHeader';
import DocTemplatePageSettings from './DocTemplatePageSettings';
import DocTemplateVarPanel from './DocTemplateVarPanel';
import DocTemplateBlockList from './DocTemplateBlockList';

interface Props {
  template: Template;
  saving: boolean;
  isDirty: boolean;
  isAdmin: boolean;
  editingBlock: string | null;
  onUpdate: (t: Template) => void;
  onSave: () => void;
  onApply: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onEditBlock: (id: string | null) => void;
  onDownloadDocx?: () => void;
  downloadingDocx?: boolean;
}

export default function DocTemplateEditor({
  template, saving, isDirty, isAdmin, editingBlock,
  onUpdate, onSave, onApply, onDelete, onSetDefault, onPreview, onDuplicate, onToggleLock, onEditBlock,
  onDownloadDocx, downloadingDocx,
}: Props) {
  const [insertFn, setInsertFn] = useState<((v: string) => void) | null>(null);
  const locked = template.is_locked;

  const handleRegisterInsert = useCallback((fn: ((v: string) => void) | null) => {
    setInsertFn(fn ? () => (v: string) => fn(v) : null);
  }, []);

  return (
    <div className="space-y-3 border border-border rounded-xl overflow-hidden">

      <DocTemplateEditorHeader
        template={template}
        saving={saving}
        isDirty={isDirty}
        isAdmin={isAdmin}
        onUpdate={onUpdate}
        onSave={onSave}
        onApply={onApply}
        onDelete={onDelete}
        onPreview={onPreview}
        onDuplicate={onDuplicate}
        onToggleLock={onToggleLock}
        onDownloadDocx={onDownloadDocx}
        downloadingDocx={downloadingDocx}
      />

      {/* Lock overlay — блокирует настройки страницы, блоки и переменные */}
      <div className={locked ? 'pointer-events-none opacity-50 select-none' : ''}>
        <DocTemplatePageSettings
          template={template}
          onUpdate={onUpdate}
        />

        <div className="px-4">
          <DocTemplateVarPanel onInsert={insertFn} />
        </div>

        <DocTemplateBlockList
          template={template}
          editingBlock={editingBlock}
          onUpdate={onUpdate}
          onEditBlock={onEditBlock}
          onRegisterInsert={handleRegisterInsert}
        />
      </div>

    </div>
  );
}