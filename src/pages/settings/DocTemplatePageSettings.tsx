import { useState } from 'react';
import Icon from '@/components/ui/icon';
import type { Template } from './docTemplateTypes';
import { LETTERHEADS } from './docTemplateLetterheads';

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

const LH_REQS = [
  { key: 'lhCompany', label: 'Компания',  placeholder: '{{компания}}' },
  { key: 'lhPhone',   label: 'Телефон',   placeholder: '{{телефон_компании}}' },
  { key: 'lhEmail',   label: 'Email',     placeholder: '{{email_компании}}' },
  { key: 'lhAddress', label: 'Адрес',     placeholder: '{{адрес_компании}}' },
  { key: 'lhWebsite', label: 'Сайт',      placeholder: '{{сайт_компании}}' },
];

const ACCENT_PRESETS = [
  '#c0392b', '#1a56a0', '#5a3e8a', '#0d9488',
  '#d97706', '#166534', '#1e40af', '#be185d',
  '#374151', '#7c3aed',
];

export default function DocTemplatePageSettings({ template, onUpdate }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const s = template.settings as Record<string, string | number>;
  const upd = (key: string, value: string | number) =>
    onUpdate({ ...template, settings: { ...template.settings, [key]: value } });

  const currentLh = (s.letterhead as string) || 'none';
  const currentColor = (s.accentColor as string) || '#c0392b';
  const hasLetterhead = currentLh !== 'none';

  return (
    <div className="mx-4 border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setSettingsOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-[hsl(220,14%,10%)] hover:bg-[hsl(220,14%,12%)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon name="Settings2" size={13} className="text-[hsl(var(--text-muted))]" />
          <span className="text-xs font-medium text-foreground">Настройки страницы</span>
          {hasLetterhead && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-medium border"
              style={{ color: currentColor, borderColor: currentColor + '55', background: currentColor + '18' }}
            >
              {LETTERHEADS.find(l => l.id === currentLh)?.label}
            </span>
          )}
        </div>
        <Icon name={settingsOpen ? 'ChevronUp' : 'ChevronDown'} size={13} className="text-[hsl(var(--text-muted))]" />
      </button>

      {settingsOpen && (
        <div className="border-t border-border bg-[hsl(220,14%,11%)]">

          {/* ── Оформление бланка ── */}
          <div className="px-3 pt-3 pb-3 border-b border-border">
            <label className="text-[11px] text-[hsl(var(--text-muted))] block mb-2">
              Стиль бланка
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {LETTERHEADS.map(lh => {
                const active = currentLh === lh.id;
                return (
                  <button
                    key={lh.id}
                    onClick={() => upd('letterhead', lh.id)}
                    title={lh.description}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all ${
                      active
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400'
                        : 'border-border text-[hsl(var(--text-muted))] hover:text-foreground hover:border-border/60'
                    }`}
                  >
                    {/* Миниатюра стиля */}
                    <div className="w-8 h-10 bg-white rounded-sm relative overflow-hidden shadow-sm border border-gray-200">
                      {lh.id === 'none' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-4 h-px bg-gray-200" />
                        </div>
                      )}
                      {lh.id === 'classic' && (
                        <>
                          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: lh.previewColor }} />
                          <div className="absolute top-1 left-0.5 right-0.5 h-px" style={{ background: lh.previewColor + '60' }} />
                          <div className="absolute bottom-0 right-0 w-0 h-0 border-solid border-t-0 border-l-0"
                            style={{ borderWidth: '0 0 6px 6px', borderColor: `transparent transparent ${lh.previewColor} transparent` }} />
                        </>
                      )}
                      {lh.id === 'corporate' && (
                        <>
                          <div className="absolute top-0 left-0 right-0 h-2.5" style={{ background: lh.previewColor }} />
                          <div className="absolute top-0 left-0 bottom-0 w-1" style={{ background: lh.previewColor }} />
                          <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: lh.previewColor }} />
                        </>
                      )}
                      {lh.id === 'elegant' && (
                        <>
                          <div className="absolute inset-0.5 border rounded-sm" style={{ borderColor: lh.previewColor + '80' }} />
                          <div className="absolute inset-1 border-0 rounded-sm" style={{ outline: `0.5px solid ${lh.previewColor}30` }} />
                          <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l" style={{ borderColor: lh.previewColor }} />
                          <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r" style={{ borderColor: lh.previewColor }} />
                          <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l" style={{ borderColor: lh.previewColor }} />
                          <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r" style={{ borderColor: lh.previewColor }} />
                        </>
                      )}
                      {lh.id === 'minimal' && (
                        <>
                          <div className="absolute top-0 left-0 bottom-0 w-1" style={{ background: lh.previewColor }} />
                          <div className="absolute top-2.5 left-1.5 right-0.5 h-px" style={{ background: '#e0e0e0' }} />
                        </>
                      )}
                    </div>
                    <span className="text-[9px] leading-tight">{lh.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Цвет акцента */}
            {hasLetterhead && (
              <div className="mt-3">
                <label className="text-[11px] text-[hsl(var(--text-muted))] block mb-1.5">Цвет акцента</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {ACCENT_PRESETS.map(color => (
                    <button
                      key={color}
                      onClick={() => upd('accentColor', color)}
                      className={`w-5 h-5 rounded-full transition-transform hover:scale-110 border-2 ${currentColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ background: color }}
                      title={color}
                    />
                  ))}
                  <div className="flex items-center gap-1.5 ml-1">
                    <label className="text-[10px] text-[hsl(var(--text-muted))]">Свой:</label>
                    <input
                      type="color"
                      value={currentColor}
                      onChange={e => upd('accentColor', e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Реквизиты для колонтитулов */}
            {hasLetterhead && (
              <div className="mt-3">
                <label className="text-[11px] text-[hsl(var(--text-muted))] block mb-1.5">
                  Реквизиты в бланке
                  <span className="ml-1.5 opacity-60">(или используй переменные)</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {LH_REQS.map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-0.5">{label}</label>
                      <input
                        type="text"
                        value={(s[key] as string) ?? ''}
                        onChange={e => upd(key, e.target.value)}
                        placeholder={placeholder}
                        className="w-full bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-0.5 text-[11px] text-foreground placeholder:text-[hsl(var(--text-muted))] outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Типографика и поля ── */}
          <div className="px-3 py-3 grid grid-cols-2 gap-x-5 gap-y-3">
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
                  const ms = template.settings as Record<string, number>;
                  const fallback = key === 'marginLeft' ? 20 : key === 'marginRight' ? 10 : 10;
                  const val = ms[key] != null ? ms[key] : (ms['marginMm'] ?? fallback);
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
        </div>
      )}
    </div>
  );
}
