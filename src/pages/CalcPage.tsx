import { useState } from 'react';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import { fmt } from './calc/constants';

// Ключи видимых строк сводки
type SummaryVisKey = 'blocks' | 'services' | 'blockMarkups' | 'totalMarkup' | 'percent' | 'fixed';
const SUMMARY_VIS_DEFAULT: Record<SummaryVisKey, boolean> = {
  blocks: true, services: true, blockMarkups: true,
  totalMarkup: true, percent: true, fixed: true,
};
import CalcHeader from './calc/CalcHeader';
import CalcBlock from './calc/CalcBlock';
import CalcBlockSettings from './calc/CalcBlockSettings';
import TemplatesPanel from './calc/TemplatesPanel';
import ClientViewPanel from './calc/ClientViewPanel';
import { exportProjectPdf } from './calc/exportPdf';

export default function CalcPage() {
  const store = useStore();
  const project = store.getActiveProject();
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingBlockName, setEditingBlockName] = useState('');
  const [blockSettingsId, setBlockSettingsId] = useState<string | null>(null);
  const [showProjects, setShowProjects] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showClientView, setShowClientView] = useState(false);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<string | null>(null);
  const [summaryVis, setSummaryVis] = useState<Record<SummaryVisKey, boolean>>(SUMMARY_VIS_DEFAULT);
  const [showSummarySettings, setShowSummarySettings] = useState(false);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-[hsl(var(--text-muted))] text-sm">Нет активного проекта</p>
        <button
          onClick={() => store.createProject()}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded font-medium text-sm hover:opacity-90"
        >
          <Icon name="Plus" size={14} /> Создать проект
        </button>
      </div>
    );
  }

  const totals = store.calcProjectTotals(project);
  const { rawMaterials: totalMaterials, rawServices: totalServices, base: baseTotal, grandTotal } = totals;

  const handleFinishEditName = (blockId: string, blockName: string) => {
    store.updateBlock(project.id, blockId, { name: editingBlockName || blockName });
    setEditingBlockId(null);
  };

  const handleExportPdf = () => {
    exportProjectPdf({
      project,
      currency: store.settings.currency,
      totals,
      getManufacturerName: (id) => store.getManufacturerById(id)?.name || '',
      getVendorName: (id) => store.getVendorById(id)?.name || '',
      getTypeName: (id) => store.getTypeName(id),
    });
  };

  const handleDeleteProject = (projectId: string) => {
    store.deleteProject(projectId);
    setConfirmDeleteProject(null);
    setShowProjects(false);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in" onClick={() => { setShowProjects(false); setConfirmDeleteProject(null); }}>
      <CalcHeader
        project={project}
        totalMaterials={totalMaterials}
        totalServices={totalServices}
        total={baseTotal}
        grandTotal={grandTotal}
        showProjects={showProjects}
        confirmDeleteProject={confirmDeleteProject}
        onToggleProjects={() => setShowProjects(v => !v)}
        onStopPropagation={e => e.stopPropagation()}
        onOpenTemplates={() => setShowTemplates(true)}
        onExportPdf={handleExportPdf}
        onOpenClientView={() => setShowClientView(true)}
        onRequestDeleteProject={setConfirmDeleteProject}
        onConfirmDeleteProject={handleDeleteProject}
        onCancelDeleteProject={() => setConfirmDeleteProject(null)}
      />

      <div className="flex-1 overflow-auto scrollbar-thin p-6 space-y-4">
        {project.blocks.map((block, idx) => (
          <CalcBlock
            key={block.id}
            block={block}
            projectId={project.id}
            currency={store.settings.currency}
            isFirst={idx === 0}
            isLast={idx === project.blocks.length - 1}
            isEditingName={editingBlockId === block.id}
            editingName={editingBlockName}
            onStartEditName={() => { setEditingBlockId(block.id); setEditingBlockName(block.name); }}
            onEditNameChange={setEditingBlockName}
            onFinishEditName={() => handleFinishEditName(block.id, block.name)}
            onOpenSettings={() => setBlockSettingsId(block.id)}
            onMoveUp={() => store.moveBlock(project.id, block.id, 'up')}
            onMoveDown={() => store.moveBlock(project.id, block.id, 'down')}
          />
        ))}

        <button
          onClick={() => store.addBlock(project.id)}
          className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-[hsl(var(--surface-3))] rounded text-sm text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold transition-all w-full justify-center"
        >
          <Icon name="Plus" size={14} /> Добавить блок материалов
        </button>

        {/* Summary */}
        <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))]">Итоговая сводка</span>
            <button
              onClick={() => setShowSummarySettings(v => !v)}
              className={`flex items-center gap-1 text-xs transition-colors ${showSummarySettings ? 'text-gold' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}
              title="Настроить видимость строк"
            >
              <Icon name="SlidersHorizontal" size={12} />
              <span>Настроить</span>
            </button>
          </div>

          {/* Настройки видимости */}
          {showSummarySettings && (
            <div className="mb-3 p-3 bg-[hsl(220,12%,14%)] rounded border border-border space-y-2">
              <div className="text-xs text-[hsl(var(--text-muted))] mb-1">Показывать строки:</div>
              {([
                { key: 'blocks',      label: 'Блоки материалов' },
                { key: 'services',    label: 'Услуги' },
                { key: 'blockMarkups',label: 'Наценки на блоки' },
                { key: 'totalMarkup', label: 'Наценка на итог' },
                { key: 'percent',     label: 'Процентные расходы' },
                { key: 'fixed',       label: 'Постоянные расходы' },
              ] as { key: SummaryVisKey; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSummaryVis(v => ({ ...v, [key]: !v[key] }))}
                  className="flex items-center gap-2 w-full text-left text-xs hover:text-foreground transition-colors"
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${summaryVis[key] ? 'bg-gold border-gold' : 'border-border'}`}>
                    {summaryVis[key] && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
                  </span>
                  <span className={summaryVis[key] ? 'text-foreground' : 'text-[hsl(var(--text-muted))]'}>{label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {summaryVis.blocks && totals.blockExtras.map(b => {
              if (b.base <= 0) return null;
              return (
                <div key={b.blockId}>
                  <div className="flex justify-between text-sm text-[hsl(var(--text-dim))]">
                    <span>{b.blockName}</span>
                    <span className="font-mono">{fmt(b.base)} {store.settings.currency}</span>
                  </div>
                  {summaryVis.blockMarkups && b.extra > 0 && (
                    <div className="flex justify-between text-xs text-gold pl-3">
                      <span>+ наценка на блок</span>
                      <span className="font-mono">+{fmt(b.extra)} {store.settings.currency}</span>
                    </div>
                  )}
                </div>
              );
            })}
            {summaryVis.services && (
              <div className="flex justify-between text-sm text-[hsl(var(--text-dim))] border-t border-border pt-2">
                <span>Услуги</span>
                <span className="font-mono">{fmt(totalServices)} {store.settings.currency}</span>
              </div>
            )}
            {summaryVis.totalMarkup && totals.totalMarkupAmount > 0 && (
              <div className="flex justify-between text-sm text-gold">
                <span>Наценка на итог ({totals.totalMarkupPct}%)</span>
                <span className="font-mono">+{fmt(totals.totalMarkupAmount)} {store.settings.currency}</span>
              </div>
            )}
            {summaryVis.percent && totals.percentAmount > 0 && (
              <div className="flex justify-between text-sm text-[hsl(200,60%,70%)]">
                <span>Процентные расходы</span>
                <span className="font-mono">+{fmt(totals.percentAmount)} {store.settings.currency}</span>
              </div>
            )}
            {summaryVis.fixed && totals.fixedAmount > 0 && (
              <div className="flex justify-between text-sm text-[hsl(var(--text-dim))]">
                <span>Постоянные расходы</span>
                <span className="font-mono">+{fmt(totals.fixedAmount)} {store.settings.currency}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold border-t border-border pt-2">
              <span>Итого</span>
              <span className="font-mono text-gold">{fmt(grandTotal)} {store.settings.currency}</span>
            </div>
          </div>
        </div>
      </div>

      {blockSettingsId && (
        <CalcBlockSettings
          blockId={blockSettingsId}
          projectId={project.id}
          onClose={() => setBlockSettingsId(null)}
        />
      )}

      {showTemplates && (
        <TemplatesPanel
          projectId={project.id}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {showClientView && (
        <ClientViewPanel
          projectId={project.id}
          onClose={() => setShowClientView(false)}
          onExportPdf={handleExportPdf}
        />
      )}
    </div>
  );
}