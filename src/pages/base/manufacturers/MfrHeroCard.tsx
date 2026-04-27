import { useStore } from '@/store/useStore';
import type { Manufacturer } from '@/store/types';
import Icon from '@/components/ui/icon';

interface Props {
  manufacturer: Manufacturer;
  mfrMaterialsCount: number;
  onEdit: () => void;
  onDelete: () => void;
}

export default function MfrHeroCard({ manufacturer, mfrMaterialsCount, onEdit, onDelete }: Props) {
  const store = useStore();

  return (
    <div className="bg-[hsl(220,14%,11%)] rounded-lg border border-border overflow-hidden">
      {/* Top accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-gold/60 via-gold/30 to-transparent" />
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-gold">{manufacturer.name.charAt(0).toUpperCase()}</span>
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold leading-tight">{manufacturer.name}</h2>
                <div className="flex flex-col gap-1 mt-1.5">
                  {manufacturer.contact && (
                    <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--text-dim))]">
                      <Icon name="User" size={12} className="text-[hsl(var(--text-muted))] shrink-0" />
                      {manufacturer.contact}
                    </div>
                  )}
                  {manufacturer.phone && (
                    <a href={`tel:${manufacturer.phone.replace(/\D/g,'')}`} className="flex items-center gap-1.5 text-sm text-[hsl(var(--text-dim))] hover:text-gold transition-colors">
                      <Icon name="Phone" size={12} className="text-[hsl(var(--text-muted))] shrink-0" />
                      {manufacturer.phone}
                    </a>
                  )}
                  {(manufacturer as Manufacturer).email && (
                    <a href={`mailto:${(manufacturer as Manufacturer).email}`} className="flex items-center gap-1.5 text-sm text-[hsl(var(--text-dim))] hover:text-gold transition-colors">
                      <Icon name="Mail" size={12} className="text-[hsl(var(--text-muted))] shrink-0" />
                      {(manufacturer as Manufacturer).email}
                    </a>
                  )}
                  {(manufacturer as Manufacturer).telegram && (
                    <a href={`https://t.me/${((manufacturer as Manufacturer).telegram || '').replace('@','')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-[hsl(var(--text-dim))] hover:text-sky-400 transition-colors">
                      <Icon name="Send" size={12} className="text-[hsl(var(--text-muted))] shrink-0" />
                      {(manufacturer as Manufacturer).telegram}
                    </a>
                  )}
                  {(manufacturer as Manufacturer).website && (
                    <a href={(manufacturer as Manufacturer).website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-[hsl(var(--text-dim))] hover:text-gold transition-colors">
                      <Icon name="Globe" size={12} className="text-[hsl(var(--text-muted))] shrink-0" />
                      {(manufacturer as Manufacturer).website}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={onEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[hsl(220,12%,16%)] border border-border rounded-lg hover:border-gold/50 hover:text-gold text-[hsl(var(--text-dim))] transition-all">
                  <Icon name="Pencil" size={11} /> Изменить
                </button>
                <button onClick={onDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[hsl(220,12%,16%)] border border-border rounded-lg hover:border-destructive/50 hover:text-destructive text-[hsl(var(--text-muted))] transition-all">
                  <Icon name="Trash2" size={11} />
                </button>
              </div>
            </div>
            {manufacturer.note && (
              <div className="mt-2 text-xs text-[hsl(var(--text-muted))] italic bg-[hsl(220,12%,14%)] rounded px-3 py-1.5 border-l-2 border-gold/30">
                {manufacturer.note}
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
          <div className="bg-[hsl(220,12%,14%)] rounded-lg px-3 py-2.5 text-center">
            <div className="text-lg font-bold text-gold">{mfrMaterialsCount}</div>
            <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">позиций</div>
          </div>
          <div className="bg-[hsl(220,12%,14%)] rounded-lg px-3 py-2.5 text-center">
            <div className="text-lg font-bold text-foreground">{(manufacturer.materialTypeIds || []).length}</div>
            <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">типов</div>
          </div>
          <div className="bg-[hsl(220,12%,14%)] rounded-lg px-3 py-2.5 text-center">
            <div className="text-lg font-bold text-foreground">
              {new Set(
                store.materials.filter(m => m.manufacturerId === manufacturer.id).map(m => m.vendorId).filter(Boolean)
              ).size || '—'}
            </div>
            <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">поставщ.</div>
          </div>
        </div>

        {/* Types */}
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Типы выпускаемой продукции</div>
          <div className="flex flex-wrap gap-1.5">
            {manufacturer.materialTypeIds?.length > 0
              ? manufacturer.materialTypeIds.map(tid => {
                  const t = store.getTypeById(tid);
                  return t ? (
                    <span key={tid} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[hsl(220,16%,8%)]"
                      style={{ backgroundColor: t.color || '#888' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-[hsl(220,16%,8%)]/30" />
                      {t.name}
                    </span>
                  ) : null;
                })
              : <span className="text-xs text-[hsl(var(--text-muted))] italic">Не указаны</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

