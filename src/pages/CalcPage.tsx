import { useState } from 'react';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import { fmt } from './calc/constants';
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
  const [hiddenSummaryRows, setHiddenSummaryRows] = useState<Set<string>>(new Set());
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
        {(() => {
          const cur = store.settings.currency;
          const groups = store.expenseGroups || [];
          const allExpenses = store.expenses;

          // Строим список строк сводки
          type SummaryRow = { id: string; label: string; value: number; sign?: '+'; color?: string; indent?: boolean };
          const rows: SummaryRow[] = [];

          // 1. Блоки материалов
          totals.blockExtras.forEach(b => {
            if (b.base <= 0) return;
            rows.push({ id: `block-${b.blockId}`, label: b.blockName, value: b.base });
            if (b.extra > 0) {
              rows.push({ id: `block-extra-${b.blockId}`, label: '+ наценка на блок', value: b.extra, sign: '+', color: 'gold', indent: true });
            }
          });

          // 2. Услуги
          if (totalServices > 0) {
            rows.push({ id: 'services', label: 'Услуги', value: totalServices });
          }

          // 3. Группы расходов из настроек
          const activeExp = allExpenses.filter(e => e.enabled !== false);

          // Наценки на итог (grouped)
          const totalMarkupItems = activeExp.filter(e => e.type === 'markup' && e.applyTo === 'total');
          if (totals.totalMarkupAmount > 0) {
            const groupIds = [...new Set(totalMarkupItems.map(e => e.groupId).filter(Boolean))];
            if (groupIds.length > 0) {
              groupIds.forEach(gid => {
                const grp = groups.find(g => g.id === gid);
                const items = totalMarkupItems.filter(e => e.groupId === gid);
                const pct = items.reduce((s, e) => s + e.value, 0);
                const amt = Math.round(totals.base * pct / 100);
                if (amt > 0) rows.push({ id: `totalMarkup-${gid}`, label: `${grp?.name ?? 'Наценка на итог'} (${pct}%)`, value: amt, sign: '+', color: 'gold' });
              });
              // Без группы
              const ungrouped = totalMarkupItems.filter(e => !e.groupId);
              if (ungrouped.length > 0) {
                const pct = ungrouped.reduce((s, e) => s + e.value, 0);
                const amt = Math.round(totals.base * pct / 100);
                if (amt > 0) rows.push({ id: 'totalMarkup-ug', label: `Наценка на итог (${pct}%)`, value: amt, sign: '+', color: 'gold' });
              }
            } else {
              rows.push({ id: 'totalMarkup', label: `Наценка на итог (${totals.totalMarkupPct}%)`, value: totals.totalMarkupAmount, sign: '+', color: 'gold' });
            }
          }

          // Процентные расходы по группам
          const percentItems = activeExp.filter(e => e.type === 'percent');
          if (percentItems.length > 0) {
            const byGroup: Record<string, typeof percentItems> = {};
            percentItems.forEach(e => {
              const key = e.groupId || '__ungrouped';
              byGroup[key] = [...(byGroup[key] || []), e];
            });
            Object.entries(byGroup).forEach(([gid, items]) => {
              const grp = gid !== '__ungrouped' ? groups.find(g => g.id === gid) : null;
              const pct = items.reduce((s, e) => s + e.value, 0);
              const amt = items.reduce((s, e) => s + Math.round(totals.base * e.value / 100), 0);
              rows.push({ id: `percent-${gid}`, label: `${grp?.name ?? 'Процентные расходы'} (${pct}%)`, value: amt, sign: '+', color: 'blue' });
            });
          }

          // Фиксированные расходы по группам
          const fixedItems = activeExp.filter(e => e.type === 'fixed');
          if (fixedItems.length > 0) {
            const byGroup: Record<string, typeof fixedItems> = {};
            fixedItems.forEach(e => {
              const key = e.groupId || '__ungrouped';
              byGroup[key] = [...(byGroup[key] || []), e];
            });
            Object.entries(byGroup).forEach(([gid, items]) => {
              const grp = gid !== '__ungrouped' ? groups.find(g => g.id === gid) : null;
              const amt = items.reduce((s, e) => s + e.value, 0);
              rows.push({ id: `fixed-${gid}`, label: grp?.name ?? 'Постоянные расходы', value: amt, sign: '+' });
            });
          }

          // Список строк для настроек
          const allRowIds = rows.map(r => r.id);
          const visibleRows = rows.filter(r => !hiddenSummaryRows.has(r.id));

          return (
            <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))]">Итоговая сводка</span>
                <button
                  onClick={() => setShowSummarySettings(v => !v)}
                  className={`flex items-center gap-1 text-xs transition-colors ${showSummarySettings ? 'text-gold' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}
                >
                  <Icon name="SlidersHorizontal" size={12} />
                  <span>Настроить</span>
                </button>
              </div>

              {showSummarySettings && (
                <div className="mb-3 p-3 bg-[hsl(220,12%,14%)] rounded border border-border space-y-1.5">
                  <div className="text-xs text-[hsl(var(--text-muted))] mb-2">Показывать строки:</div>
                  {rows.map(r => {
                    const hidden = hiddenSummaryRows.has(r.id);
                    return (
                      <button key={r.id}
                        onClick={() => setHiddenSummaryRows(prev => {
                          const next = new Set(prev);
                          if (next.has(r.id)) next.delete(r.id); else next.add(r.id);
                          return next;
                        })}
                        className="flex items-center gap-2 w-full text-left text-xs hover:text-foreground transition-colors"
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${!hidden ? 'bg-gold border-gold' : 'border-border'}`}>
                          {!hidden && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
                        </span>
                        <span className={`${r.indent ? 'pl-3' : ''} ${!hidden ? 'text-foreground' : 'text-[hsl(var(--text-muted))]'}`}>{r.label}</span>
                        <span className="ml-auto font-mono text-[hsl(var(--text-muted))]">{fmt(r.value)} {cur}</span>
                      </button>
                    );
                  })}
                  {allRowIds.length > 0 && (
                    <button onClick={() => setHiddenSummaryRows(new Set())} className="text-xs text-gold hover:underline mt-1">
                      Показать все
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                {visibleRows.map((r, i) => {
                  const isFirst = i === 0;
                  const isService = r.id === 'services';
                  const prevIsBlock = i > 0 && visibleRows[i - 1].id.startsWith('block-') && !visibleRows[i - 1].indent;
                  const addDivider = isService || (r.sign === '+' && (i === 0 || !visibleRows[i - 1]?.sign));
                  return (
                    <div key={r.id}
                      className={`flex justify-between text-sm ${r.indent ? 'pl-4' : ''} ${addDivider && !isFirst ? 'border-t border-border pt-1.5' : ''} ${
                        r.color === 'gold' ? 'text-gold' :
                        r.color === 'blue' ? 'text-[hsl(200,60%,70%)]' :
                        'text-[hsl(var(--text-dim))]'
                      }`}
                    >
                      <span>{r.label}</span>
                      <span className="font-mono shrink-0 ml-4">
                        {r.sign ? `+${fmt(r.value)}` : fmt(r.value)} {cur}
                      </span>
                    </div>
                  );
                })}
                <div className="flex justify-between text-base font-semibold border-t border-border pt-2 mt-1">
                  <span>Итого</span>
                  <span className="font-mono text-gold">{fmt(grandTotal)} {cur}</span>
                </div>
              </div>
            </div>
          );
        })()}
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