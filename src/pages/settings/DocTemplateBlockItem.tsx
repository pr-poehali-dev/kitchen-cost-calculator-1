import { useRef, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import type { Block } from './docTemplateTypes';
import BlockEditorPanels from './BlockEditorPanels';

interface Props {
  block: Block;
  idx: number;
  totalBlocks: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  onToggleEnabled: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onUpdate: (field: keyof Block, value: string | boolean | number | number[] | string[] | undefined) => void;
  onRegisterInsert?: (fn: ((v: string) => void) | null) => void;
}

export default function DocTemplateBlockItem({
  block, idx, totalBlocks, isEditing,
  onToggleEdit, onToggleEnabled, onMove, onRemove, onUpdate, onRegisterInsert,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVar = (v: string) => {
    const el = textareaRef.current;
    if (!el) {
      onUpdate('content', (block.content || '') + v);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = block.content.slice(0, start) + v + block.content.slice(end);
    onUpdate('content', next);
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + v.length;
    }, 0);
  };

  // Регистрируем/дерегистрируем функцию вставки при открытии/закрытии редактора
  useEffect(() => {
    if (!onRegisterInsert) return;
    if (isEditing) {
      onRegisterInsert(insertVar);
      return () => onRegisterInsert(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  const hasCondition = !!block.condition;

  return (
    <div className={`border rounded-lg transition-all ${
      block.enabled
        ? hasCondition ? 'border-amber-500/40' : 'border-border'
        : 'border-border/40 opacity-50'
    }`}>
      {/* Строка блока */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={onToggleEnabled}
          className={`shrink-0 ${block.enabled ? 'text-emerald-400' : 'text-[hsl(var(--text-muted))]'}`}
        >
          <Icon name={block.enabled ? 'Eye' : 'EyeOff'} size={13} />
        </button>

        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border ${
          block.type === 'section'    ? 'border-gold/40 text-gold bg-gold/10' :
          block.type === 'header'     ? 'border-blue-500/40 text-blue-400 bg-blue-500/10' :
          block.type === 'divider'    ? 'border-zinc-500/40 text-zinc-400 bg-zinc-500/10' :
          block.type === 'spacer'     ? 'border-violet-500/40 text-violet-400 bg-violet-500/10' :
          block.type === 'lines'      ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' :
          block.type === 'table'      ? 'border-orange-500/40 text-orange-400 bg-orange-500/10' :
          block.type === 'image'      ? 'border-pink-500/40 text-pink-400 bg-pink-500/10' :
          block.type === 'calc_table' ? 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10' :
          'border-border text-[hsl(var(--text-muted))]'
        }`}>
          {{ section:'раздел', header:'шапка', divider:'линия', spacer:'отступ', lines:'линии', table:'таблица', paragraph:'текст', image:'фото', calc_table:'из расчёта', two_col:'2 колонки' }[block.type] || block.type}
        </span>

        <span className="flex-1 text-xs text-foreground truncate">{block.label}</span>

        {/* Индикатор условия */}
        {hasCondition && (
          <span title="Есть условие показа" className="shrink-0">
            <Icon name="GitBranch" size={11} className="text-amber-400" />
          </span>
        )}

        {/* Индикаторы активных стилей */}
        {(block.bold || block.italic || block.underline || block.fontSize || block.align || block.marginTop != null || block.marginBottom != null) && (
          <span className="text-[10px] text-[hsl(var(--text-muted))] shrink-0 flex items-center gap-0.5">
            {block.fontSize && <span>{block.fontSize}pt</span>}
            {block.bold && <span className="font-bold">B</span>}
            {block.italic && <span className="italic">I</span>}
            {block.underline && <span className="underline">U</span>}
            {block.align && block.align !== 'justify' && <span>{({left:'←',center:'⊡',right:'→'})[block.align]}</span>}
            {block.marginTop != null && <span>↑{block.marginTop}</span>}
            {block.marginBottom != null && <span>↓{block.marginBottom}</span>}
          </span>
        )}

        <div className="flex items-center gap-1">
          <button onClick={() => onMove(-1)} disabled={idx === 0} className="text-[hsl(var(--text-muted))] hover:text-foreground disabled:opacity-30">
            <Icon name="ChevronUp" size={12} />
          </button>
          <button onClick={() => onMove(1)} disabled={idx === totalBlocks - 1} className="text-[hsl(var(--text-muted))] hover:text-foreground disabled:opacity-30">
            <Icon name="ChevronDown" size={12} />
          </button>
          <button
            onClick={onToggleEdit}
            className={`text-[hsl(var(--text-muted))] hover:text-foreground ${isEditing ? 'text-emerald-400' : ''}`}
          >
            <Icon name="Pencil" size={12} />
          </button>
          <button onClick={onRemove} className="text-red-400/30 hover:text-red-400 transition-all">
            <Icon name="X" size={12} />
          </button>
        </div>
      </div>

      {/* Редактор блока */}
      {isEditing && (
        <BlockEditorPanels
          block={block}
          textareaRef={textareaRef}
          onUpdate={onUpdate}
          insertVar={insertVar}
        />
      )}
    </div>
  );
}