import Icon from '@/components/ui/icon';
import type { Template } from './docTemplateTypes';

interface Props {
  template: Template;
  saving: boolean;
  isDirty: boolean;
  onUpdate: (t: Template) => void;
  onSave: () => void;
  onApply: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
  onDownloadDocx?: () => void;
  downloadingDocx?: boolean;
}

export default function DocTemplateEditorHeader({
  template, saving, isDirty,
  onUpdate, onSave, onApply, onDelete, onPreview, onDuplicate,
  onDownloadDocx, downloadingDocx,
}: Props) {
  return (
    <div className="px-4 pt-4 pb-3 border-b border-border bg-[hsl(220,14%,10%)]">
      {/* Строка 1: имя + статус */}
      <div className="flex items-center gap-2 mb-3">
        <input
          value={template.name}
          onChange={e => onUpdate({ ...template, name: e.target.value })}
          className="flex-1 min-w-[120px] bg-transparent border border-transparent hover:border-border focus:border-border rounded-md px-2 py-1 text-base font-semibold text-foreground placeholder:text-[hsl(var(--text-muted))] outline-none transition-colors"
          placeholder="Название шаблона"
        />
        {template.is_default && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium shrink-0">
            <Icon name="CheckCircle2" size={11} />
            Активный
          </span>
        )}
        {isDirty && (
          <span className="flex items-center gap-1.5 text-[11px] text-amber-400 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            не сохранено
          </span>
        )}
      </div>

      {/* Строка 2: кнопки действий */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Eye */}
        <button
          onClick={onPreview}
          title="Предпросмотр"
          className="p-1.5 border border-border rounded-md text-[hsl(var(--text-muted))] hover:text-emerald-400 hover:border-emerald-500/40 transition-all"
        >
          <Icon name="Eye" size={13} />
        </button>

        {/* Copy */}
        <button
          onClick={onDuplicate}
          title="Дублировать шаблон"
          className="p-1.5 border border-border rounded-md text-[hsl(var(--text-muted))] hover:text-blue-400 hover:border-blue-500/40 transition-all"
        >
          <Icon name="Copy" size={13} />
        </button>

        {/* DOCX */}
        {onDownloadDocx && (
          <button
            onClick={onDownloadDocx}
            disabled={downloadingDocx}
            title="Скачать пример DOCX по этому шаблону"
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border rounded-md text-[11px] text-[hsl(var(--text-muted))] hover:text-violet-400 hover:border-violet-500/40 transition-all disabled:opacity-60"
          >
            {downloadingDocx
              ? <Icon name="Loader2" size={12} className="animate-spin" />
              : <Icon name="FileDown" size={12} />}
            DOCX
          </button>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Применить */}
        {!template.is_default && (
          <button
            onClick={onApply}
            title="Применить этот шаблон ко всем документам данного типа"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/12 border border-gold/35 text-gold rounded-md text-xs font-medium hover:bg-gold/22 transition-all"
          >
            <Icon name="CheckCircle" size={12} />
            Применить
          </button>
        )}

        {/* Сохранить */}
        <button
          onClick={onSave}
          disabled={saving}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-60 ${
            isDirty
              ? 'bg-emerald-500 border border-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/25'
          }`}
        >
          {saving ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="Save" size={12} />}
          Сохранить
        </button>

        {/* Удалить */}
        <button
          onClick={onDelete}
          title="Удалить шаблон"
          className="p-1.5 border border-border rounded-md text-red-400/50 hover:text-red-400 hover:border-red-500/40 transition-all"
        >
          <Icon name="Trash2" size={13} />
        </button>
      </div>
    </div>
  );
}
