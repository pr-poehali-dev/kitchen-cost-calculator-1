import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { ServiceBlock } from '@/store/types';
import Icon from '@/components/ui/icon';
import ServiceRowComponent from './services/ServiceRowComponent';
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

const fmt = (n: number) =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function SortableServiceRow({
  row, projectId, blockId, currency, services, store,
}: {
  row: ReturnType<typeof useStore>['projects'][0]['serviceBlocks'][0]['rows'][0];
  projectId: string; blockId: string; currency: string;
  services: ReturnType<typeof useStore>['services'];
  store: ReturnType<typeof useStore>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch">
      <div
        {...attributes}
        {...listeners}
        className="flex items-center px-2 text-[hsl(var(--text-muted))] hover:text-gold cursor-grab active:cursor-grabbing border-r border-[hsl(220,12%,14%)] shrink-0"
      >
        <Icon name="GripVertical" size={12} />
      </div>
      <div className="flex-1 min-w-0">
        <ServiceRowComponent
          row={row}
          currency={currency}
          services={services}
          onUpdate={(data) => store.updateServiceRow(projectId, blockId, row.id, data)}
          onDelete={() => store.deleteServiceRow(projectId, blockId, row.id)}
          onApplyService={(svId) => {
            const sv = store.services.find(s => s.id === svId);
            if (!sv) return;
            store.updateServiceRow(projectId, blockId, row.id, {
              serviceId: sv.id, name: sv.name, unit: sv.unit,
              price: store.calcPriceWithMarkup(sv.basePrice, 'services'),
            });
          }}
        />
      </div>
    </div>
  );
}

function ServiceBlockCard({ block, projectId }: { block: ServiceBlock; projectId: string }) {
  const store = useStore();
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(block.name);
  const [collapsed, setCollapsed] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const blockTotal = block.rows.reduce((s, r) => s + r.qty * r.price, 0);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldOrder = block.rows.map(r => r.id);
    const oldIdx = oldOrder.indexOf(active.id as string);
    const newIdx = oldOrder.indexOf(over.id as string);
    store.reorderServiceRows(projectId, block.id, arrayMove(oldOrder, oldIdx, newIdx));
  };

  return (
    <div className="bg-[hsl(220,14%,11%)] rounded border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setCollapsed(v => !v)}
            className="text-[hsl(var(--text-muted))] hover:text-gold transition-colors shrink-0"
          >
            <Icon name={collapsed ? 'ChevronRight' : 'ChevronDown'} size={13} />
          </button>

          {editingName ? (
            <input
              autoFocus
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={() => { store.updateServiceBlock(projectId, block.id, { name: nameVal || block.name }); setEditingName(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { store.updateServiceBlock(projectId, block.id, { name: nameVal || block.name }); setEditingName(false); } }}
              className="bg-transparent border-b border-gold outline-none text-sm font-semibold text-foreground min-w-0"
            />
          ) : (
            <button
              onClick={() => { setEditingName(true); setNameVal(block.name); }}
              className="text-sm font-semibold text-foreground hover:text-gold transition-colors flex items-center gap-1.5 truncate"
            >
              {block.name}
              <Icon name="Pencil" size={10} className="opacity-30 shrink-0" />
            </button>
          )}

          {collapsed && block.rows.length > 0 && (
            <span className="text-xs text-[hsl(var(--text-muted))]">{block.rows.length} строк</span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[hsl(var(--text-muted))] text-sm font-mono">{fmt(blockTotal)} {store.settings.currency}</span>
          <button
            onClick={() => store.duplicateServiceBlock(projectId, block.id)}
            className="text-[hsl(var(--text-muted))] hover:text-foreground transition-colors"
            title="Дублировать блок"
          >
            <Icon name="Copy" size={13} />
          </button>
          <button
            onClick={() => store.deleteServiceBlock(projectId, block.id)}
            className="text-[hsl(var(--text-muted))] hover:text-destructive transition-colors"
          >
            <Icon name="Trash2" size={13} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Column header */}
          <div
            className="grid text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider pl-10 pr-4 py-2 border-b border-border"
            style={{ gridTemplateColumns: '2fr 1fr 0.8fr 1fr 1fr 28px' }}
          >
            <span>Наименование</span>
            <span>Категория</span>
            <span>Ед. изм.</span>
            <span className="text-right">Кол-во</span>
            <span className="text-right">Цена / Сумма</span>
            <span />
          </div>

          {/* Rows with DnD */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={block.rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
              {block.rows.map(row => (
                <SortableServiceRow
                  key={row.id}
                  row={row}
                  projectId={projectId}
                  blockId={block.id}
                  currency={store.settings.currency}
                  services={store.services}
                  store={store}
                />
              ))}
            </SortableContext>
          </DndContext>

          <div className="px-4 py-2">
            <button
              onClick={() => store.addServiceRow(projectId, block.id)}
              className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
            >
              <Icon name="Plus" size={12} /> Добавить строку
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ServicesPage() {
  const store = useStore();
  const project = store.getActiveProject();

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[hsl(var(--text-muted))] text-sm">Нет активного проекта. Перейдите в раздел «Расчёт».</p>
      </div>
    );
  }

  const grandTotal = project.serviceBlocks.reduce((sum, block) =>
    sum + block.rows.reduce((s, r) => s + r.qty * r.price, 0), 0
  );

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground">Услуги</h1>
          <p className="text-[hsl(var(--text-muted))] text-xs mt-0.5">{project.object} · {project.client}</p>
        </div>
        <div className="text-right">
          <div className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider">Итого услуг</div>
          <div className="text-gold font-mono font-semibold text-lg">{fmt(grandTotal)} {store.settings.currency}</div>
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-6 space-y-4">
        {project.serviceBlocks.map(block => (
          <ServiceBlockCard key={block.id} block={block} projectId={project.id} />
        ))}

        <button
          onClick={() => store.addServiceBlock(project.id)}
          className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-[hsl(var(--surface-3))] rounded text-sm text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold transition-all w-full justify-center"
        >
          <Icon name="Plus" size={14} /> Добавить блок услуг
        </button>
      </div>
    </div>
  );
}
