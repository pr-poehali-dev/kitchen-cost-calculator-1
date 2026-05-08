import { useState } from 'react';
import type { Template } from './docTemplateTypes';
import DocTemplateEditorHeader from './DocTemplateEditorHeader';
import DocTemplatePageSettings from './DocTemplatePageSettings';
import DocTemplateVarPanel from './DocTemplateVarPanel';
import DocTemplateBlockList from './DocTemplateBlockList';

interface Props {
  template: Template;
  saving: boolean;
  isDirty: boolean;
  editingBlock: string | null;
  onUpdate: (t: Template) => void;
  onSave: () => void;
  onApply: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
  onEditBlock: (id: string | null) => void;
  onDownloadDocx?: () => void;
  downloadingDocx?: boolean;
}

export default function DocTemplateEditor({
  template, saving, isDirty, editingBlock,
  onUpdate, onSave, onApply, onDelete, onSetDefault, onPreview, onDuplicate, onEditBlock,
  onDownloadDocx, downloadingDocx,
}: Props) {
  const [insertFn, setInsertFn] = useState<((v: string) => void) | null>(null);

  const handleRegisterInsert = (fn: ((v: string) => void) | null) => {
    // useState с функцией требует обёртку чтобы не вызвался как initializer
    setInsertFn(fn ? () => (v: string) => fn(v) : null);
  };

  return (
    <div className="space-y-3 border border-border rounded-xl overflow-hidden">

      <DocTemplateEditorHeader
        template={template}
        saving={saving}
        isDirty={isDirty}
        onUpdate={onUpdate}
        onSave={onSave}
        onApply={onApply}
        onDelete={onDelete}
        onPreview={onPreview}
        onDuplicate={onDuplicate}
        onDownloadDocx={onDownloadDocx}
        downloadingDocx={downloadingDocx}
      />

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
  );
}
