import { useState, useEffect, useCallback } from 'react';

export interface ProductItem { id: string; name: string; qty: number; }

export interface ClientCard {
  contractNumber: string;
  contractDate: string;
  clientInfo: string;
  phone: string;
  messenger: 'WhatsApp' | 'Telegram' | 'Viber' | 'Звонок';
  deliveryAddress: string;
  products: ProductItem[];
  totalAmount: number;
  paymentType: '100% предоплата' | '50% предоплата' | 'Рассрочка' | 'Своя схема';
  customPaymentScheme: string;
  partialPaid: number;
  assemblyAmount: number;
  extraServicesAmount: number;
  extraServicesPaymentType: 'Предоплата' | 'На сборке' | 'Частично';
  extraServicesPaid: number;
  deliveryDate: string;
  manufacturingPeriod: string;
  assemblyPeriod: string;
  designedBy: string;
  measuredBy: string;
}

export const defaultCard = (): ClientCard => ({
  contractNumber: '', contractDate: '', clientInfo: '', phone: '',
  messenger: 'WhatsApp', deliveryAddress: '', products: [],
  totalAmount: 0, paymentType: '100% предоплата', customPaymentScheme: '',
  partialPaid: 0, assemblyAmount: 0, extraServicesAmount: 0,
  extraServicesPaymentType: 'Предоплата', extraServicesPaid: 0,
  deliveryDate: '', manufacturingPeriod: '', assemblyPeriod: '',
  designedBy: '', measuredBy: '',
});

export function genId() { return Math.random().toString(36).slice(2, 10); }

export function useClientCard(projectId: string | null) {
  const [card, setCard] = useState<ClientCard>(() => {
    if (!projectId) return defaultCard();
    try {
      const saved = localStorage.getItem(`client-card-${projectId}`);
      if (saved) return JSON.parse(saved) as ClientCard;
    } catch { return defaultCard(); }
    return defaultCard();
  });

  useEffect(() => {
    if (!projectId) return;
    try {
      const saved = localStorage.getItem(`client-card-${projectId}`);
      setCard(saved ? (JSON.parse(saved) as ClientCard) : defaultCard());
    } catch { setCard(defaultCard()); }
  }, [projectId]);

  const save = useCallback((updated: ClientCard) => {
    if (!projectId) return;
    localStorage.setItem(`client-card-${projectId}`, JSON.stringify(updated));
  }, [projectId]);

  const set = <K extends keyof ClientCard>(key: K, value: ClientCard[K]) => {
    setCard(prev => { const next = { ...prev, [key]: value }; save(next); return next; });
  };

  const addProduct = () => {
    const updated = { ...card, products: [...card.products, { id: genId(), name: '', qty: 1 }] };
    setCard(updated); save(updated);
  };
  const removeProduct = (id: string) => {
    const updated = { ...card, products: card.products.filter(p => p.id !== id) };
    setCard(updated); save(updated);
  };
  const updateProduct = (id: string, field: 'name' | 'qty', value: string | number) => {
    const updated = { ...card, products: card.products.map(p => p.id === id ? { ...p, [field]: value } : p) };
    setCard(updated); save(updated);
  };

  return { card, set, addProduct, removeProduct, updateProduct };
}
