import Icon from '@/components/ui/icon';
import type { BlockCondition } from './docTemplateTypes';
import { CONDITION_FIELDS, CONDITION_OPERATORS, PAYMENT_TYPE_OPTIONS } from './docTemplateTypes';

interface Props {
  condition: BlockCondition | undefined;
  onChange: (c: BlockCondition | undefined) => void;
  onRemove: () => void;
}

export default function BlockConditionEditor({ condition, onChange, onRemove }: Props) {
  const selectedOp = CONDITION_OPERATORS.find(o => o.value === condition?.operator);

  if (!condition) {
    return (
      <button
        type="button"
        onClick={() => onChange({ field: 'payment_type', operator: 'eq', value: '' })}
        className="flex items-center gap-1 px-2 py-0.5 rounded border border-dashed border-border text-[10px] text-[hsl(var(--text-muted))] hover:text-emerald-400 hover:border-emerald-500/40 transition-all"
      >
        <Icon name="GitBranch" size={10} /> Добавить условие
      </button>
    );
  }

  const needsValue = selectedOp?.needsValue ?? true;
  const isPaymentType = condition.field === 'payment_type';

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-amber-500/30 bg-amber-500/5">
      <Icon name="GitBranch" size={10} className="text-amber-400 shrink-0" />
      <span className="text-[10px] text-amber-400 shrink-0">Показывать если:</span>

      <select
        value={condition.field}
        onChange={e => onChange({ ...condition, field: e.target.value as BlockCondition['field'], value: '' })}
        className="bg-[hsl(220,14%,12%)] border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground"
      >
        {CONDITION_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      <select
        value={condition.operator}
        onChange={e => onChange({ ...condition, operator: e.target.value as BlockCondition['operator'] })}
        className="bg-[hsl(220,14%,12%)] border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground"
      >
        {CONDITION_OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {needsValue && isPaymentType && (
        <select
          value={condition.value || ''}
          onChange={e => onChange({ ...condition, value: e.target.value })}
          className="bg-[hsl(220,14%,12%)] border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground"
        >
          <option value="">— выбери —</option>
          {PAYMENT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}

      {needsValue && !isPaymentType && (
        <input
          type="text"
          value={condition.value || ''}
          onChange={e => onChange({ ...condition, value: e.target.value })}
          placeholder="значение"
          className="w-20 bg-[hsl(220,14%,12%)] border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground"
        />
      )}

      <button type="button" onClick={onRemove} className="text-red-400/50 hover:text-red-400 transition-all ml-auto">
        <Icon name="X" size={10} />
      </button>
    </div>
  );
}
