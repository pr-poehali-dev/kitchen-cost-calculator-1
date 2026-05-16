import { describe, it, expect } from 'vitest';
import { calcPriceWithMarkup, calcProjectTotals } from './calcUtils';
import type { ExpenseItem, Project } from './types';

// ─── Вспомогательные фабрики ──────────────────────────────────────────────────

const settings = { markupMaterial: 20, markupService: 15 };

function makeExpense(overrides: Partial<ExpenseItem>): ExpenseItem {
  return {
    id: 'e1',
    name: 'Тест',
    type: 'fixed',
    value: 0,
    enabled: true,
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    client: 'Тест',
    clientId: undefined,
    object: '',
    address: '',
    phone: '',
    messenger: 'Звонок',
    createdAt: '2026-01-01',
    blocks: [],
    serviceBlocks: [],
    ...overrides,
  };
}

function makeBlock(id: string, rows: { name: string; qty: number; price: number }[]) {
  return {
    id,
    name: `Блок ${id}`,
    allowedTypeIds: [],
    visibleColumns: [] as [],
    rows: rows.map((r, i) => ({
      id: `r${i}`,
      name: r.name,
      qty: r.qty,
      price: r.price,
      unit: 'шт',
    })),
  };
}

function makeServiceBlock(id: string, rows: { name: string; qty: number; price: number }[]) {
  return {
    id,
    name: `Услуга ${id}`,
    rows: rows.map((r, i) => ({
      id: `sr${i}`,
      name: r.name,
      qty: r.qty,
      price: r.price,
      unit: 'шт',
    })),
  };
}

// ─── calcPriceWithMarkup ──────────────────────────────────────────────────────

describe('calcPriceWithMarkup', () => {
  describe('когда есть статьи наценки', () => {
    it('применяет одну активную наценку на материалы', () => {
      const expenses = [makeExpense({ type: 'markup', applyTo: 'materials', value: 20 })];
      expect(calcPriceWithMarkup(100, expenses, settings, 'materials')).toBe(120);
    });

    it('применяет одну активную наценку на услуги', () => {
      const expenses = [makeExpense({ type: 'markup', applyTo: 'services', value: 15 })];
      expect(calcPriceWithMarkup(200, expenses, settings, 'services')).toBe(230);
    });

    it('суммирует несколько наценок', () => {
      const expenses = [
        makeExpense({ id: 'e1', type: 'markup', applyTo: 'materials', value: 10 }),
        makeExpense({ id: 'e2', type: 'markup', applyTo: 'materials', value: 20 }),
      ];
      // 100 * (1 + 30/100) = 130
      expect(calcPriceWithMarkup(100, expenses, settings, 'materials')).toBe(130);
    });

    it('возвращает basePrice без изменений, если все наценки отключены', () => {
      const expenses = [
        makeExpense({ type: 'markup', applyTo: 'materials', value: 20, enabled: false }),
      ];
      expect(calcPriceWithMarkup(100, expenses, settings, 'materials')).toBe(100);
    });

    it('игнорирует отключённые наценки, применяет только активные', () => {
      const expenses = [
        makeExpense({ id: 'e1', type: 'markup', applyTo: 'materials', value: 30, enabled: false }),
        makeExpense({ id: 'e2', type: 'markup', applyTo: 'materials', value: 10, enabled: true }),
      ];
      // Только 10% из активных
      expect(calcPriceWithMarkup(100, expenses, settings, 'materials')).toBe(110);
    });

    it('не применяет наценку на услуги к материалам', () => {
      const expenses = [makeExpense({ type: 'markup', applyTo: 'services', value: 50 })];
      // Нет наценок на materials → fallback 20%
      expect(calcPriceWithMarkup(100, expenses, settings, 'materials')).toBe(120);
    });
  });

  describe('fallback из настроек (нет статей наценки)', () => {
    it('использует settings.markupMaterial при пустом списке расходов', () => {
      // settings.markupMaterial = 20
      expect(calcPriceWithMarkup(100, [], settings, 'materials')).toBe(120);
    });

    it('использует settings.markupService для услуг', () => {
      // settings.markupService = 15
      expect(calcPriceWithMarkup(200, [], settings, 'services')).toBe(230);
    });

    it('по умолчанию applyTo = materials', () => {
      expect(calcPriceWithMarkup(100, [], settings)).toBe(120);
    });

    it('игнорирует нерелевантные типы расходов при выборе fallback', () => {
      const expenses = [
        makeExpense({ type: 'fixed', value: 5000 }),
        makeExpense({ type: 'percent', value: 10 }),
      ];
      expect(calcPriceWithMarkup(100, expenses, settings, 'materials')).toBe(120);
    });
  });

  describe('округление', () => {
    it('округляет результат до целого', () => {
      // 100 * 1.03 = 103 (ровно)
      const expenses = [makeExpense({ type: 'markup', applyTo: 'materials', value: 3 })];
      expect(calcPriceWithMarkup(100, expenses, settings, 'materials')).toBe(103);
    });

    it('округляет дробные результаты через Math.round', () => {
      // 1000 * 1.033 = 1033 (ровно), но 100 * 1.333 = 133.3 → 133
      const expenses = [makeExpense({ type: 'markup', applyTo: 'materials', value: 33.3 })];
      expect(Number.isInteger(calcPriceWithMarkup(100, expenses, settings, 'materials'))).toBe(true);
    });
  });

  describe('граничные случаи', () => {
    it('возвращает 0 при basePrice = 0', () => {
      expect(calcPriceWithMarkup(0, [], settings, 'materials')).toBe(0);
    });

    it('корректно работает с наценкой 0%', () => {
      const expenses = [makeExpense({ type: 'markup', applyTo: 'materials', value: 0 })];
      expect(calcPriceWithMarkup(500, expenses, settings, 'materials')).toBe(500);
    });

    it('корректно работает с наценкой 100%', () => {
      const expenses = [makeExpense({ type: 'markup', applyTo: 'materials', value: 100 })];
      expect(calcPriceWithMarkup(500, expenses, settings, 'materials')).toBe(1000);
    });
  });
});

// ─── calcProjectTotals ────────────────────────────────────────────────────────

describe('calcProjectTotals', () => {
  describe('базовые суммы', () => {
    it('считает rawMaterials из строк блоков', () => {
      const project = makeProject({
        blocks: [makeBlock('b1', [{ name: 'Лист', qty: 2, price: 500 }])],
      });
      const { rawMaterials } = calcProjectTotals(project, []);
      expect(rawMaterials).toBe(1000);
    });

    it('считает rawServices из блоков услуг', () => {
      const project = makeProject({
        serviceBlocks: [makeServiceBlock('s1', [{ name: 'Монтаж', qty: 3, price: 200 }])],
      });
      const { rawServices } = calcProjectTotals(project, []);
      expect(rawServices).toBe(600);
    });

    it('base = rawMaterials + rawServices', () => {
      const project = makeProject({
        blocks: [makeBlock('b1', [{ name: 'Лист', qty: 2, price: 500 }])],
        serviceBlocks: [makeServiceBlock('s1', [{ name: 'Монтаж', qty: 1, price: 300 }])],
      });
      const { base, rawMaterials, rawServices } = calcProjectTotals(project, []);
      expect(base).toBe(rawMaterials + rawServices);
      expect(base).toBe(1300);
    });

    it('суммирует строки из нескольких блоков', () => {
      const project = makeProject({
        blocks: [
          makeBlock('b1', [{ name: 'Лист', qty: 2, price: 500 }]),
          makeBlock('b2', [{ name: 'Профиль', qty: 5, price: 100 }]),
        ],
      });
      const { rawMaterials } = calcProjectTotals(project, []);
      expect(rawMaterials).toBe(1000 + 500);
    });

    it('пустой проект даёт нулевые суммы', () => {
      const project = makeProject();
      const result = calcProjectTotals(project, []);
      expect(result.rawMaterials).toBe(0);
      expect(result.rawServices).toBe(0);
      expect(result.base).toBe(0);
      expect(result.grandTotal).toBe(0);
    });
  });

  describe('фильтрация строк', () => {
    it('игнорирует строки с пустым именем', () => {
      const project = makeProject({
        blocks: [
          makeBlock('b1', [
            { name: 'Лист', qty: 2, price: 500 },
            { name: '', qty: 99, price: 9999 }, // пустая — должна игнорироваться
            { name: '   ', qty: 10, price: 100 }, // только пробелы — тоже пустая
          ]),
        ],
      });
      const { rawMaterials } = calcProjectTotals(project, []);
      expect(rawMaterials).toBe(1000);
    });
  });

  describe('наценка на total (applyTo=total)', () => {
    it('применяет наценку на total к базовой сумме', () => {
      const project = makeProject({
        blocks: [makeBlock('b1', [{ name: 'Лист', qty: 1, price: 1000 }])],
      });
      const expenses = [makeExpense({ type: 'markup', applyTo: 'total', value: 10 })];
      const { totalMarkupAmount, baseForOverhead } = calcProjectTotals(project, expenses);
      // base = 1000, markup 10% = 100
      expect(totalMarkupAmount).toBe(100);
      expect(baseForOverhead).toBe(1100);
    });

    it('суммирует несколько наценок на total', () => {
      const project = makeProject({
        blocks: [makeBlock('b1', [{ name: 'Лист', qty: 1, price: 1000 }])],
      });
      const expenses = [
        makeExpense({ id: 'e1', type: 'markup', applyTo: 'total', value: 10 }),
        makeExpense({ id: 'e2', type: 'markup', applyTo: 'total', value: 5 }),
      ];
      const { totalMarkupPct, totalMarkupAmount } = calcProjectTotals(project, expenses);
      expect(totalMarkupPct).toBe(15);
      expect(totalMarkupAmount).toBe(150);
    });

    it('игнорирует отключённые наценки на total', () => {
      const project = makeProject({
        blocks: [makeBlock('b1', [{ name: 'Лист', qty: 1, price: 1000 }])],
      });
      const expenses = [makeExpense({ type: 'markup', applyTo: 'total', value: 50, enabled: false })];
      const { totalMarkupAmount } = calcProjectTotals(project, expenses);
      expect(totalMarkupAmount).toBe(0);
    });
  });

  describe('наценка на блок (applyTo=block)', () => {
    it('применяет наценку только к указанному блоку', () => {
      const project = makeProject({
        blocks: [
          makeBlock('b1', [{ name: 'Фасад', qty: 1, price: 2000 }]),
          makeBlock('b2', [{ name: 'Корпус', qty: 1, price: 3000 }]),
        ],
      });
      const expenses = [
        makeExpense({ type: 'markup', applyTo: 'block', value: 20, blockIds: ['b1'] }),
      ];
      const { blockExtras, blockExtraTotal } = calcProjectTotals(project, expenses);
      // b1: 2000 * 20% = 400; b2: 0
      const b1 = blockExtras.find(b => b.blockId === 'b1')!;
      const b2 = blockExtras.find(b => b.blockId === 'b2')!;
      expect(b1.extra).toBe(400);
      expect(b2.extra).toBe(0);
      expect(blockExtraTotal).toBe(400);
    });

    it('blockExtraTotal входит в baseForOverhead', () => {
      const project = makeProject({
        blocks: [makeBlock('b1', [{ name: 'Фасад', qty: 1, price: 1000 }])],
      });
      const expenses = [makeExpense({ type: 'markup', applyTo: 'block', value: 10, blockIds: ['b1'] })];
      const { base, blockExtraTotal, baseForOverhead } = calcProjectTotals(project, expenses);
      expect(baseForOverhead).toBe(base + blockExtraTotal);
    });
  });

  describe('процентные расходы (type=percent)', () => {
    it('считаются от baseForOverhead', () => {
      const project = makeProject({
        blocks: [makeBlock('b1', [{ name: 'Лист', qty: 1, price: 1000 }])],
      });
      const expenses = [makeExpense({ type: 'percent', value: 6 })];
      const { baseForOverhead, percentAmount } = calcProjectTotals(project, expenses);
      // base = 1000, нет наценок → baseForOverhead = 1000
      // percent = 1000 * 6% = 60
      expect(baseForOverhead).toBe(1000);
      expect(percentAmount).toBe(60);
    });

    it('суммирует несколько процентных расходов', () => {
      const project = makeProject({
        blocks: [makeBlock('b1', [{ name: 'Лист', qty: 1, price: 1000 }])],
      });
      const expenses = [
        makeExpense({ id: 'e1', type: 'percent', value: 6 }),
        makeExpense({ id: 'e2', type: 'percent', value: 3 }),
        makeExpense({ id: 'e3', type: 'percent', value: 5 }),
      ];
      // 1000 * (6+3+5)% = 1000 * 14% = 140
      const { percentAmount } = calcProjectTotals(project, expenses);
      expect(percentAmount).toBe(140);
    });

    it('игнорирует отключённые процентные расходы', () => {
      const project = makeProject({
        blocks: [makeBlock('b1', [{ name: 'Лист', qty: 1, price: 1000 }])],
      });
      const expenses = [
        makeExpense({ id: 'e1', type: 'percent', value: 6 }),
        makeExpense({ id: 'e2', type: 'percent', value: 99, enabled: false }),
      ];
      const { percentAmount } = calcProjectTotals(project, expenses);
      expect(percentAmount).toBe(60);
    });
  });

  describe('фиксированные расходы (type=fixed)', () => {
    it('добавляются к итогу напрямую', () => {
      const project = makeProject({
        blocks: [makeBlock('b1', [{ name: 'Лист', qty: 1, price: 1000 }])],
      });
      const expenses = [makeExpense({ type: 'fixed', value: 50000 })];
      const { fixedAmount, grandTotal, baseForOverhead } = calcProjectTotals(project, expenses);
      expect(fixedAmount).toBe(50000);
      expect(grandTotal).toBe(baseForOverhead + 50000);
    });

    it('суммирует несколько фиксированных расходов', () => {
      const project = makeProject();
      const expenses = [
        makeExpense({ id: 'e1', type: 'fixed', value: 50000 }),
        makeExpense({ id: 'e2', type: 'fixed', value: 120000 }),
      ];
      const { fixedAmount } = calcProjectTotals(project, expenses);
      expect(fixedAmount).toBe(170000);
    });

    it('игнорирует отключённые фиксированные расходы', () => {
      const project = makeProject();
      const expenses = [
        makeExpense({ id: 'e1', type: 'fixed', value: 50000 }),
        makeExpense({ id: 'e2', type: 'fixed', value: 100000, enabled: false }),
      ];
      const { fixedAmount } = calcProjectTotals(project, expenses);
      expect(fixedAmount).toBe(50000);
    });
  });

  describe('grandTotal — итоговая формула', () => {
    it('grandTotal = baseForOverhead + percentAmount + fixedAmount', () => {
      const project = makeProject({
        blocks: [makeBlock('b1', [{ name: 'Лист', qty: 1, price: 10000 }])],
      });
      const expenses = [
        makeExpense({ id: 'e1', type: 'markup', applyTo: 'total', value: 20 }),
        makeExpense({ id: 'e2', type: 'percent', value: 6 }),
        makeExpense({ id: 'e3', type: 'fixed', value: 5000 }),
      ];
      const result = calcProjectTotals(project, expenses);
      // base = 10000
      // totalMarkupAmount = 10000 * 20% = 2000
      // baseForOverhead = 10000 + 2000 = 12000
      // percentAmount = 12000 * 6% = 720
      // fixedAmount = 5000
      // grandTotal = 12000 + 720 + 5000 = 17720
      expect(result.base).toBe(10000);
      expect(result.totalMarkupAmount).toBe(2000);
      expect(result.baseForOverhead).toBe(12000);
      expect(result.percentAmount).toBe(720);
      expect(result.fixedAmount).toBe(5000);
      expect(result.grandTotal).toBe(17720);
    });

    it('полный расчёт со всеми типами расходов из initialState', () => {
      const project = makeProject({
        blocks: [makeBlock('b1', [{ name: 'Фасады', qty: 10, price: 1500 }])],
        serviceBlocks: [makeServiceBlock('s1', [{ name: 'Монтаж', qty: 1, price: 5000 }])],
      });
      // Расходы как в initialState
      const expenses: ExpenseItem[] = [
        { id: 'e6', name: 'Наценка на материалы', type: 'markup', applyTo: 'materials', value: 20, groupId: 'eg1', enabled: true },
        { id: 'e7', name: 'Наценка на услуги', type: 'markup', applyTo: 'services', value: 15, groupId: 'eg1', enabled: true },
        { id: 'e1', name: 'Аренда', type: 'fixed', value: 50000, groupId: 'eg2', enabled: true },
        { id: 'e2', name: 'Зарплата', type: 'fixed', value: 120000, groupId: 'eg2', enabled: true },
        { id: 'e3', name: 'Налоги (УСН)', type: 'percent', value: 6, groupId: 'eg3', enabled: true },
        { id: 'e4', name: 'Расходные материалы', type: 'percent', value: 3, enabled: true },
        { id: 'e5', name: 'Реклама', type: 'percent', value: 5, enabled: true },
      ];
      const result = calcProjectTotals(project, expenses);
      // rawMaterials = 10 * 1500 = 15000
      // rawServices = 5000
      // base = 20000
      // naценки 'materials' и 'services' → applyTo !== 'total' → totalMarkupAmount = 0
      // baseForOverhead = 20000
      // percent = 20000 * (6+3+5)% = 20000 * 14% = 2800
      // fixed = 50000 + 120000 = 170000
      // grandTotal = 20000 + 2800 + 170000 = 192800
      expect(result.rawMaterials).toBe(15000);
      expect(result.rawServices).toBe(5000);
      expect(result.base).toBe(20000);
      expect(result.totalMarkupAmount).toBe(0);
      expect(result.baseForOverhead).toBe(20000);
      expect(result.percentAmount).toBe(2800);
      expect(result.fixedAmount).toBe(170000);
      expect(result.grandTotal).toBe(192800);
    });
  });

  describe('activeExpenses в результате', () => {
    it('содержит только включённые расходы', () => {
      const project = makeProject();
      const expenses = [
        makeExpense({ id: 'e1', value: 100, enabled: true }),
        makeExpense({ id: 'e2', value: 200, enabled: false }),
        makeExpense({ id: 'e3', value: 300 }), // enabled undefined = true
      ];
      const { activeExpenses } = calcProjectTotals(project, expenses);
      expect(activeExpenses).toHaveLength(2);
      expect(activeExpenses.map(e => e.id)).toContain('e1');
      expect(activeExpenses.map(e => e.id)).toContain('e3');
      expect(activeExpenses.map(e => e.id)).not.toContain('e2');
    });
  });
});
