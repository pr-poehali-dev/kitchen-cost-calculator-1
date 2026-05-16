import type { Project, ExpenseItem, AppState } from './types';

export type CalcSettings = Pick<AppState['settings'], 'markupMaterial' | 'markupService'>;

/**
 * Рассчитывает розничную цену с наценкой.
 * Логика: если есть статьи типа 'markup' для данного applyTo — суммируем их.
 * Если все отключены — возвращаем basePrice без изменений.
 * Если статей нет вовсе — применяем fallback из настроек.
 */
export function calcPriceWithMarkup(
  basePrice: number,
  expenses: ExpenseItem[],
  settings: CalcSettings,
  applyTo: 'materials' | 'services' = 'materials',
): number {
  const allMarkupItems = expenses.filter(e => e.type === 'markup' && e.applyTo === applyTo);
  const activeMarkupItems = allMarkupItems.filter(e => e.enabled !== false);
  if (allMarkupItems.length > 0) {
    if (activeMarkupItems.length === 0) return basePrice;
    const totalMarkupPct = activeMarkupItems.reduce((s, e) => s + e.value, 0);
    return Math.round(basePrice * (1 + totalMarkupPct / 100));
  }
  const fallback = applyTo === 'materials' ? settings.markupMaterial : settings.markupService;
  return Math.round(basePrice * (1 + fallback / 100));
}

/**
 * Рассчитывает итоги проекта: материалы, услуги, наценки, расходы, итог.
 */
export function calcProjectTotals(project: Project, expenses: ExpenseItem[]) {
  const activeExpenses = expenses.filter(e => e.enabled !== false);
  const rowValid = (r: { name: string }) => r.name.trim() !== '';

  const rawMaterials = project.blocks.reduce(
    (sum, b) => sum + b.rows.filter(rowValid).reduce((s, r) => s + r.qty * r.price, 0),
    0,
  );
  const rawServices = project.serviceBlocks.reduce(
    (sum, b) => sum + b.rows.filter(rowValid).reduce((s, r) => s + r.qty * r.price, 0),
    0,
  );
  const base = rawMaterials + rawServices;

  const totalMarkupItems = activeExpenses.filter(e => e.type === 'markup' && e.applyTo === 'total');
  const totalMarkupPct = totalMarkupItems.reduce((s, e) => s + e.value, 0);
  const totalMarkupAmount = Math.round(base * totalMarkupPct / 100);

  const blockExtras = project.blocks.map(b => {
    const blockBase = b.rows.filter(rowValid).reduce((s, r) => s + r.qty * r.price, 0);
    const blockMarkups = activeExpenses.filter(
      e => e.type === 'markup' && e.applyTo === 'block' && (e.blockIds || []).includes(b.id),
    );
    const extraPct = blockMarkups.reduce((s, e) => s + e.value, 0);
    return { blockId: b.id, blockName: b.name, base: blockBase, extra: Math.round(blockBase * extraPct / 100) };
  });
  const blockExtraTotal = blockExtras.reduce((s, b) => s + b.extra, 0);

  const baseForOverhead = base + totalMarkupAmount + blockExtraTotal;

  const percentAmount = Math.round(
    activeExpenses.filter(e => e.type === 'percent').reduce((s, e) => s + baseForOverhead * e.value / 100, 0),
  );
  const fixedAmount = activeExpenses.filter(e => e.type === 'fixed').reduce((s, e) => s + e.value, 0);

  return {
    rawMaterials,
    rawServices,
    base,
    baseForOverhead,
    totalMarkupAmount,
    totalMarkupPct,
    percentAmount,
    fixedAmount,
    blockExtraTotal,
    blockExtras,
    grandTotal: baseForOverhead + percentAmount + fixedAmount,
    activeExpenses,
  };
}
