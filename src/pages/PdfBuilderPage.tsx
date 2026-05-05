import SettingsDocTemplates from './settings/SettingsDocTemplates';

export default function PdfBuilderPage() {
  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-4 md:px-6 py-3 md:py-4 shrink-0">
        <h1 className="text-base font-semibold text-foreground">Конструктор PDF</h1>
        <p className="text-[hsl(var(--text-muted))] text-xs mt-0.5">Создавайте шаблоны договоров, актов и других документов</p>
      </div>
      <div className="flex-1 min-h-0 p-4 md:p-6 flex flex-col">
        <SettingsDocTemplates />
      </div>
    </div>
  );
}
