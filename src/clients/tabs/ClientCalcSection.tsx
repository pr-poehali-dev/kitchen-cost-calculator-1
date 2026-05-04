import Icon from '@/components/ui/icon';
import type { Client } from '../types';
import { Section } from '../ClientCardShared';
import { useStore } from '@/store/useStore';
import { clientFullName } from '../types';

export function ClientCalcSection({ client, onChange, onOpenCalc, onGoToDocuments }: {
  client: Client;
  onChange: (f: keyof Client, v: unknown) => void;
  onOpenCalc?: (projectId?: string) => void;
  onGoToDocuments?: (patch: { products: { id: string; name: string; qty: number }[]; total_amount: number }) => void;
}) {
  const store = useStore();
  const linked = store.projects.filter(p => p.clientId === client.id);

  const createAndOpen = () => {
    const id = store.createProject();
    store.updateProjectInfo(id, {
      clientId: client.id,
      client: clientFullName(client),
      phone: client.phone || '',
      address: [client.delivery_city, client.delivery_street, client.delivery_house].filter(Boolean).join(', '),
    });
    onOpenCalc?.(id);
  };

  return (
    <Section title="Расчёты" icon="Calculator">
      {linked.length === 0 ? (
        <div className="text-xs text-[hsl(var(--text-muted))] py-1">
          Нет привязанных расчётов.{' '}
          {onOpenCalc && (
            <button onClick={createAndOpen} className="text-gold hover:underline">
              Создать расчёт →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {linked.map(p => {
            const total = store.calcProjectTotals(p).grandTotal;

            const handleMakeDocs = () => {
              const products = p.blocks
                .filter(b => b.rows.some(r => r.name.trim() && r.qty > 0))
                .map(b => ({ id: b.id, name: b.name, qty: 1 }));
              const finalProducts = products.length > 0
                ? products
                : [{ id: p.id, name: p.object || 'Изделие', qty: 1 }];

              onGoToDocuments?.({ products: finalProducts, total_amount: total });
            };

            return (
              <div
                key={p.id}
                className="px-3 py-2.5 bg-[hsl(220,12%,14%)] rounded-lg border border-transparent hover:border-border transition-colors group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon name="FileText" size={13} className="text-[hsl(var(--text-muted))] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.object || 'Без названия'}</div>
                      <div className="text-[10px] text-[hsl(var(--text-muted))]">{p.createdAt}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {total > 0 && (
                      <span className="text-sm font-mono text-gold">{total.toLocaleString('ru')} {store.settings.currency}</span>
                    )}
                    {onOpenCalc && (
                      <button
                        onClick={() => onOpenCalc(p.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-[hsl(var(--text-muted))] hover:text-gold px-2 py-1 rounded border border-border hover:border-gold/40"
                      >
                        <Icon name="ExternalLink" size={11} />
                        Открыть
                      </button>
                    )}
                  </div>
                </div>
                {onGoToDocuments && (
                  <button
                    onClick={handleMakeDocs}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-foreground bg-[hsl(220,12%,10%)] hover:bg-[hsl(220,12%,18%)] rounded border border-border hover:border-gold/30 transition-colors"
                  >
                    <Icon name="BookOpen" size={11} />
                    Сформировать документы
                    {total > 0 && (
                      <span className="ml-1 text-gold font-mono">{total.toLocaleString('ru')} {store.settings.currency}</span>
                    )}
                  </button>
                )}
              </div>
            );
          })}
          {onOpenCalc && (
            <button
              onClick={createAndOpen}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-[hsl(var(--text-muted))] hover:text-gold border border-dashed border-border hover:border-gold/40 rounded-lg transition-colors"
            >
              <Icon name="Plus" size={12} />
              Новый расчёт
            </button>
          )}
        </div>
      )}
    </Section>
  );
}