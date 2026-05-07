import { RefObject } from 'react';
import type { Block } from './docTemplateTypes';
import BlockTypographyRow from './BlockTypographyRow';
import BlockVarPicker from './BlockVarPicker';
import BlockConditionEditor from './BlockConditionEditor';
import BlockContentEditor from './BlockContentEditor';

const HAS_TYPOGRAPHY = ['paragraph', 'section', 'header', 'table', 'two_col'];

interface BlockEditorPanelsProps {
  block: Block;
  textareaRef: RefObject<HTMLTextAreaElement>;
  onUpdate: (field: keyof Block, value: string | boolean | number | number[] | undefined) => void;
  insertVar: (v: string) => void;
}

export default function BlockEditorPanels({ block, textareaRef, onUpdate, insertVar }: BlockEditorPanelsProps) {
  return (
    <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
      {/* Название блока */}
      <div>
        <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1">Название блока</label>
        <input
          value={block.label}
          onChange={e => onUpdate('label', e.target.value)}
          className="w-full bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1 text-xs text-foreground"
        />
      </div>

      {/* Условие показа */}
      <div>
        <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1.5">Условие показа блока</label>
        <BlockConditionEditor
          condition={block.condition}
          onChange={c => onUpdate('condition', c as unknown as string)}
          onRemove={() => onUpdate('condition', undefined)}
        />
        {!block.condition && (
          <p className="text-[10px] text-[hsl(var(--text-muted))] mt-1">
            Без условия блок всегда виден (если включён). С условием — появляется только при выполнении правила.
          </p>
        )}
      </div>

      {/* Типографика */}
      {HAS_TYPOGRAPHY.includes(block.type) && (
        <div>
          <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1.5">Типографика</label>
          <BlockTypographyRow block={block} onUpdate={onUpdate} />
        </div>
      )}

      {/* Редакторы контента по типу блока */}
      <BlockContentEditor
        block={block}
        textareaRef={textareaRef}
        onUpdate={onUpdate}
        insertVar={insertVar}
      />
    </div>
  );
}

export { BlockVarPicker };
