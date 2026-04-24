import { useState } from 'react';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import { fmt } from './calc/constants';
import CalcHeader from './calc/CalcHeader';
import CalcBlock from './calc/CalcBlock';
import CalcBlockSettings from './calc/CalcBlockSettings';

export default function CalcPage() {
  const store = useStore();
  const project = store.getActiveProject();
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingBlockName, setEditingBlockName] = useState('');
  const [blockSettingsId, setBlockSettingsId] = useState<string | null>(null);
  const [showProjects, setShowProjects] = useState(false);

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

  const totalMaterials = project.blocks.reduce((sum, b) =>
    sum + b.rows.reduce((s, r) => s + r.qty * r.price, 0), 0
  );
  const totalServices = project.serviceBlocks.reduce((sum, b) =>
    sum + b.rows.reduce((s, r) => s + r.qty * r.price, 0), 0
  );
  const total = totalMaterials + totalServices;

  const handleFinishEditName = (blockId: string, blockName: string) => {
    store.updateBlock(project.id, blockId, { name: editingBlockName || blockName });
    setEditingBlockId(null);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in" onClick={() => setShowProjects(false)}>
      <CalcHeader
        project={project}
        totalMaterials={totalMaterials}
        totalServices={totalServices}
        total={total}
        showProjects={showProjects}
        onToggleProjects={() => setShowProjects(v => !v)}
        onStopPropagation={e => e.stopPropagation()}
      />

      <div className="flex-1 overflow-auto scrollbar-thin p-6 space-y-4">
        {project.blocks.map(block => (
          <CalcBlock
            key={block.id}
            block={block}
            projectId={project.id}
            currency={store.settings.currency}
            isEditingName={editingBlockId === block.id}
            editingName={editingBlockName}
            onStartEditName={() => { setEditingBlockId(block.id); setEditingBlockName(block.name); }}
            onEditNameChange={setEditingBlockName}
            onFinishEditName={() => handleFinishEditName(block.id, block.name)}
            onOpenSettings={() => setBlockSettingsId(block.id)}
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
          <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-3">Итоговая сводка</div>
          <div className="space-y-2">
            {project.blocks.map(b => {
              const bt = b.rows.reduce((s, r) => s + r.qty * r.price, 0);
              return bt > 0 ? (
                <div key={b.id} className="flex justify-between text-sm text-[hsl(var(--text-dim))]">
                  <span>{b.name}</span>
                  <span className="font-mono">{fmt(bt)} {store.settings.currency}</span>
                </div>
              ) : null;
            })}
            <div className="flex justify-between text-sm text-[hsl(var(--text-dim))] border-t border-border pt-2">
              <span>Услуги</span>
              <span className="font-mono">{fmt(totalServices)} {store.settings.currency}</span>
            </div>
            <div className="flex justify-between text-base font-semibold border-t border-border pt-2">
              <span>Итого</span>
              <span className="font-mono text-gold">{fmt(total)} {store.settings.currency}</span>
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
    </div>
  );
}
