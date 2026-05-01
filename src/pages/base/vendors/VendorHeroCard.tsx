import { useStore } from '@/store/useStore';
import { useCatalog } from '@/hooks/useCatalog';
import type { Vendor, Material, MaterialType } from '@/store/types';
import Icon from '@/components/ui/icon';

function ContactRow({ icon, value, href }: { icon: string; value: string; href?: string }) {
  const cls = 'flex items-center gap-1.5 text-sm text-[hsl(var(--text-dim))]';
  return (
    <div className={cls}>
      <Icon name={icon} size={12} className="text-[hsl(var(--text-muted))] shrink-0" />
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors truncate">{value}</a>
      ) : (
        <span className="truncate">{value}</span>
      )}
    </div>
  );
}

interface MfrGroup {
  manufacturer: { id: string; name: string };
  materials: Material[];
}

interface Props {
  vendor: Vendor;
  vendorMaterialsCount: number;
  mfrWithMaterials: MfrGroup[];
  allTypes: MaterialType[];
  onEditVendor: () => void;
  onDeleteVendor: () => void;
  onAddMaterial: (patch: Partial<Material>) => void;
}

export default function VendorHeroCard({
  vendor,
  vendorMaterialsCount,
  mfrWithMaterials,
  allTypes,
  onEditVendor,
  onDeleteVendor,
  onAddMaterial,
}: Props) {
  const store = useStore();
  const catalog = useCatalog();
  const availableMfrs = catalog.manufacturers;

  return (
    <div className="bg-[hsl(220,14%,11%)] rounded-lg border border-border overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-[hsl(200,60%,40%)]/60 via-[hsl(200,60%,40%)]/20 to-transparent" />
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-xl bg-[hsl(200,30%,15%)] border border-[hsl(200,40%,25%)]/40 flex items-center justify-center shrink-0">
            <Icon name="Truck" size={24} className="text-[hsl(200,60%,55%)]" />
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold leading-tight">{vendor.name}</h2>
                <div className="flex flex-col gap-1 mt-1.5">
                  {vendor.contact && <ContactRow icon="User" value={vendor.contact} />}
                  {vendor.phone && <ContactRow icon="Phone" value={vendor.phone} href={`tel:${vendor.phone.replace(/\D/g,'')}`} />}
                  {vendor.email && <ContactRow icon="Mail" value={vendor.email} href={`mailto:${vendor.email}`} />}
                  {vendor.telegram && <ContactRow icon="Send" value={vendor.telegram} href={`https://t.me/${vendor.telegram.replace('@','')}`} />}
                  {vendor.website && <ContactRow icon="Globe" value={vendor.website} href={vendor.website} />}
                </div>
                {/* Логистика */}
                {(vendor.deliveryDays || vendor.minOrderAmount || vendor.deliverySchedule) && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {vendor.deliveryDays && (
                      <span className="flex items-center gap-1 text-xs bg-[hsl(220,12%,16%)] px-2 py-1 rounded border border-border text-[hsl(var(--text-dim))]">
                        <Icon name="Clock" size={11} className="text-[hsl(var(--text-muted))]" />
                        Срок: {vendor.deliveryDays} дн.
                      </span>
                    )}
                    {vendor.minOrderAmount && (
                      <span className="flex items-center gap-1 text-xs bg-[hsl(220,12%,16%)] px-2 py-1 rounded border border-border text-[hsl(var(--text-dim))]">
                        <Icon name="ShoppingCart" size={11} className="text-[hsl(var(--text-muted))]" />
                        Мин.: {vendor.minOrderAmount.toLocaleString('ru')} ₽
                      </span>
                    )}
                    {vendor.deliverySchedule && (
                      <span className="flex items-center gap-1 text-xs bg-[hsl(220,12%,16%)] px-2 py-1 rounded border border-border text-[hsl(var(--text-dim))]">
                        <Icon name="CalendarDays" size={11} className="text-[hsl(var(--text-muted))]" />
                        {vendor.deliverySchedule}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={onEditVendor}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[hsl(220,12%,16%)] border border-border rounded-lg hover:border-gold/50 hover:text-gold text-[hsl(var(--text-dim))] transition-all">
                  <Icon name="Pencil" size={11} /> Изменить
                </button>
                <button
                  onClick={() => { if (window.confirm(`Удалить поставщика «${vendor.name}»?`)) onDeleteVendor(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[hsl(220,12%,16%)] border border-border rounded-lg hover:border-destructive/50 hover:text-destructive text-[hsl(var(--text-muted))] transition-all">
                  <Icon name="Trash2" size={11} />
                </button>
              </div>
            </div>
            {vendor.note && (
              <div className="mt-2 text-xs text-[hsl(var(--text-muted))] italic bg-[hsl(220,12%,14%)] rounded px-3 py-1.5 border-l-2 border-[hsl(200,60%,40%)]/40">
                {vendor.note}
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
          <div className="bg-[hsl(220,12%,14%)] rounded-lg px-3 py-2.5 text-center">
            <div className="text-lg font-bold text-gold">{vendorMaterialsCount}</div>
            <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">позиций</div>
          </div>
          <div className="bg-[hsl(220,12%,14%)] rounded-lg px-3 py-2.5 text-center">
            <div className="text-lg font-bold text-foreground">{mfrWithMaterials.length}</div>
            <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">брендов</div>
          </div>
          <div className="bg-[hsl(220,12%,14%)] rounded-lg px-3 py-2.5 text-center">
            <div className="text-lg font-bold text-foreground">{(vendor.materialTypeIds || []).length}</div>
            <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">типов</div>
          </div>
        </div>

        {/* Types */}
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Типы поставляемых материалов</div>
          <div className="flex flex-wrap gap-1.5">
            {vendor.materialTypeIds?.length > 0
              ? vendor.materialTypeIds.map(tid => {
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

        {/* Manufacturers linked */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Производители в ассортименте</div>
          {mfrWithMaterials.length === 0 ? (
            <p className="text-xs text-[hsl(var(--text-muted))]">Пока нет — добавьте материал ниже</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {mfrWithMaterials.map(({ manufacturer, materials: mats }) => (
                <div key={manufacturer.id} className="flex items-center gap-1.5 bg-[hsl(220,12%,16%)] rounded px-2.5 py-1.5">
                  <Icon name="Building2" size={11} className="text-[hsl(var(--text-dim))]" />
                  <span className="text-xs font-medium text-foreground">{manufacturer.name}</span>
                  <span className="text-xs text-[hsl(var(--text-muted))]">{mats.length} поз.</span>
                  <button
                    onClick={() => onAddMaterial({
                      manufacturerId: manufacturer.id,
                      vendorId: vendor.id,
                      unit: 'м²',
                      typeId: allTypes[0]?.id,
                      basePrice: 0,
                    })}
                    className="text-[hsl(var(--text-muted))] hover:text-gold transition-colors ml-1"
                    title={`Добавить материал от ${manufacturer.name}`}
                  >
                    <Icon name="Plus" size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add manufacturer button */}
          <div className="mt-2">
            <div className="text-xs text-[hsl(var(--text-muted))] mb-1.5">Добавить материал от производителя:</div>
            <div className="flex flex-wrap gap-1.5">
              {availableMfrs
                .filter(mfr => !mfrWithMaterials.some(g => g.manufacturer.id === mfr.id))
                .map(mfr => (
                  <button
                    key={mfr.id}
                    onClick={() => onAddMaterial({
                      manufacturerId: mfr.id,
                      vendorId: vendor.id,
                      unit: 'м²',
                      typeId: allTypes[0]?.id,
                      basePrice: 0,
                    })}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-[hsl(var(--surface-3))] rounded text-xs text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold transition-all"
                  >
                    <Icon name="Plus" size={11} />
                    {mfr.name}
                  </button>
                ))
              }
              {availableMfrs.length === 0 && (
                <span className="text-xs text-[hsl(var(--text-muted))]">Нет производителей — добавьте в разделе «Производители»</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}