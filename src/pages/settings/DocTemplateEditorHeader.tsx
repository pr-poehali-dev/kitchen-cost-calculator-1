import Icon from '@/components/ui/icon';
import type { Template } from './docTemplateTypes';

interface Props {
  template: Template;
  saving: boolean;
  isDirty: boolean;
  isAdmin: boolean;
  onUpdate: (t: Template) => void;
  onSave: () => void;
  onApply: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onDownloadDocx?: () => void;
  downloadingDocx?: boolean;
}

export default function DocTemplateEditorHeader({
  template, saving, isDirty, isAdmin,
  onUpdate, onSave, onApply, onDelete, onPreview, onDuplicate, onToggleLock,
  onDownloadDocx, downloadingDocx,
}: Props) {
  const locked = template.is_locked;

  return (
    <div className={`px-4 pt-4 pb-3 border-b border-border transition-colors ${locked ? 'bg-amber-500/5' : 'bg-[hsl(220,14%,10%)]'}`}>
      {/* Строка 1: имя + статус */}
      <div className="flex items-center gap-2 mb-3">
        <input
          value={template.name}
          onChange={e => !locked && onUpdate({ ...template, name: e.target.value })}
          readOnly={locked}
          className={`flex-1 min-w-[120px] bg-transparent border border-transparent rounded-md px-2 py-1 text-base font-semibold text-foreground placeholder:text-[hsl(var(--text-muted))] outline-none transition-colors ${
            locked ? 'opacity-60 cursor-default' : 'hover:border-border focus:border-border'
          }`}
          placeholder="Название шаблона"
        />
        {locked && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-medium shrink-0">
            <Icon name="Lock" size={11} />
            Заблокирован
          </span>
        )}
        {template.is_default && !locked && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium shrink-0">
            <Icon name="CheckCircle2" size={11} />
            Активный
          </span>
        )}
        {isDirty && !locked && (
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
        {!locked && (
          <button
            onClick={onDuplicate}
            title="Дублировать шаблон"
            className="p-1.5 border border-border rounded-md text-[hsl(var(--text-muted))] hover:text-blue-400 hover:border-blue-500/40 transition-all"
          >
            <Icon name="Copy" size={13} />
          </button>
        )}

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
        {!template.is_default && !locked && (
          <button
            onClick={onApply}
            title="Применить этот шаблон ко всем документам данного типа"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/12 border border-gold/35 text-gold rounded-md text-xs font-medium hover:bg-gold/22 transition-all"
          >
            <Icon name="CheckCircle" size={12} />
            Применить
          </button>
        )}

        {/* Блокировка */}
        <button
          onClick={onToggleLock}
          title={locked ? 'Разблокировать шаблон' : 'Заблокировать от случайного редактирования'}
          className={`p-1.5 border rounded-md transition-all ${
            locked
              ? 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
              : 'border-border text-[hsl(var(--text-muted))] hover:text-amber-400 hover:border-amber-500/40'
          }`}
        >
          <Icon name={locked ? 'Lock' : 'LockOpen'} size={13} />
        </button>

        {/* Сохранить */}
        {!locked && (
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
        )}

        {/* Удалить — только для админа */}
        {isAdmin && !locked && (
          <button
            onClick={onDelete}
            title="Удалить шаблон (только администратор)"
            className="p-1.5 border border-border rounded-md text-red-400/50 hover:text-red-400 hover:border-red-500/40 transition-all"
          >
            <Icon name="Trash2" size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
