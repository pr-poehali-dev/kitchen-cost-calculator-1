import { useState } from 'react';
import Icon from '@/components/ui/icon';
import type { Template } from './docTemplateTypes';

interface Props {
  template: Template;
  onUpdate: (t: Template) => void;
}

const SETTINGS_SLIDERS = [
  { key: 'fontSize',   label: 'Шрифт (pt)',   min: 7,   max: 14, step: 0.5 },
  { key: 'lineHeight', label: 'Межстрочный',  min: 0.8, max: 2,  step: 0.05 },
];

const MARGIN_FIELDS = [
  { key: 'marginLeft',   label: '←', title: 'Левое поле (мм)' },
  { key: 'marginRight',  label: '→', title: 'Правое поле (мм)' },
  { key: 'marginTop',    label: '↑', title: 'Верхнее поле (мм)' },
  { key: 'marginBottom', label: '↓', title: 'Нижнее поле (мм)' },
];

export default function DocTemplatePageSettings({ template, onUpdate }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="mx-4 border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setSettingsOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-[hsl(220,14%,10%)] hover:bg-[hsl(220,14%,12%)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon name="Settings2" size={13} className="text-[hsl(var(--text-muted))]" />
          <span className="text-xs font-medium text-foreground">Настройки страницы</span>
        </div>
        <Icon name={settingsOpen ? 'ChevronUp' : 'ChevronDown'} size={13} className="text-[hsl(var(--text-muted))]" />
      </button>

      {settingsOpen && (
        <div className="px-3 py-3 border-t border-border grid grid-cols-2 gap-x-5 gap-y-3 bg-[hsl(220,14%,11%)]">
          {/* Слайдеры */}
          {SETTINGS_SLIDERS.map(({ key, label, min, max, step }) => (
            <div key={key}>
              <label className="text-[11px] text-[hsl(var(--text-muted))] block mb-1">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="range" min={min} max={max} step={step}
                  value={Number((template.settings as Record<string, number>)[key]) || min}
                  onChange={e => onUpdate({ ...template, settings: { ...template.settings, [key]: parseFloat(e.target.value) } })}
                  className="flex-1"
                />
                <span className="text-xs text-foreground w-8 text-right tabular-nums">
                  {Number((template.settings as Record<string, number>)[key]) || min}
                </span>
              </div>
            </div>
          ))}

          {/* Поля страницы */}
          <div>
            <label className="text-[11px] text-[hsl(var(--text-muted))] block mb-1">Поля (мм)</label>
            <div className="grid grid-cols-2 gap-1">
              {MARGIN_FIELDS.map(({ key, label, title }) => {
                const s = template.settings as Record<string, number>;
                const fallback = key === 'marginLeft' ? 20 : key === 'marginRight' ? 10 : 10;
                const val = s[key] != null ? s[key] : (s['marginMm'] ?? fallback);
                return (
                  <div key={key} className="flex items-center gap-1" title={title}>
                    <span className="text-[10px] text-[hsl(var(--text-muted))] w-4 text-center shrink-0">{label}</span>
                    <input
                      type="number" min={3} max={50} step={1}
                      value={val}
                      onChange={e => onUpdate({ ...template, settings: { ...template.settings, [key]: parseFloat(e.target.value) || 0 } })}
                      className="w-12 bg-[hsl(220,14%,12%)] border border-border rounded px-1.5 py-0.5 text-xs text-foreground text-center"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Гарнитура */}
          <div>
            <label className="text-[11px] text-[hsl(var(--text-muted))] block mb-1">Гарнитура</label>
            <div className="flex flex-col gap-1">
              {[
                { value: 'Times New Roman', label: 'Times New Roman' },
                { value: 'Arial',           label: 'Arial' },
                { value: 'Calibri',         label: 'Calibri' },
              ].map(opt => {
                const active = (template.settings.fontFamily ?? 'Times New Roman') === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => onUpdate({ ...template, settings: { ...template.settings, fontFamily: opt.value } })}
                    style={{ fontFamily: opt.value }}
                    className={`px-2.5 py-0.5 rounded border text-xs text-left transition-all ${active ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400' : 'border-border text-[hsl(var(--text-muted))] hover:text-foreground'}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ориентация */}
          <div>
            <label className="text-[11px] text-[hsl(var(--text-muted))] block mb-1">Ориентация</label>
            <div className="flex gap-1.5">
              {[
                { value: 'portrait',  label: 'Книжная',   icon: '▯' },
                { value: 'landscape', label: 'Альбомная', icon: '▭' },
              ].map(opt => {
                const active = (template.settings.orientation ?? 'portrait') === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => onUpdate({ ...template, settings: { ...template.settings, orientation: opt.value } })}
                    title={opt.label}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-all ${active ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400' : 'border-border text-[hsl(var(--text-muted))] hover:text-foreground'}`}
                  >
                    <span className="text-sm leading-none">{opt.icon}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
