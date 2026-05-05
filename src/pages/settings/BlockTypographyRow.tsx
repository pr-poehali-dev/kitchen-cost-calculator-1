import Icon from '@/components/ui/icon';
import type { Block, BlockAlign } from './docTemplateTypes';

const ALIGN_OPTIONS: { value: BlockAlign; icon: string; title: string }[] = [
  { value: 'left',    icon: 'AlignLeft',    title: 'По левому краю' },
  { value: 'center',  icon: 'AlignCenter',  title: 'По центру' },
  { value: 'right',   icon: 'AlignRight',   title: 'По правому краю' },
  { value: 'justify', icon: 'AlignJustify', title: 'По ширине' },
];

export default function BlockTypographyRow({ block, onUpdate }: {
  block: Block;
  onUpdate: (field: keyof Block, value: string | boolean | number | undefined) => void;
}) {
  const btnBase = 'w-6 h-6 flex items-center justify-center rounded border text-[10px] transition-all';
  const btnOn   = 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400';
  const btnOff  = 'border-border text-[hsl(var(--text-muted))] hover:text-foreground hover:border-border/80';

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Размер шрифта */}
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] text-[hsl(var(--text-muted))] shrink-0">Шрифт (pt)</label>
        <input
          type="number"
          min={6} max={24} step={0.5}
          placeholder="—"
          value={block.fontSize ?? ''}
          onChange={e => {
            const v = e.target.value;
            onUpdate('fontSize', v === '' ? undefined : parseFloat(v));
          }}
          className="w-14 bg-[hsl(220,14%,12%)] border border-border rounded px-1.5 py-0.5 text-xs text-foreground text-center"
        />
      </div>

      {/* Отступ сверху / снизу */}
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] text-[hsl(var(--text-muted))] shrink-0">↑ мм</label>
        <input
          type="number"
          min={0} max={50} step={1}
          placeholder="—"
          value={block.marginTop ?? ''}
          onChange={e => {
            const v = e.target.value;
            onUpdate('marginTop', v === '' ? undefined : parseFloat(v));
          }}
          className="w-12 bg-[hsl(220,14%,12%)] border border-border rounded px-1.5 py-0.5 text-xs text-foreground text-center"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] text-[hsl(var(--text-muted))] shrink-0">↓ мм</label>
        <input
          type="number"
          min={0} max={50} step={1}
          placeholder="—"
          value={block.marginBottom ?? ''}
          onChange={e => {
            const v = e.target.value;
            onUpdate('marginBottom', v === '' ? undefined : parseFloat(v));
          }}
          className="w-12 bg-[hsl(220,14%,12%)] border border-border rounded px-1.5 py-0.5 text-xs text-foreground text-center"
        />
      </div>

      {/* Жирный / курсив / подчёркивание */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onUpdate('bold', !block.bold)}
          className={`${btnBase} font-bold ${block.bold ? btnOn : btnOff}`}
          title="Жирный"
        >B</button>
        <button
          onClick={() => onUpdate('italic', !block.italic)}
          className={`${btnBase} italic ${block.italic ? btnOn : btnOff}`}
          title="Курсив"
        >I</button>
        <button
          onClick={() => onUpdate('underline', !block.underline)}
          className={`${btnBase} underline ${block.underline ? btnOn : btnOff}`}
          title="Подчёркивание"
        >U</button>
      </div>

      {/* Выравнивание (не для таблицы) */}
      {block.type !== 'table' && (
        <div className="flex items-center gap-1">
          {ALIGN_OPTIONS.map(({ value, icon, title }) => (
            <button
              key={value}
              onClick={() => onUpdate('align', block.align === value ? undefined : value)}
              className={`${btnBase} ${block.align === value ? btnOn : btnOff}`}
              title={title}
            >
              <Icon name={icon as Parameters<typeof Icon>[0]['name']} size={11} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
