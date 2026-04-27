import { useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import CalcHeader from './calc/CalcHeader';
import CalcBlock from './calc/CalcBlock';
import CalcBlockSettings from './calc/CalcBlockSettings';
import CalcSummary from './calc/CalcSummary';
import TemplatesPanel from './calc/TemplatesPanel';
import ClientViewPanel from './calc/ClientViewPanel';
import { exportProjectPdf } from './calc/exportPdf';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CalcBlock as CalcBlockType } from '@/store/types';
import ComparePanel from './calc/ComparePanel';

function SortableBlock({ block, ...props }: {
  block: CalcBlockType;
  projectId: string;
  currency: string;
  isFirst: boolean;
  isLast: boolean;
  isEditingName: boolean;
  editingName: string;
  allBlocks: { id: string; name: string }[];
  onStartEditName: () => void;
  onEditNameChange: (v: string) => void;
  onFinishEditName: () => void;
  onOpenSettings: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <CalcBlock
        {...props}
        block={block}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

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
  const [refreshed, setRefreshed] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!project) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldOrder = project.blocks.map(b => b.id);
    const oldIdx = oldOrder.indexOf(active.id as string);
    const newIdx = oldOrder.indexOf(over.id as string);
    const newOrder = arrayMove(oldOrder, oldIdx, newIdx);
    store.reorderBlocks(project.id, newOrder);
  };

  const handleRefreshPrices = () => {
    store.refreshProjectPrices(project!.id);
    setRefreshed(true);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => setRefreshed(false), 2500);
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-[hsl(var(--text-muted))] text-sm">Нет активного проекта</p>
        <button onClick={() => store.createProject()} className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded font-medium text-sm hover:opacity-90">
          <Icon name="Plus" size={14} /> Создать проект
        </button>
      </div>
    );
  }

  const totals = store.calcProjectTotals(project);
  const { rawMaterials: totalMaterials, rawServices: totalServices, base: baseTotal, grandTotal } = totals;
  const totalPurchase = project.blocks.reduce((sum, b) =>
    sum + b.rows.reduce((s, r) => s + (r.basePrice ?? 0) * r.qty, 0), 0);

  const handleFinishEditName = (blockId: string, blockName: string) => {
    store.updateBlock(project.id, blockId, { name: editingBlockName || blockName });
    setEditingBlockId(null);
  };

  const handleExportPdf = () => {
    exportProjectPdf({
      project, currency: store.settings.currency, totals,
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
        totalPurchase={totalPurchase}
        showProjects={showProjects}
        confirmDeleteProject={confirmDeleteProject}
        onToggleProjects={() => setShowProjects(v => !v)}
        onStopPropagation={e => e.stopPropagation()}
        onOpenTemplates={() => setShowTemplates(true)}
        onExportPdf={handleExportPdf}
        onOpenClientView={() => setShowClientView(true)}
        onOpenCompare={store.projects.length > 1 ? () => setShowCompare(true) : undefined}
        onRequestDeleteProject={setConfirmDeleteProject}
        onConfirmDeleteProject={handleDeleteProject}
        onCancelDeleteProject={() => setConfirmDeleteProject(null)}
      />

      <div className="flex-1 overflow-auto scrollbar-thin p-6 space-y-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={project.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            {project.blocks.map((block, idx) => (
              <SortableBlock
                key={block.id}
                block={block}
                projectId={project.id}
                currency={store.settings.currency}
                isFirst={idx === 0}
                isLast={idx === project.blocks.length - 1}
                isEditingName={editingBlockId === block.id}
                editingName={editingBlockName}
                allBlocks={project.blocks.map(b => ({ id: b.id, name: b.name }))}
                onStartEditName={() => { setEditingBlockId(block.id); setEditingBlockName(block.name); }}
                onEditNameChange={setEditingBlockName}
                onFinishEditName={() => handleFinishEditName(block.id, block.name)}
                onOpenSettings={() => setBlockSettingsId(block.id)}
                onMoveUp={() => store.moveBlock(project.id, block.id, 'up')}
                onMoveDown={() => store.moveBlock(project.id, block.id, 'down')}
              />
            ))}
          </SortableContext>
        </DndContext>

        <button
          onClick={() => store.addBlock(project.id)}
          className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-[hsl(var(--surface-3))] rounded text-sm text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold transition-all w-full justify-center"
        >
          <Icon name="Plus" size={14} /> Добавить блок материалов
        </button>

        <div className="flex items-center justify-between px-4 py-3 bg-[hsl(220,14%,11%)] rounded border border-border">
          <div className="text-sm text-[hsl(var(--text-dim))]">
            <span className="font-medium text-foreground">Обновить розничные цены</span>
            <span className="ml-2 text-xs text-[hsl(var(--text-muted))]">— пересчитать по текущим наценкам из Расходов</span>
          </div>
          <button
            onClick={handleRefreshPrices}
            className={`flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition-all shrink-0 ${
              refreshed ? 'bg-[hsl(140,50%,35%)] text-white' : 'bg-[hsl(220,12%,20%)] text-foreground hover:bg-gold hover:text-[hsl(220,16%,8%)]'
            }`}
          >
            <Icon name={refreshed ? 'Check' : 'RefreshCw'} size={14} />
            {refreshed ? 'Обновлено' : 'Применить'}
          </button>
        </div>

        <CalcSummary
          project={project}
          totals={totals}
          totalServices={totalServices}
          grandTotal={grandTotal}
          hiddenRows={hiddenSummaryRows}
          showSettings={showSummarySettings}
          onToggleSettings={() => setShowSummarySettings(v => !v)}
          onToggleRow={id => setHiddenSummaryRows(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })}
          onShowAll={() => setHiddenSummaryRows(new Set())}
        />
      </div>

      {blockSettingsId && (
        <CalcBlockSettings blockId={blockSettingsId} projectId={project.id} onClose={() => setBlockSettingsId(null)} />
      )}
      {showTemplates && (
        <TemplatesPanel projectId={project.id} onClose={() => setShowTemplates(false)} />
      )}
      {showClientView && (
        <ClientViewPanel projectId={project.id} onClose={() => setShowClientView(false)} onExportPdf={handleExportPdf} />
      )}
      {showCompare && (
        <ComparePanel currentProjectId={project.id} onClose={() => setShowCompare(false)} />
      )}
    </div>
  );
}