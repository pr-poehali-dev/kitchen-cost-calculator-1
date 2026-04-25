import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import { useClientCard } from './home/useClientCard';
import {
  ContractSection, ClientSection, ProductsSection,
  PaymentSection, TimelineSection, ResponsiblesSection,
} from './home/ClientSections';

export default function HomePage() {
  const store = useStore();
  const project = store.getActiveProject();
  const projectId = project?.id ?? null;

  const { card, set, addProduct, removeProduct, updateProduct } = useClientCard(projectId);

  const balanceDue =
    card.paymentType === '50% предоплата'
      ? Math.max(0, card.totalAmount - card.totalAmount * 0.5)
      : card.paymentType === 'Рассрочка'
      ? Math.max(0, card.totalAmount - card.partialPaid)
      : 0;

  const extraBalance = Math.max(0, card.extraServicesAmount - card.extraServicesPaid);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 animate-fade-in">
        <p className="text-[hsl(var(--text-muted))] text-sm">Нет активного проекта</p>
        <button onClick={() => store.createProject()} className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded font-medium text-sm hover:opacity-90">
          <Icon name="Plus" size={14} /> Создать проект
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4 flex items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-foreground">Главная</h1>
          <p className="text-[hsl(var(--text-muted))] text-xs mt-0.5 truncate">Карточка клиента для проекта</p>
        </div>
        <button onClick={() => store.createProject()} className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 shrink-0">
          <Icon name="Plus" size={14} /> Новый проект
        </button>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="px-6 py-6 max-w-3xl mx-auto space-y-4">
          <ContractSection card={card} set={set} />
          <ClientSection card={card} set={set} />
          <ProductsSection card={card} addProduct={addProduct} removeProduct={removeProduct} updateProduct={updateProduct} />
          <PaymentSection card={card} set={set} balanceDue={balanceDue} extraBalance={extraBalance} />
          <TimelineSection card={card} set={set} />
          <ResponsiblesSection card={card} set={set} />
        </div>
      </div>
    </div>
  );
}
