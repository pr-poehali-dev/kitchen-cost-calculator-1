import { useState, useCallback } from 'react';
import type {
  AppState, Manufacturer, Vendor, Material, MaterialVariant, Service, ExpenseItem, ExpenseGroup,
  CalcBlock, CalcRow, ServiceBlock, ServiceRow, Project, Settings,
  MaterialType, MaterialCategory, CalcColumnKey, CalcTemplate, SavedBlock
} from './types';

const DEFAULT_MATERIAL_TYPES: MaterialType[] = [
  { id: 'mt1', name: 'ЛДСП', color: '#c8a96e' },
  { id: 'mt2', name: 'МДФ', color: '#a0c878' },
  { id: 'mt3', name: 'ХДФ', color: '#78b4c8' },
  { id: 'mt4', name: 'Фанера', color: '#c8a050' },
  { id: 'mt5', name: 'ДСП', color: '#b4b4b4' },
  { id: 'mt6', name: 'Стекло', color: '#a0d4e8' },
  { id: 'mt7', name: 'Зеркало', color: '#d0d8e8' },
  { id: 'mt8', name: 'Столешница', color: '#c8785a' },
  { id: 'mt9', name: 'Фасад', color: '#b478c8' },
  { id: 'mt10', name: 'Фурнитура', color: '#c8c850' },
  { id: 'mt11', name: 'Профиль', color: '#909090' },
  { id: 'mt12', name: 'Кромка', color: '#e8b478' },
  { id: 'mt13', name: 'Другое', color: '#787878' },
];

const ALL_COLUMNS: CalcColumnKey[] = ['material', 'manufacturer', 'vendor', 'article', 'color', 'thickness', 'unit', 'qty', 'price'];

const DEFAULT_MATERIAL_CATEGORIES: MaterialCategory[] = [
  { id: 'mc1', name: 'Е1', typeId: 'mt1', note: 'Эмиссия формальдегида класс Е1' },
  { id: 'mc2', name: 'Е2', typeId: 'mt1', note: 'Эмиссия формальдегида класс Е2' },
  { id: 'mc3', name: 'Стандарт', note: 'Стандартная категория' },
  { id: 'mc4', name: 'Премиум', note: 'Премиальная категория' },
];

const defaultSettings: Settings = {
  currency: '₽',
  markupMaterial: 20,
  markupService: 15,
  units: ['м²', 'м.п.', 'шт', 'компл', 'л', 'кг'],
  materialTypes: DEFAULT_MATERIAL_TYPES,
  materialCategories: DEFAULT_MATERIAL_CATEGORIES,
};

const initialState: AppState = {
  manufacturers: [
    { id: 'mfr1', name: 'Lamarty', contact: 'Менеджер Игорь', phone: '+7 900 000-00-01', materialTypeIds: ['mt1', 'mt2', 'mt3'] },
    { id: 'mfr2', name: 'Kronospan', contact: 'Менеджер Анна', phone: '+7 900 000-00-02', materialTypeIds: ['mt1', 'mt4'] },
    { id: 'mfr3', name: 'Egger', contact: 'Менеджер Павел', phone: '+7 900 000-00-03', materialTypeIds: ['mt1', 'mt2', 'mt9'] },
    { id: 'mfr4', name: 'Boyard', contact: '', phone: '', materialTypeIds: ['mt10'] },
    { id: 'mfr5', name: 'Slotex', contact: '', phone: '', materialTypeIds: ['mt8', 'mt9', 'mt12'] },
  ],
  vendors: [
    { id: 'v1', name: 'МАРШАЛ', contact: 'Менеджер Сергей', phone: '+7 900 100-00-01', materialTypeIds: ['mt1', 'mt2', 'mt3'] },
    { id: 'v2', name: 'Специалист', contact: 'Менеджер Ольга', phone: '+7 900 100-00-02', materialTypeIds: ['mt8', 'mt10', 'mt11', 'mt12'] },
    { id: 'v3', name: 'КДМ', contact: 'Менеджер Дмитрий', phone: '+7 900 100-00-03', materialTypeIds: ['mt1', 'mt4', 'mt5'] },
  ],
  materials: [
    // ── Lamarty ЛДСП 10мм ─────────────────────────────────────────
    { id: 'lm10_01', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Белый снег', typeId: 'mt1', thickness: 10, color: 'Белый снег', article: 'U727 ST9', unit: 'м²', basePrice: 0 },
    { id: 'lm10_02', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Кашемир', typeId: 'mt1', thickness: 10, color: 'Кашемир', article: 'U414 ST9', unit: 'м²', basePrice: 0 },
    { id: 'lm10_03', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Серый графит', typeId: 'mt1', thickness: 10, color: 'Серый графит', article: 'U741 ST9', unit: 'м²', basePrice: 0 },

    // ── Lamarty ЛДСП 16мм — Однотонные ───────────────────────────
    { id: 'lm16_01', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Белый снег', typeId: 'mt1', thickness: 16, color: 'Белый снег', article: 'U727 ST9', unit: 'м²', basePrice: 0 },
    { id: 'lm16_02', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Белый премиум', typeId: 'mt1', thickness: 16, color: 'Белый премиум', article: 'W1000 ST9', unit: 'м²', basePrice: 0 },
    { id: 'lm16_03', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Кашемир', typeId: 'mt1', thickness: 16, color: 'Кашемир', article: 'U414 ST9', unit: 'м²', basePrice: 0 },
    { id: 'lm16_04', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Серый графит', typeId: 'mt1', thickness: 16, color: 'Серый графит', article: 'U741 ST9', unit: 'м²', basePrice: 0 },
    { id: 'lm16_05', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Тёмно-серый', typeId: 'mt1', thickness: 16, color: 'Тёмно-серый', article: 'U732 ST9', unit: 'м²', basePrice: 0 },
    { id: 'lm16_06', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Антрацит', typeId: 'mt1', thickness: 16, color: 'Антрацит', article: 'U961 ST2', unit: 'м²', basePrice: 0 },
    { id: 'lm16_07', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Чёрный', typeId: 'mt1', thickness: 16, color: 'Чёрный', article: 'U999 ST2', unit: 'м²', basePrice: 0 },
    { id: 'lm16_08', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Латте', typeId: 'mt1', thickness: 16, color: 'Латте', article: 'U222 ST9', unit: 'м²', basePrice: 0 },
    { id: 'lm16_09', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Аворио', typeId: 'mt1', thickness: 16, color: 'Аворио', article: 'U104 ST9', unit: 'м²', basePrice: 0 },
    { id: 'lm16_10', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Тёмный бежевый', typeId: 'mt1', thickness: 16, color: 'Тёмный бежевый', article: 'U312 ST9', unit: 'м²', basePrice: 0 },

    // ── Lamarty ЛДСП 16мм — Дерево ────────────────────────────────
    { id: 'lm16_11', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Дуб Сонома трюфель', typeId: 'mt1', thickness: 16, color: 'Дуб Сонома трюфель', article: 'H3406 ST38', unit: 'м²', basePrice: 0 },
    { id: 'lm16_12', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Дуб Сонома натуральный', typeId: 'mt1', thickness: 16, color: 'Дуб Сонома натуральный', article: 'H3453 ST22', unit: 'м²', basePrice: 0 },
    { id: 'lm16_13', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Дуб Сонома светлый', typeId: 'mt1', thickness: 16, color: 'Дуб Сонома светлый', article: 'H1334 ST32', unit: 'м²', basePrice: 0 },
    { id: 'lm16_14', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Дуб Craft белый', typeId: 'mt1', thickness: 16, color: 'Дуб Craft белый', article: 'H1145 ST10', unit: 'м²', basePrice: 0 },
    { id: 'lm16_15', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Дуб Craft серый', typeId: 'mt1', thickness: 16, color: 'Дуб Craft серый', article: 'H1160 ST10', unit: 'м²', basePrice: 0 },
    { id: 'lm16_16', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Дуб Craft золотой', typeId: 'mt1', thickness: 16, color: 'Дуб Craft золотой', article: 'H1156 ST10', unit: 'м²', basePrice: 0 },
    { id: 'lm16_17', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Дуб Аутентик', typeId: 'mt1', thickness: 16, color: 'Дуб Аутентик', article: 'H3151 ST28', unit: 'м²', basePrice: 0 },
    { id: 'lm16_18', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Орех Сорано', typeId: 'mt1', thickness: 16, color: 'Орех Сорано', article: 'H3734 ST9', unit: 'м²', basePrice: 0 },
    { id: 'lm16_19', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Орех Сорано тёмный', typeId: 'mt1', thickness: 16, color: 'Орех Сорано тёмный', article: 'H3702 ST10', unit: 'м²', basePrice: 0 },
    { id: 'lm16_20', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Вяз Торонто', typeId: 'mt1', thickness: 16, color: 'Вяз Торонто', article: 'H3393 ST22', unit: 'м²', basePrice: 0 },
    { id: 'lm16_21', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Сосна Айзен', typeId: 'mt1', thickness: 16, color: 'Сосна Айзен', article: 'H3840 ST9', unit: 'м²', basePrice: 0 },
    { id: 'lm16_22', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Акация Молина', typeId: 'mt1', thickness: 16, color: 'Акация Молина', article: 'H3732 ST10', unit: 'м²', basePrice: 0 },
    { id: 'lm16_23', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Берёза Майами', typeId: 'mt1', thickness: 16, color: 'Берёза Майами', article: 'H1717 ST33', unit: 'м²', basePrice: 0 },

    // ── Lamarty ЛДСП 25мм ─────────────────────────────────────────
    { id: 'lm25_01', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Белый снег', typeId: 'mt1', thickness: 25, color: 'Белый снег', article: 'U727 ST9', unit: 'м²', basePrice: 0 },
    { id: 'lm25_02', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Антрацит', typeId: 'mt1', thickness: 25, color: 'Антрацит', article: 'U961 ST2', unit: 'м²', basePrice: 0 },
    { id: 'lm25_03', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Кашемир', typeId: 'mt1', thickness: 25, color: 'Кашемир', article: 'U414 ST9', unit: 'м²', basePrice: 0 },
    { id: 'lm25_11', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Дуб Сонома натуральный', typeId: 'mt1', thickness: 25, color: 'Дуб Сонома натуральный', article: 'H3453 ST22', unit: 'м²', basePrice: 0 },
    { id: 'lm25_12', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Дуб Сонома трюфель', typeId: 'mt1', thickness: 25, color: 'Дуб Сонома трюфель', article: 'H3406 ST38', unit: 'м²', basePrice: 0 },
    { id: 'lm25_13', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП Орех Сорано', typeId: 'mt1', thickness: 25, color: 'Орех Сорано', article: 'H3734 ST9', unit: 'м²', basePrice: 0 },

    // ── Прочие материалы ──────────────────────────────────────────
    { id: 'm3', manufacturerId: 'mfr2', vendorId: 'v1', name: 'ХДФ 3мм Белый', typeId: 'mt3', thickness: 3, color: 'Белый', unit: 'м²', basePrice: 917 },
    { id: 'm4', manufacturerId: 'mfr3', vendorId: 'v3', name: 'ЛДСП 16мм Дуб натуральный', typeId: 'mt1', thickness: 16, color: 'Дуб натуральный', unit: 'м²', basePrice: 6417 },
    { id: 'm5', manufacturerId: 'mfr1', vendorId: 'v1', name: 'МДФ фасад 18мм', typeId: 'mt2', thickness: 18, color: 'Белый матовый', unit: 'м²', basePrice: 8333 },
    { id: 'm6', manufacturerId: 'mfr4', vendorId: 'v2', name: 'Петля Boyard 35мм', typeId: 'mt10', unit: 'шт', basePrice: 120 },

    // ══ Slotex / Серия Elga E1 (gid=1989291696) ══════════════════
    {
      id: 'e1_st1', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Столешница Slotex E1', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'e1_st1_v1',  size: '4200×1200', thickness: 40, params: '00/U1/05', basePrice: 22810 },
        { id: 'e1_st1_v2',  size: '4200×1200', thickness: 40, params: 'UU/05',    basePrice: 25090 },
        { id: 'e1_st1_v3',  size: '4200×800',  thickness: 40, params: '00/U1/05', basePrice: 21740 },
        { id: 'e1_st1_v4',  size: '4200×800',  thickness: 40, params: 'UU/05',    basePrice: 23910 },
        { id: 'e1_st1_v5',  size: '4200×600',  thickness: 40, params: '00/U1/05', basePrice: 11410 },
        { id: 'e1_st1_v6',  size: '3000×1200', thickness: 40, params: '00/U1/05', basePrice: 15950 },
        { id: 'e1_st1_v7',  size: '3000×1200', thickness: 40, params: 'UU/05',    basePrice: 17540 },
        { id: 'e1_st1_v8',  size: '3000×800',  thickness: 40, params: '00/U1/05', basePrice: 14880 },
        { id: 'e1_st1_v9',  size: '3000×800',  thickness: 40, params: 'UU/05',    basePrice: 16370 },
        { id: 'e1_st1_v10', size: '3000×600',  thickness: 40, params: '00/U1/05', basePrice: 8040  },
        { id: 'e1_st1_v11', size: '3000×600',  thickness: 40, params: 'UU/05',    basePrice: 8840  },
        { id: 'e1_st1_v12', size: '3000×1200', thickness: 27, params: '00/U1/05', basePrice: 13540 },
        { id: 'e1_st1_v13', size: '3000×1200', thickness: 27, params: 'UU/05',    basePrice: 14890 },
        { id: 'e1_st1_v14', size: '3000×800',  thickness: 27, params: '00/U1/05', basePrice: 12370 },
        { id: 'e1_st1_v15', size: '3000×800',  thickness: 27, params: 'UU/05',    basePrice: 13610 },
        { id: 'e1_st1_v16', size: '3000×600',  thickness: 27, params: '00/U1/05', basePrice: 6870  },
        { id: 'e1_st1_v17', size: '3000×600',  thickness: 27, params: 'UU/05',    basePrice: 7550  },
      ],
    },
    {
      id: 'e1_st2', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Столешница Slotex DUO-X E1', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'e1_st2_v1',  size: '4200×1200', thickness: 40, params: '00/U1/05', basePrice: 34190 },
        { id: 'e1_st2_v2',  size: '4200×1200', thickness: 40, params: 'UU/05',    basePrice: 37620 },
        { id: 'e1_st2_v3',  size: '4200×800',  thickness: 40, params: '00/U1/05', basePrice: 32460 },
        { id: 'e1_st2_v4',  size: '4200×800',  thickness: 40, params: 'UU/05',    basePrice: 35700 },
        { id: 'e1_st2_v5',  size: '4200×600',  thickness: 40, params: '00/U1/05', basePrice: 17210 },
        { id: 'e1_st2_v6',  size: '3000×1200', thickness: 40, params: '00/U1/05', basePrice: 23960 },
        { id: 'e1_st2_v7',  size: '3000×1200', thickness: 40, params: 'UU/05',    basePrice: 26350 },
        { id: 'e1_st2_v8',  size: '3000×800',  thickness: 40, params: '00/U1/05', basePrice: 22220 },
        { id: 'e1_st2_v9',  size: '3000×800',  thickness: 40, params: 'UU/05',    basePrice: 24440 },
        { id: 'e1_st2_v10', size: '3000×600',  thickness: 40, params: '00/U1/05', basePrice: 12080 },
        { id: 'e1_st2_v11', size: '3000×600',  thickness: 40, params: 'UU/05',    basePrice: 13290 },
        { id: 'e1_st2_v12', size: '3000×1200', thickness: 27, params: '00/U1/05', basePrice: 20190 },
        { id: 'e1_st2_v13', size: '3000×1200', thickness: 27, params: 'UU/05',    basePrice: 22210 },
        { id: 'e1_st2_v14', size: '3000×800',  thickness: 27, params: '00/U1/05', basePrice: 18550 },
        { id: 'e1_st2_v15', size: '3000×800',  thickness: 27, params: 'UU/05',    basePrice: 20410 },
        { id: 'e1_st2_v16', size: '3000×600',  thickness: 27, params: '00/U1/05', basePrice: 10240 },
        { id: 'e1_st2_v17', size: '3000×600',  thickness: 27, params: 'UU/05',    basePrice: 11270 },
      ],
    },
    {
      id: 'e1_sp1', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Стеновая панель Slotex E1', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'e1_sp1_v1', size: '4200×1215', thickness: 10, params: '0', basePrice: 15080 },
        { id: 'e1_sp1_v2', size: '4200×600',  thickness: 10, params: '0', basePrice: 7630  },
        { id: 'e1_sp1_v3', size: '3000×1215', thickness: 10, params: '0', basePrice: 10340 },
        { id: 'e1_sp1_v4', size: '3000×600',  thickness: 10, params: '0', basePrice: 5220  },
      ],
    },

    // ══ Slotex / Серия Elga E2 (gid=1539284672) ══════════════════
    {
      id: 'e2_st1', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Столешница Slotex E2', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'e2_st1_v1',  size: '4200×1200', thickness: 40, params: '00/U1/05', basePrice: 28340 },
        { id: 'e2_st1_v2',  size: '4200×1200', thickness: 40, params: 'UU/05',    basePrice: 31180 },
        { id: 'e2_st1_v3',  size: '4200×800',  thickness: 40, params: '00/U1/05', basePrice: 27510 },
        { id: 'e2_st1_v4',  size: '4200×800',  thickness: 40, params: 'UU/05',    basePrice: 30250 },
        { id: 'e2_st1_v5',  size: '4200×600',  thickness: 40, params: '00/U1/05', basePrice: 14180 },
        { id: 'e2_st1_v6',  size: '3000×1200', thickness: 40, params: '00/U1/05', basePrice: 19880 },
        { id: 'e2_st1_v7',  size: '3000×1200', thickness: 40, params: 'UU/05',    basePrice: 21860 },
        { id: 'e2_st1_v8',  size: '3000×800',  thickness: 40, params: '00/U1/05', basePrice: 18950 },
        { id: 'e2_st1_v9',  size: '3000×800',  thickness: 40, params: 'UU/05',    basePrice: 20850 },
        { id: 'e2_st1_v10', size: '3000×600',  thickness: 40, params: '00/U1/05', basePrice: 9950  },
        { id: 'e2_st1_v11', size: '3000×600',  thickness: 40, params: 'UU/05',    basePrice: 10940 },
        { id: 'e2_st1_v12', size: '3000×1200', thickness: 27, params: '00/U1/05', basePrice: 18560 },
        { id: 'e2_st1_v13', size: '3000×1200', thickness: 27, params: 'UU/05',    basePrice: 20410 },
        { id: 'e2_st1_v14', size: '3000×800',  thickness: 27, params: '00/U1/05', basePrice: 17650 },
        { id: 'e2_st1_v15', size: '3000×800',  thickness: 27, params: 'UU/05',    basePrice: 19410 },
        { id: 'e2_st1_v16', size: '3000×600',  thickness: 27, params: '00/U1/05', basePrice: 8490  },
        { id: 'e2_st1_v17', size: '3000×600',  thickness: 27, params: 'UU/05',    basePrice: 9340  },
      ],
    },
    {
      id: 'e2_st2', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Столешница Slotex DUO-X E2', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'e2_st2_v1',  size: '4200×1200', thickness: 40, params: '00/U1/05', basePrice: 42510 },
        { id: 'e2_st2_v2',  size: '4200×1200', thickness: 40, params: 'UU/05',    basePrice: 46770 },
        { id: 'e2_st2_v3',  size: '4200×800',  thickness: 40, params: '00/U1/05', basePrice: 41130 },
        { id: 'e2_st2_v4',  size: '4200×800',  thickness: 40, params: 'UU/05',    basePrice: 45250 },
        { id: 'e2_st2_v5',  size: '4200×600',  thickness: 40, params: '00/U1/05', basePrice: 21340 },
        { id: 'e2_st2_v6',  size: '3000×1200', thickness: 40, params: '00/U1/05', basePrice: 29660 },
        { id: 'e2_st2_v7',  size: '3000×1200', thickness: 40, params: 'UU/05',    basePrice: 32630 },
        { id: 'e2_st2_v8',  size: '3000×800',  thickness: 40, params: '00/U1/05', basePrice: 28350 },
        { id: 'e2_st2_v9',  size: '3000×800',  thickness: 40, params: 'UU/05',    basePrice: 31190 },
        { id: 'e2_st2_v10', size: '3000×600',  thickness: 40, params: '00/U1/05', basePrice: 14940 },
        { id: 'e2_st2_v11', size: '3000×600',  thickness: 40, params: 'UU/05',    basePrice: 16430 },
        { id: 'e2_st2_v12', size: '3000×1200', thickness: 27, params: '00/U1/05', basePrice: 27830 },
        { id: 'e2_st2_v13', size: '3000×1200', thickness: 27, params: 'UU/05',    basePrice: 30610 },
        { id: 'e2_st2_v14', size: '3000×800',  thickness: 27, params: '00/U1/05', basePrice: 26470 },
        { id: 'e2_st2_v15', size: '3000×800',  thickness: 27, params: 'UU/05',    basePrice: 29120 },
        { id: 'e2_st2_v16', size: '3000×600',  thickness: 27, params: '00/U1/05', basePrice: 12730 },
        { id: 'e2_st2_v17', size: '3000×600',  thickness: 27, params: 'UU/05',    basePrice: 14010 },
      ],
    },
    {
      id: 'e2_sp1', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Стеновая панель Slotex E2', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'e2_sp1_v1', size: '4200×1215', thickness: 10, params: '0', basePrice: 19250 },
        { id: 'e2_sp1_v2', size: '4200×600',  thickness: 10, params: '0', basePrice: 9700  },
        { id: 'e2_sp1_v3', size: '3000×1215', thickness: 10, params: '0', basePrice: 12720 },
        { id: 'e2_sp1_v4', size: '3000×600',  thickness: 10, params: '0', basePrice: 6790  },
      ],
    },

    // ══ Slotex / Серия Elga E3 (gid=1324647373) ══════════════════
    {
      id: 'e3_st1', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Столешница Slotex E3', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'e3_st1_v1',  size: '4200×1200', thickness: 40, params: '00/U1/05', basePrice: 33970 },
        { id: 'e3_st1_v2',  size: '4200×1200', thickness: 40, params: 'UU/05',    basePrice: 37380 },
        { id: 'e3_st1_v3',  size: '4200×800',  thickness: 40, params: '00/U1/05', basePrice: 33140 },
        { id: 'e3_st1_v4',  size: '4200×800',  thickness: 40, params: 'UU/05',    basePrice: 36450 },
        { id: 'e3_st1_v5',  size: '4200×600',  thickness: 40, params: '00/U1/05', basePrice: 17060 },
        { id: 'e3_st1_v6',  size: '3000×1200', thickness: 27, params: '00/U1/05', basePrice: 24920 },
        { id: 'e3_st1_v7',  size: '3000×1200', thickness: 27, params: 'UU/05',    basePrice: 27410 },
        { id: 'e3_st1_v8',  size: '3000×800',  thickness: 27, params: '00/U1/05', basePrice: 24010 },
        { id: 'e3_st1_v9',  size: '3000×800',  thickness: 27, params: 'UU/05',    basePrice: 26420 },
        { id: 'e3_st1_v10', size: '3000×600',  thickness: 27, params: '00/U1/05', basePrice: 12460 },
        { id: 'e3_st1_v11', size: '3000×600',  thickness: 27, params: 'UU/05',    basePrice: 13710 },
      ],
    },
    {
      id: 'e3_st2', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Столешница Slotex DUO-X E3', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'e3_st2_v1',  size: '4200×1200', thickness: 40, params: '00/U1/05', basePrice: 51030 },
        { id: 'e3_st2_v2',  size: '4200×1200', thickness: 40, params: 'UU/05',    basePrice: 56130 },
        { id: 'e3_st2_v3',  size: '4200×800',  thickness: 40, params: '00/U1/05', basePrice: 49670 },
        { id: 'e3_st2_v4',  size: '4200×800',  thickness: 40, params: 'UU/05',    basePrice: 54630 },
        { id: 'e3_st2_v5',  size: '4200×600',  thickness: 40, params: '00/U1/05', basePrice: 25580 },
        { id: 'e3_st2_v6',  size: '3000×1200', thickness: 27, params: '00/U1/05', basePrice: 37370 },
        { id: 'e3_st2_v7',  size: '3000×1200', thickness: 27, params: 'UU/05',    basePrice: 41100 },
        { id: 'e3_st2_v8',  size: '3000×800',  thickness: 27, params: '00/U1/05', basePrice: 36080 },
        { id: 'e3_st2_v9',  size: '3000×800',  thickness: 27, params: 'UU/05',    basePrice: 39680 },
        { id: 'e3_st2_v10', size: '3000×600',  thickness: 27, params: '00/U1/05', basePrice: 18730 },
        { id: 'e3_st2_v11', size: '3000×600',  thickness: 27, params: 'UU/05',    basePrice: 20600 },
      ],
    },
    {
      id: 'e3_sp1', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Стеновая панель Slotex E3', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'e3_sp1_v1', size: '4200×1215', thickness: 10, params: '0', basePrice: 23100 },
        { id: 'e3_sp1_v2', size: '4200×600',  thickness: 10, params: '0', basePrice: 11630 },
        { id: 'e3_sp1_v3', size: '3000×1215', thickness: 10, params: '0', basePrice: 16290 },
        { id: 'e3_sp1_v4', size: '3000×600',  thickness: 10, params: '0', basePrice: 8530  },
      ],
    },

    // ══ Slotex / Серия kapso K3 (gid=557309721) ══════════════════
    {
      id: 'k3_st1', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Столешница kapso K3', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'k3_st1_v1', size: '4200×600',  thickness: 40, params: '00/W1/05', basePrice: 8390  },
        { id: 'k3_st1_v2', size: '3000×600',  thickness: 40, params: '00/W1/05', basePrice: 6000  },
        { id: 'k3_st1_v3', size: '3000×1200', thickness: 40, params: '00/W1/05', basePrice: 11680 },
      ],
    },
    {
      id: 'k3_sp1', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Стеновая панель kapso K3', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'k3_sp1_v1', size: '4200×600', thickness: 10, params: '0', basePrice: 6780 },
        { id: 'k3_sp1_v2', size: '3000×600', thickness: 10, params: '0', basePrice: 4850 },
      ],
    },
  ],
  services: [
    { id: 'sv1', name: 'Сборка кухни', category: 'Сборка', unit: 'компл', basePrice: 15000 },
    { id: 'sv2', name: 'Доставка по городу', category: 'Доставка', unit: 'компл', basePrice: 3000 },
    { id: 'sv3', name: 'Подъём на этаж', category: 'Доставка', unit: 'шт', basePrice: 500 },
    { id: 'sv4', name: 'Установка столешницы', category: 'Установка', unit: 'м.п.', basePrice: 1200 },
    { id: 'sv5', name: 'Врезка мойки', category: 'Дополнительные работы', unit: 'шт', basePrice: 1500 },
  ],
  expenseGroups: [
    { id: 'eg1', name: 'Наценки' },
    { id: 'eg2', name: 'Постоянные расходы' },
    { id: 'eg3', name: 'Налоги' },
  ],
  expenses: [
    { id: 'e6', name: 'Наценка на материалы', type: 'markup', value: 20, applyTo: 'materials', groupId: 'eg1', enabled: true, note: 'Применяется при подборе из Базы' },
    { id: 'e7', name: 'Наценка на услуги', type: 'markup', value: 15, applyTo: 'services', groupId: 'eg1', enabled: true, note: 'Применяется при подборе из Базы' },
    { id: 'e1', name: 'Аренда производства', type: 'fixed', value: 50000, groupId: 'eg2', enabled: true, note: 'В месяц' },
    { id: 'e2', name: 'Зарплата сотрудников', type: 'fixed', value: 120000, groupId: 'eg2', enabled: true, note: 'В месяц' },
    { id: 'e3', name: 'Налоги (УСН)', type: 'percent', value: 6, groupId: 'eg3', enabled: true, note: 'От оборота' },
    { id: 'e4', name: 'Расходные материалы', type: 'percent', value: 3, enabled: true, note: 'От стоимости заказа' },
    { id: 'e5', name: 'Реклама и маркетинг', type: 'percent', value: 5, enabled: true, note: 'От оборота' },
  ],
  settings: defaultSettings,
  projects: [
    {
      id: 'p1',
      client: 'Иванов Иван',
      object: 'Кухня П-образная',
      address: 'ул. Ленина, 42, кв. 15',
      phone: '+7 912 345-67-89',
      messenger: 'WhatsApp',
      createdAt: '2026-04-24',
      blocks: [
        {
          id: 'b1',
          name: 'Корпус',
          allowedTypeIds: ['mt1', 'mt3', 'mt2'],
          visibleColumns: ALL_COLUMNS,
          rows: [
            { id: 'r1', name: 'ЛДСП 16мм Белый', materialId: 'm1', manufacturerId: 'mfr1', vendorId: 'v1', typeId: 'mt1', thickness: 16, color: 'Белый', unit: 'м²', qty: 25, price: 6100 },
            { id: 'r2', name: 'ЛДСП 16мм Серый', materialId: 'm2', manufacturerId: 'mfr1', vendorId: 'v1', typeId: 'mt1', thickness: 16, color: 'Серый', unit: 'м²', qty: 10, price: 6900 },
            { id: 'r3', name: 'ХДФ 3мм Белый', materialId: 'm3', manufacturerId: 'mfr2', vendorId: 'v1', typeId: 'mt3', thickness: 3, color: 'Белый', unit: 'м²', qty: 5, price: 1100 },
          ]
        },
        {
          id: 'b2',
          name: 'Фасады',
          allowedTypeIds: ['mt2', 'mt9'],
          visibleColumns: ALL_COLUMNS,
          rows: [
            { id: 'r4', name: 'МДФ фасад 18мм', materialId: 'm5', manufacturerId: 'mfr1', vendorId: 'v1', typeId: 'mt2', thickness: 18, color: 'Белый матовый', unit: 'м²', qty: 8, price: 10000 },
          ]
        },
      ],
      serviceBlocks: [
        {
          id: 'sb1',
          name: 'Монтаж и доставка',
          rows: [
            { id: 'sr1', serviceId: 'sv1', name: 'Сборка кухни', unit: 'компл', qty: 1, price: 15000 },
            { id: 'sr2', serviceId: 'sv2', name: 'Доставка по городу', unit: 'компл', qty: 1, price: 3000 },
          ]
        }
      ]
    }
  ],
  activeProjectId: 'p1',
  templates: [
    {
      id: 'tpl1',
      name: 'Кухня стандарт',
      description: 'Корпус + Фасады + Монтаж',
      createdAt: '2026-04-24',
      blocks: [
        { name: 'Корпус', allowedTypeIds: ['mt1', 'mt3', 'mt2'], visibleColumns: ALL_COLUMNS, rows: [] },
        { name: 'Фасады', allowedTypeIds: ['mt2', 'mt9'], visibleColumns: ALL_COLUMNS, rows: [] },
        { name: 'Столешница', allowedTypeIds: ['mt8'], visibleColumns: ALL_COLUMNS, rows: [] },
      ],
      serviceBlocks: [
        { name: 'Монтаж и доставка', rows: [] },
      ],
    },
  ],
  savedBlocks: [],
};

const STORAGE_KEY = 'kuhni-pro-state-v4';
const STORAGE_KEY_PREV = 'kuhni-pro-state-v3';

const DEFAULT_VISIBLE_COLUMNS: CalcColumnKey[] = ['material', 'manufacturer', 'vendor', 'article', 'color', 'thickness', 'unit', 'qty', 'baseprice', 'price', 'total'];

function migrateProjects(projects: AppState['projects']): AppState['projects'] {
  return projects.map(p => ({
    ...p,
    blocks: p.blocks.map(b => {
      let cols = b.visibleColumns?.length ? b.visibleColumns : DEFAULT_VISIBLE_COLUMNS;
      // Добавляем total после price если нет
      if (!cols.includes('total')) {
        const priceIdx = cols.indexOf('price');
        cols = priceIdx >= 0
          ? [...cols.slice(0, priceIdx + 1), 'total', ...cols.slice(priceIdx + 1)]
          : [...cols, 'total'];
      }
      // Добавляем baseprice после qty если нет
      if (!cols.includes('baseprice')) {
        const qtyIdx = cols.indexOf('qty');
        cols = qtyIdx >= 0
          ? [...cols.slice(0, qtyIdx + 1), 'baseprice', ...cols.slice(qtyIdx + 1)]
          : [...cols, 'baseprice'];
      }
      return { ...b, allowedTypeIds: b.allowedTypeIds ?? [], visibleColumns: cols };
    }),
  }));
}

function isValidMaterialTypes(arr: unknown[]): boolean {
  return arr.length > 0 &&
    typeof arr[0] === 'object' &&
    arr[0] !== null &&
    'id' in (arr[0] as object);
}

// Универсальный merge по id — пользовательские данные + новые из дефолтов
function mergeById<T extends { id: string }>(userList: T[] | undefined, defaults: T[]): T[] {
  const existing = userList || [];
  const existingIds = new Set(existing.map(x => x.id));
  const toAdd = defaults.filter(x => !existingIds.has(x.id));
  return [...existing, ...toAdd];
}

function parseAndMerge(raw: string): AppState {
  const parsed = JSON.parse(raw) as Partial<AppState>;

  const validTypes = parsed.settings?.materialTypes?.length &&
    isValidMaterialTypes(parsed.settings.materialTypes as unknown[])
    ? parsed.settings.materialTypes
    : DEFAULT_MATERIAL_TYPES;

  const migratedExpenses = parsed.expenses
    ? parsed.expenses.map(e => ({ ...e, enabled: e.enabled !== false }))
    : initialState.expenses;

  return {
    manufacturers:   mergeById(parsed.manufacturers,  initialState.manufacturers),
    vendors:         mergeById(parsed.vendors,         initialState.vendors),
    materials:       mergeById(parsed.materials,       initialState.materials),
    services:        parsed.services?.length ? parsed.services : initialState.services,
    expenseGroups:   mergeById(parsed.expenseGroups,   initialState.expenseGroups),
    expenses:        migratedExpenses,
    settings: {
      ...defaultSettings,
      ...(parsed.settings || {}),
      materialTypes: validTypes,
      materialCategories: parsed.settings?.materialCategories?.length
        ? parsed.settings.materialCategories
        : DEFAULT_MATERIAL_CATEGORIES,
    },
    projects:        parsed.projects ? migrateProjects(parsed.projects) : initialState.projects,
    activeProjectId: parsed.activeProjectId ?? initialState.activeProjectId,
    templates:       parsed.templates  ?? initialState.templates,
    savedBlocks:     parsed.savedBlocks ?? initialState.savedBlocks,
  };
}

const STATE_URL = 'https://functions.poehali.dev/a257bd1a-a3a1-40e0-95b5-bbd561a371e4';

// Загрузка из localStorage (синхронный кэш для быстрого старта)
function loadLocalState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return parseAndMerge(saved);
  } catch (e) { void e; }
  try {
    const prev = localStorage.getItem(STORAGE_KEY_PREV);
    if (prev) return parseAndMerge(prev);
  } catch (e) { void e; }
  return initialState;
}

function saveLocalState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { void e; }
}

// Debounce сохранения в БД
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let currentToken: string | null = null;

export function setStoreToken(token: string) {
  currentToken = token;
}

function scheduleSaveToDb(state: AppState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!currentToken) return;
    fetch(`${STATE_URL}?token=${encodeURIComponent(currentToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    }).catch(() => void 0);
  }, 1500); // сохраняем через 1.5с после последнего изменения
}

export async function loadStateFromDb(token: string): Promise<AppState | null> {
  try {
    const res = await fetch(`${STATE_URL}?token=${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.state) return null;
    const state = parseAndMerge(JSON.stringify(data.state));
    saveLocalState(state); // обновляем кэш
    return state;
  } catch {
    return null;
  }
}

let globalState: AppState = loadLocalState();
const listeners: Set<() => void> = new Set();

function setState(updater: (s: AppState) => AppState) {
  globalState = updater(globalState);
  saveLocalState(globalState);
  scheduleSaveToDb(globalState);
  listeners.forEach(fn => fn());
}

export function forceSetGlobalState(state: AppState) {
  globalState = state;
  saveLocalState(state);
  listeners.forEach(fn => fn());
}

// Немедленно сохранить текущий state в БД (без debounce)
export function saveStateToDb() {
  if (!currentToken) return;
  fetch(`${STATE_URL}?token=${encodeURIComponent(currentToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: globalState }),
  }).catch(() => void 0);
}

export function useStore() {
  const [, forceUpdate] = useState(0);

  const subscribe = useCallback(() => {
    const fn = () => forceUpdate(n => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  useState(() => {
    const unsub = subscribe();
    return unsub;
  });

  const state = globalState;

  // Суммирует все активные наценки нужного типа.
  // Если наценок нет вообще или все выключены — возвращает basePrice без изменений.
  const calcPriceWithMarkup = (basePrice: number, applyTo: 'materials' | 'services' = 'materials') => {
    const allMarkupItems = state.expenses.filter(e =>
      e.type === 'markup' && e.applyTo === applyTo
    );
    const activeMarkupItems = allMarkupItems.filter(e => e.enabled !== false);
    // Если есть хотя бы одна наценка этого типа — применяем только активные
    if (allMarkupItems.length > 0) {
      if (activeMarkupItems.length === 0) return basePrice;
      const totalMarkupPct = activeMarkupItems.reduce((s, e) => s + e.value, 0);
      return Math.round(basePrice * (1 + totalMarkupPct / 100));
    }
    // Нет ни одной наценки — используем fallback из настроек
    const fallback = applyTo === 'materials' ? state.settings.markupMaterial : state.settings.markupService;
    return Math.round(basePrice * (1 + fallback / 100));
  };

  // Считает полный итог проекта с учётом всех включённых расходов.
  // ВАЖНО: CalcRow.price — это уже розничная цена (с наценкой на материалы/услуги).
  // Наценки markup/materials и markup/services используются ТОЛЬКО при подборе из базы (calcPriceWithMarkup).
  // В итоговом расчёте эти наценки НЕ применяются повторно — иначе будет двойное начисление.
  const calcProjectTotals = (project: Project) => {
    const activeExpenses = state.expenses.filter(e => e.enabled !== false);

    // Суммы из строк: price — розничная (уже с наценкой на материалы/услуги)
    const rawMaterials = project.blocks.reduce((sum, b) =>
      sum + b.rows.reduce((s, r) => s + r.qty * r.price, 0), 0);
    const rawServices = project.serviceBlocks.reduce((sum, b) =>
      sum + b.rows.reduce((s, r) => s + r.qty * r.price, 0), 0);

    // base = розничная стоимость материалов + услуг (наценка уже внутри)
    const base = rawMaterials + rawServices;

    // Наценка на итог целиком (markup/total) — дополнительная надбавка поверх всего
    const totalMarkupItems = activeExpenses.filter(e => e.type === 'markup' && e.applyTo === 'total');
    const totalMarkupPct = totalMarkupItems.reduce((s, e) => s + e.value, 0);
    const totalMarkupAmount = Math.round(base * totalMarkupPct / 100);

    // Наценки на конкретные блоки (markup/block) — дополнительная надбавка на блок
    const blockExtras = project.blocks.map(b => {
      const blockBase = b.rows.reduce((s, r) => s + r.qty * r.price, 0);
      const blockMarkups = activeExpenses.filter(e =>
        e.type === 'markup' && e.applyTo === 'block' && (e.blockIds || []).includes(b.id)
      );
      const extraPct = blockMarkups.reduce((s, e) => s + e.value, 0);
      const extra = Math.round(blockBase * extraPct / 100);
      return { blockId: b.id, blockName: b.name, base: blockBase, extra };
    });

    // База для накладных расходов = base + наценка на итог + надбавки на блоки
    const blockExtraTotal = blockExtras.reduce((s, b) => s + b.extra, 0);
    const baseForOverhead = base + totalMarkupAmount + blockExtraTotal;

    // Процентные накладные расходы (percent) — от итоговой базы с наценками
    const percentExpenses = activeExpenses.filter(e => e.type === 'percent');
    const percentAmount = percentExpenses.reduce((s, e) => s + Math.round(baseForOverhead * e.value / 100), 0);

    // Фиксированные накладные расходы
    const fixedExpenses = activeExpenses.filter(e => e.type === 'fixed');
    const fixedAmount = fixedExpenses.reduce((s, e) => s + e.value, 0);

    const grandTotal = baseForOverhead + percentAmount + fixedAmount;

    return {
      rawMaterials,
      rawServices,
      base,
      totalMarkupAmount,
      totalMarkupPct,
      percentAmount,
      fixedAmount,
      blockExtraTotal,
      blockExtras,
      grandTotal,
      activeExpenses,
    };
  };

  const getTypeName = (typeId?: string) =>
    state.settings.materialTypes.find(t => t.id === typeId)?.name || '';

  const getTypeById = (typeId?: string) =>
    state.settings.materialTypes.find(t => t.id === typeId);

  const getManufacturerById = (id?: string) =>
    state.manufacturers.find(m => m.id === id);

  const getVendorById = (id?: string) =>
    state.vendors.find(v => v.id === id);

  const getActiveProject = () =>
    state.projects.find(p => p.id === state.activeProjectId) || null;

  const updateProject = (projectId: string, updater: (p: Project) => Project) => {
    setState(s => ({
      ...s,
      projects: s.projects.map(p => p.id === projectId ? updater(p) : p)
    }));
  };

  const addBlock = (projectId: string) => {
    const id = `b${Date.now()}`;
    updateProject(projectId, p => ({
      ...p,
      blocks: [...p.blocks, {
        id,
        name: 'Новый блок',
        allowedTypeIds: [],
        visibleColumns: DEFAULT_VISIBLE_COLUMNS,
        rows: []
      }]
    }));
  };

  const updateBlock = (projectId: string, blockId: string, data: Partial<CalcBlock>) => {
    updateProject(projectId, p => ({
      ...p,
      blocks: p.blocks.map(b => b.id === blockId ? { ...b, ...data } : b)
    }));
  };

  const deleteBlock = (projectId: string, blockId: string) => {
    updateProject(projectId, p => ({
      ...p,
      blocks: p.blocks.filter(b => b.id !== blockId)
    }));
  };

  const addRow = (projectId: string, blockId: string) => {
    const id = `r${Date.now()}`;
    const newRow: CalcRow = { id, name: '', unit: 'м²', qty: 1, price: 0 };
    updateProject(projectId, p => ({
      ...p,
      blocks: p.blocks.map(b => b.id === blockId ? { ...b, rows: [...b.rows, newRow] } : b)
    }));
  };

  const updateRow = (projectId: string, blockId: string, rowId: string, data: Partial<CalcRow>) => {
    updateProject(projectId, p => ({
      ...p,
      blocks: p.blocks.map(b =>
        b.id === blockId
          ? { ...b, rows: b.rows.map(r => r.id === rowId ? { ...r, ...data } : r) }
          : b
      )
    }));
  };

  const deleteRow = (projectId: string, blockId: string, rowId: string) => {
    updateProject(projectId, p => ({
      ...p,
      blocks: p.blocks.map(b =>
        b.id === blockId ? { ...b, rows: b.rows.filter(r => r.id !== rowId) } : b
      )
    }));
  };

  // Обновляет розничные цены всех строк проекта по текущим наценкам из расходов.
  // Обновляются только строки, привязанные к материалу из базы (materialId присутствует).
  // Строки с ценой вручную (без materialId) не трогаются.
  const refreshProjectPrices = (projectId: string) => {
    updateProject(projectId, p => ({
      ...p,
      blocks: p.blocks.map(b => ({
        ...b,
        rows: b.rows.map(r => {
          if (!r.materialId) return r; // ручная строка — не трогаем
          const mat = state.materials.find(m => m.id === r.materialId);
          if (!mat) return r;
          // Если строка привязана к варианту — берём цену варианта
          const variant = r.variantId ? (mat.variants || []).find(v => v.id === r.variantId) : null;
          const newBasePrice = variant ? variant.basePrice : mat.basePrice;
          const newPrice = calcPriceWithMarkup(newBasePrice, 'materials');
          return { ...r, basePrice: newBasePrice, price: newPrice };
        }),
      })),
      serviceBlocks: p.serviceBlocks.map(sb => ({
        ...sb,
        rows: sb.rows.map(r => {
          if (!r.serviceId) return r; // ручная строка — не трогаем
          const svc = state.services.find(s => s.id === r.serviceId);
          if (!svc) return r;
          const newPrice = calcPriceWithMarkup(svc.basePrice, 'services');
          return { ...r, price: newPrice };
        }),
      })),
    }));
  };

  const addServiceBlock = (projectId: string) => {
    const id = `sb${Date.now()}`;
    updateProject(projectId, p => ({
      ...p,
      serviceBlocks: [...p.serviceBlocks, { id, name: 'Новый блок', rows: [] }]
    }));
  };

  const updateServiceBlock = (projectId: string, blockId: string, data: Partial<ServiceBlock>) => {
    updateProject(projectId, p => ({
      ...p,
      serviceBlocks: p.serviceBlocks.map(b => b.id === blockId ? { ...b, ...data } : b)
    }));
  };

  const deleteServiceBlock = (projectId: string, blockId: string) => {
    updateProject(projectId, p => ({
      ...p,
      serviceBlocks: p.serviceBlocks.filter(b => b.id !== blockId)
    }));
  };

  const moveBlock = (projectId: string, blockId: string, direction: 'up' | 'down') => {
    updateProject(projectId, p => {
      const arr = [...p.blocks];
      const idx = arr.findIndex(b => b.id === blockId);
      if (idx < 0) return p;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= arr.length) return p;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return { ...p, blocks: arr };
    });
  };

  const moveServiceBlock = (projectId: string, blockId: string, direction: 'up' | 'down') => {
    updateProject(projectId, p => {
      const arr = [...p.serviceBlocks];
      const idx = arr.findIndex(b => b.id === blockId);
      if (idx < 0) return p;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= arr.length) return p;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return { ...p, serviceBlocks: arr };
    });
  };

  const addServiceRow = (projectId: string, blockId: string) => {
    const id = `sr${Date.now()}`;
    const newRow: ServiceRow = { id, name: '', unit: 'шт', qty: 1, price: 0 };
    updateProject(projectId, p => ({
      ...p,
      serviceBlocks: p.serviceBlocks.map(b =>
        b.id === blockId ? { ...b, rows: [...b.rows, newRow] } : b
      )
    }));
  };

  const updateServiceRow = (projectId: string, blockId: string, rowId: string, data: Partial<ServiceRow>) => {
    updateProject(projectId, p => ({
      ...p,
      serviceBlocks: p.serviceBlocks.map(b =>
        b.id === blockId
          ? { ...b, rows: b.rows.map(r => r.id === rowId ? { ...r, ...data } : r) }
          : b
      )
    }));
  };

  const deleteServiceRow = (projectId: string, blockId: string, rowId: string) => {
    updateProject(projectId, p => ({
      ...p,
      serviceBlocks: p.serviceBlocks.map(b =>
        b.id === blockId ? { ...b, rows: b.rows.filter(r => r.id !== rowId) } : b
      )
    }));
  };

  const updateProjectInfo = (projectId: string, data: Partial<Project>) => {
    setState(s => ({
      ...s,
      projects: s.projects.map(p => p.id === projectId ? { ...p, ...data } : p)
    }));
  };

  const createProject = () => {
    const id = `p${Date.now()}`;
    const newProject: Project = {
      id, client: '', object: 'Новый проект', address: '', phone: '',
      messenger: 'WhatsApp',
      createdAt: new Date().toISOString().split('T')[0],
      blocks: [{ id: `b${Date.now()}`, name: 'Корпус', allowedTypeIds: [], visibleColumns: DEFAULT_VISIBLE_COLUMNS, rows: [] }],
      serviceBlocks: [],
    };
    setState(s => ({ ...s, projects: [...s.projects, newProject], activeProjectId: id }));
    return id;
  };

  const deleteProject = (projectId: string) => {
    setState(s => {
      const remaining = s.projects.filter(p => p.id !== projectId);
      return { ...s, projects: remaining, activeProjectId: remaining.length > 0 ? remaining[remaining.length - 1].id : null };
    });
  };

  // ===== MANUFACTURERS =====
  const addManufacturer = (m: Omit<Manufacturer, 'id'>) => {
    const id = `mfr${Date.now()}`;
    setState(s => ({ ...s, manufacturers: [...s.manufacturers, { ...m, id }] }));
  };
  const updateManufacturer = (id: string, data: Partial<Manufacturer>) => {
    setState(s => ({ ...s, manufacturers: s.manufacturers.map(m => m.id === id ? { ...m, ...data } : m) }));
  };
  const deleteManufacturer = (id: string) => {
    setState(s => ({ ...s, manufacturers: s.manufacturers.filter(m => m.id !== id) }));
  };

  // ===== VENDORS =====
  const addVendor = (v: Omit<Vendor, 'id'>) => {
    const id = `v${Date.now()}`;
    setState(s => ({ ...s, vendors: [...s.vendors, { ...v, id }] }));
  };
  const updateVendor = (id: string, data: Partial<Vendor>) => {
    setState(s => ({ ...s, vendors: s.vendors.map(v => v.id === id ? { ...v, ...data } : v) }));
  };
  const deleteVendor = (id: string) => {
    setState(s => ({ ...s, vendors: s.vendors.filter(v => v.id !== id) }));
  };

  const addMaterial = (material: Omit<Material, 'id'>) => {
    const id = `m${Date.now()}`;
    setState(s => ({ ...s, materials: [...s.materials, { ...material, id }] }));
  };

  // Батчевый импорт СКАТ — все 141 материал с 5 вариантами цен в одном setState
  const importSkatBatch = (
    manufacturer: Omit<Manufacturer, 'id'> & { existingId?: string },
    categories: Array<Omit<MaterialCategory, 'id'> & { key: string }>,
    materials: Array<{
      name: string; typeId: string; vendorId?: string; thickness?: number; article: string;
      categoryKey?: string; unit: Unit;
      variants: Array<{ variantId: string; size?: string; thickness?: number; params: string; basePrice: number }>;
    }>
  ): { created: number; updated: number; skipped: number } => {
    const ts = Date.now();
    const existingArticles = new Set(state.materials.map(m => m.article).filter(Boolean));
    let created = 0; let updated = 0; let skipped = 0;
    materials.forEach(mat => {
      const ex = state.materials.find(m => m.article === mat.article);
      if (ex) {
        if (ex.variants && ex.variants.length === mat.variants.length) skipped++;
        else updated++;
      } else created++;
    });

    setState(s => {
      let next = { ...s };

      // 1. Производитель
      let mfrId = manufacturer.existingId || '';
      if (!mfrId) {
        mfrId = `mfr${ts}`;
        next = { ...next, manufacturers: [...next.manufacturers, { ...manufacturer, id: mfrId }] };
      }

      // 2. Категории серий (subsection)
      const catIdMap: Record<string, string> = {};
      const newCats = [...(next.settings.materialCategories || [])];
      categories.forEach((cat, i) => {
        const existing = newCats.find(c => c.note === cat.note);
        if (existing) { catIdMap[cat.key] = existing.id; }
        else {
          const catId = `mc${ts}${i}`;
          catIdMap[cat.key] = catId;
          newCats.push({ ...cat, id: catId });
        }
      });
      next = { ...next, settings: { ...next.settings, materialCategories: newCats } };

      // 3. Материалы с вариантами
      const arts = new Map(next.materials.map((m, i) => [m.article, i]));
      const newMaterials = [...next.materials];
      materials.forEach((mat, i) => {
        const catId = mat.categoryKey ? catIdMap[mat.categoryKey] : undefined;
        const variants: MaterialVariant[] = mat.variants.map(v => ({
          id: v.variantId, size: v.size, thickness: v.thickness, params: v.params, basePrice: v.basePrice,
        }));
        const basePrice = mat.variants[0]?.basePrice ?? 0;
        if (arts.has(mat.article)) {
          // Обновляем варианты существующего
          const idx = arts.get(mat.article)!;
          newMaterials[idx] = { ...newMaterials[idx], variants, basePrice };
        } else {
          newMaterials.push({
            id: `m${ts}${i}`, manufacturerId: mfrId, categoryId: catId,
            name: mat.name, typeId: mat.typeId, vendorId: mat.vendorId,
            thickness: mat.thickness, article: mat.article, unit: mat.unit, basePrice, variants,
          });
        }
      });
      next = { ...next, materials: newMaterials };

      return next;
    });

    return { created, updated, skipped };
  };

  // Патч всех материалов СКАТ: тип и поставщик
  const patchSkatMaterials = (typeId: string, vendorId: string): number => {
    let count = 0;
    setState(s => {
      const newMaterials = s.materials.map(m => {
        if (!m.article?.startsWith('skat__')) return m;
        count++;
        return { ...m, typeId, vendorId };
      });
      return { ...s, materials: newMaterials };
    });
    return count;
  };

  // Батчевое обновление цен СКАТ (все варианты сразу) + опционально size/thickness
  const updateSkatPrices = (
    updates: Array<{
      article: string;
      variants: Array<{ variantId: string; basePrice: number; size?: string; thickness?: number }>;
    }>
  ): number => {
    let count = 0;
    setState(s => {
      const newMaterials = s.materials.map(m => {
        if (!m.article) return m;
        const upd = updates.find(u => u.article === m.article);
        if (!upd) return m;
        const newVariants = (m.variants || []).map(v => {
          const vu = upd.variants.find(x => x.variantId === v.id);
          if (!vu) return v;
          return {
            ...v,
            basePrice: vu.basePrice,
            ...(vu.size !== undefined ? { size: vu.size } : {}),
            ...(vu.thickness !== undefined ? { thickness: vu.thickness } : {}),
          };
        });
        count++;
        return { ...m, variants: newVariants, basePrice: newVariants[0]?.basePrice ?? m.basePrice };
      });
      return { ...s, materials: newMaterials };
    });
    return count;
  };
  const updateMaterial = (id: string, data: Partial<Material>) => {
    setState(s => ({ ...s, materials: s.materials.map(m => m.id === id ? { ...m, ...data } : m) }));
  };
  const deleteMaterial = (id: string) => {
    setState(s => ({ ...s, materials: s.materials.filter(m => m.id !== id) }));
  };

  const addService = (service: Omit<Service, 'id'>) => {
    const id = `sv${Date.now()}`;
    setState(s => ({ ...s, services: [...s.services, { ...service, id }] }));
  };
  const updateService = (id: string, data: Partial<Service>) => {
    setState(s => ({ ...s, services: s.services.map(sv => sv.id === id ? { ...sv, ...data } : sv) }));
  };
  const deleteService = (id: string) => {
    setState(s => ({ ...s, services: s.services.filter(sv => sv.id !== id) }));
  };

  const addExpense = (expense: Omit<ExpenseItem, 'id'>) => {
    const id = `e${Date.now()}`;
    setState(s => ({ ...s, expenses: [...s.expenses, { ...expense, id }] }));
  };
  const updateExpense = (id: string, data: Partial<ExpenseItem>) => {
    setState(s => ({ ...s, expenses: s.expenses.map(e => e.id === id ? { ...e, ...data } : e) }));
  };
  const deleteExpense = (id: string) => {
    setState(s => ({ ...s, expenses: s.expenses.filter(e => e.id !== id) }));
  };

  const updateSettings = (data: Partial<Settings>) => {
    setState(s => ({ ...s, settings: { ...s.settings, ...data } }));
  };

  const addMaterialType = (mt: Omit<MaterialType, 'id'>) => {
    const id = `mt${Date.now()}`;
    setState(s => ({ ...s, settings: { ...s.settings, materialTypes: [...s.settings.materialTypes, { ...mt, id }] } }));
  };
  const updateMaterialType = (id: string, data: Partial<MaterialType>) => {
    setState(s => ({ ...s, settings: { ...s.settings, materialTypes: s.settings.materialTypes.map(t => t.id === id ? { ...t, ...data } : t) } }));
  };
  const deleteMaterialType = (id: string) => {
    setState(s => ({ ...s, settings: { ...s.settings, materialTypes: s.settings.materialTypes.filter(t => t.id !== id) } }));
  };

  // ===== TEMPLATES =====
  const saveTemplate = (projectId: string, name: string, description?: string) => {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return;
    const id = `tpl${Date.now()}`;
    const template: CalcTemplate = {
      id,
      name,
      description,
      createdAt: new Date().toISOString().split('T')[0],
      blocks: project.blocks.map(b => ({
        name: b.name,
        allowedTypeIds: b.allowedTypeIds,
        visibleColumns: b.visibleColumns,
        rows: b.rows.map(r => ({
          name: r.name,
          materialId: r.materialId,
          unit: r.unit,
          qty: r.qty,
        })),
      })),
      serviceBlocks: project.serviceBlocks.map(sb => ({
        name: sb.name,
        rows: sb.rows.map(r => ({
          name: r.name,
          serviceId: r.serviceId,
          unit: r.unit,
          qty: r.qty,
        })),
      })),
    };
    setState(s => ({ ...s, templates: [...s.templates, template] }));
    return id;
  };

  const loadTemplate = (projectId: string, templateId: string) => {
    const template = state.templates.find(t => t.id === templateId);
    if (!template) return;
    const newBlocks: CalcBlock[] = template.blocks.map(tb => {
      const blockId = `b${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
      return {
        id: blockId,
        name: tb.name,
        allowedTypeIds: tb.allowedTypeIds,
        visibleColumns: tb.visibleColumns?.includes('baseprice') ? tb.visibleColumns : DEFAULT_VISIBLE_COLUMNS,
        rows: tb.rows.map(tr => {
          const mat = tr.materialId ? state.materials.find(m => m.id === tr.materialId) : undefined;
          const basePrice = mat ? mat.basePrice : 0;
          const price = mat ? calcPriceWithMarkup(mat.basePrice, 'materials') : 0;
          return {
            id: `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
            name: tr.name,
            materialId: tr.materialId,
            manufacturerId: mat?.manufacturerId,
            vendorId: mat?.vendorId,
            typeId: mat?.typeId,
            color: mat?.color,
            article: mat?.article,
            thickness: mat?.thickness,
            unit: tr.unit,
            qty: tr.qty,
            basePrice,
            price,
          } as CalcRow;
        }),
      };
    });
    const newServiceBlocks = template.serviceBlocks.map(tsb => ({
      id: `sb${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      name: tsb.name,
      rows: tsb.rows.map(tr => {
        const service = tr.serviceId ? state.services.find(s => s.id === tr.serviceId) : undefined;
        const price = service ? calcPriceWithMarkup(service.basePrice, 'services') : 0;
        return {
          id: `sr${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
          name: tr.name,
          serviceId: tr.serviceId,
          unit: tr.unit,
          qty: tr.qty,
          price,
        };
      }),
    }));
    setState(s => ({
      ...s,
      projects: s.projects.map(p => p.id === projectId
        ? { ...p, blocks: newBlocks, serviceBlocks: newServiceBlocks }
        : p
      ),
    }));
  };

  const deleteTemplate = (templateId: string) => {
    setState(s => ({ ...s, templates: s.templates.filter(t => t.id !== templateId) }));
  };

  const updateTemplate = (templateId: string, data: Partial<Pick<CalcTemplate, 'name' | 'description'>>) => {
    setState(s => ({ ...s, templates: s.templates.map(t => t.id === templateId ? { ...t, ...data } : t) }));
  };

  const overwriteTemplate = (templateId: string, projectId: string) => {
    const project = state.projects.find(p => p.id === projectId);
    const template = state.templates.find(t => t.id === templateId);
    if (!project || !template) return;
    const updated: CalcTemplate = {
      ...template,
      createdAt: new Date().toISOString().split('T')[0],
      blocks: project.blocks.map(b => ({
        name: b.name,
        allowedTypeIds: b.allowedTypeIds,
        visibleColumns: b.visibleColumns,
        rows: b.rows.map(r => ({ name: r.name, materialId: r.materialId, unit: r.unit, qty: r.qty })),
      })),
      serviceBlocks: project.serviceBlocks.map(sb => ({
        name: sb.name,
        rows: sb.rows.map(r => ({ name: r.name, serviceId: r.serviceId, unit: r.unit, qty: r.qty })),
      })),
    };
    setState(s => ({ ...s, templates: s.templates.map(t => t.id === templateId ? updated : t) }));
  };

  const addExpenseGroup = (name: string) => {
    const id = `eg${Date.now()}`;
    setState(s => ({ ...s, expenseGroups: [...(s.expenseGroups || []), { id, name }] }));
    return id;
  };
  const updateExpenseGroup = (id: string, data: Partial<ExpenseGroup>) => {
    setState(s => ({ ...s, expenseGroups: (s.expenseGroups || []).map(g => g.id === id ? { ...g, ...data } : g) }));
  };
  const deleteExpenseGroup = (id: string) => {
    setState(s => ({
      ...s,
      expenseGroups: (s.expenseGroups || []).filter(g => g.id !== id),
      expenses: s.expenses.map(e => e.groupId === id ? { ...e, groupId: undefined } : e),
    }));
  };

  // ===== SAVED BLOCKS =====
  const createSavedBlock = (name: string) => {
    const id = `sb_${Date.now()}`;
    const block: SavedBlock = {
      id,
      name,
      allowedTypeIds: [],
      visibleColumns: DEFAULT_VISIBLE_COLUMNS,
      rows: [],
      createdAt: new Date().toISOString().split('T')[0],
    };
    setState(s => ({ ...s, savedBlocks: [...(s.savedBlocks || []), block] }));
    return id;
  };

  const updateSavedBlock = (blockId: string, data: Partial<SavedBlock>) => {
    setState(s => ({
      ...s,
      savedBlocks: (s.savedBlocks || []).map(b => b.id === blockId ? { ...b, ...data } : b),
    }));
  };

  const deleteSavedBlock = (blockId: string) => {
    setState(s => ({ ...s, savedBlocks: (s.savedBlocks || []).filter(b => b.id !== blockId) }));
  };

  const reorderSavedBlocks = (orderedIds: string[]) => {
    setState(s => {
      const map = new Map((s.savedBlocks || []).map(b => [b.id, b]));
      const reordered = orderedIds.map(id => map.get(id)).filter(Boolean) as typeof s.savedBlocks;
      return { ...s, savedBlocks: reordered };
    });
  };

  const addSavedBlockRow = (blockId: string) => {
    const id = `r${Date.now()}`;
    const newRow: CalcRow = { id, name: '', unit: 'м²', qty: 1, price: 0 };
    setState(s => ({
      ...s,
      savedBlocks: (s.savedBlocks || []).map(b =>
        b.id === blockId ? { ...b, rows: [...b.rows, newRow] } : b
      ),
    }));
  };

  const updateSavedBlockRow = (blockId: string, rowId: string, data: Partial<CalcRow>) => {
    setState(s => ({
      ...s,
      savedBlocks: (s.savedBlocks || []).map(b =>
        b.id === blockId
          ? { ...b, rows: b.rows.map(r => r.id === rowId ? { ...r, ...data } : r) }
          : b
      ),
    }));
  };

  const deleteSavedBlockRow = (blockId: string, rowId: string) => {
    setState(s => ({
      ...s,
      savedBlocks: (s.savedBlocks || []).map(b =>
        b.id === blockId ? { ...b, rows: b.rows.filter(r => r.id !== rowId) } : b
      ),
    }));
  };

  // Сборки (assemblies) внутри сохранённого блока
  const addAssembly = (blockId: string, name: string) => {
    const id = `asm_${Date.now()}`;
    setState(s => ({
      ...s,
      savedBlocks: (s.savedBlocks || []).map(b =>
        b.id === blockId
          ? { ...b, assemblies: [...(b.assemblies || []), { id, name, rows: [] }] }
          : b
      ),
    }));
    return id;
  };

  const updateAssembly = (blockId: string, assemblyId: string, data: Partial<import('./types').BlockAssembly>) => {
    setState(s => ({
      ...s,
      savedBlocks: (s.savedBlocks || []).map(b =>
        b.id === blockId
          ? { ...b, assemblies: (b.assemblies || []).map(a => a.id === assemblyId ? { ...a, ...data } : a) }
          : b
      ),
    }));
  };

  const deleteAssembly = (blockId: string, assemblyId: string) => {
    setState(s => ({
      ...s,
      savedBlocks: (s.savedBlocks || []).map(b =>
        b.id === blockId
          ? { ...b, assemblies: (b.assemblies || []).filter(a => a.id !== assemblyId) }
          : b
      ),
    }));
  };

  const addAssemblyRow = (blockId: string, assemblyId: string) => {
    const id = `r${Date.now()}`;
    const newRow: CalcRow = { id, name: '', unit: 'м²', qty: 1, price: 0 };
    setState(s => ({
      ...s,
      savedBlocks: (s.savedBlocks || []).map(b =>
        b.id === blockId
          ? { ...b, assemblies: (b.assemblies || []).map(a =>
              a.id === assemblyId ? { ...a, rows: [...a.rows, newRow] } : a
            )}
          : b
      ),
    }));
  };

  const updateAssemblyRow = (blockId: string, assemblyId: string, rowId: string, data: Partial<CalcRow>) => {
    setState(s => ({
      ...s,
      savedBlocks: (s.savedBlocks || []).map(b =>
        b.id === blockId
          ? { ...b, assemblies: (b.assemblies || []).map(a =>
              a.id === assemblyId
                ? { ...a, rows: a.rows.map(r => r.id === rowId ? { ...r, ...data } : r) }
                : a
            )}
          : b
      ),
    }));
  };

  const deleteAssemblyRow = (blockId: string, assemblyId: string, rowId: string) => {
    setState(s => ({
      ...s,
      savedBlocks: (s.savedBlocks || []).map(b =>
        b.id === blockId
          ? { ...b, assemblies: (b.assemblies || []).map(a =>
              a.id === assemblyId ? { ...a, rows: a.rows.filter(r => r.id !== rowId) } : a
            )}
          : b
      ),
    }));
  };

  const resolveRows = (rows: CalcRow[]) => rows.map(r => {
    const mat = r.materialId ? state.materials.find(m => m.id === r.materialId) : undefined;
    const variant = (mat && r.variantId) ? (mat.variants || []).find(v => v.id === r.variantId) : null;
    const basePrice = variant ? variant.basePrice : (mat ? mat.basePrice : (r.basePrice ?? 0));
    const price = mat ? calcPriceWithMarkup(basePrice, 'materials') : r.price;
    return { ...r, id: `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`, basePrice, price };
  });

  // Вставить сохранённый блок в проект (копирует строки с актуальными ценами)
  const insertSavedBlockToProject = (projectId: string, savedBlockId: string, assemblyId?: string) => {
    const sb = (state.savedBlocks || []).find(b => b.id === savedBlockId);
    if (!sb) return;
    const id = `b${Date.now()}`;
    // Если указана сборка — берём её строки, иначе дефолтные
    const sourceRows = assemblyId
      ? (sb.assemblies || []).find(a => a.id === assemblyId)?.rows || sb.rows
      : sb.rows;
    const assemblyName = assemblyId
      ? (sb.assemblies || []).find(a => a.id === assemblyId)?.name
      : undefined;
    const newBlock: CalcBlock = {
      id,
      name: assemblyName ? `${sb.name} — ${assemblyName}` : sb.name,
      allowedTypeIds: sb.allowedTypeIds,
      visibleColumns: sb.visibleColumns,
      rows: resolveRows(sourceRows),
    };
    updateProject(projectId, p => ({ ...p, blocks: [...p.blocks, newBlock] }));
  };

  const addUnit = (unit: string) => {
    if (!unit.trim() || state.settings.units.includes(unit.trim())) return;
    setState(s => ({ ...s, settings: { ...s.settings, units: [...s.settings.units, unit.trim()] } }));
  };
  const deleteUnit = (unit: string) => {
    setState(s => ({ ...s, settings: { ...s.settings, units: s.settings.units.filter(u => u !== unit) } }));
  };

  const getCategoryById = (id?: string) =>
    (state.settings.materialCategories || []).find(c => c.id === id);

  const getCategoriesForType = (typeId?: string) =>
    (state.settings.materialCategories || []).filter(c => {
      const ids = c.typeIds?.length ? c.typeIds : (c.typeId ? [c.typeId] : []);
      return ids.length === 0 || (typeId ? ids.includes(typeId) : true);
    });

  const addMaterialCategory = (cat: Omit<MaterialCategory, 'id'>) => {
    const id = `mc${Date.now()}`;
    setState(s => ({ ...s, settings: { ...s.settings, materialCategories: [...(s.settings.materialCategories || []), { ...cat, id }] } }));
  };
  const updateMaterialCategory = (id: string, data: Partial<MaterialCategory>) => {
    setState(s => ({ ...s, settings: { ...s.settings, materialCategories: (s.settings.materialCategories || []).map(c => c.id === id ? { ...c, ...data } : c) } }));
  };
  const deleteMaterialCategory = (id: string) => {
    setState(s => ({ ...s, settings: { ...s.settings, materialCategories: (s.settings.materialCategories || []).filter(c => c.id !== id) } }));
  };

  return {
    ...state,
    getActiveProject,
    calcPriceWithMarkup,
    calcProjectTotals,
    getTypeName, getTypeById,
    getManufacturerById, getVendorById,
    getCategoryById, getCategoriesForType,
    addBlock, updateBlock, deleteBlock,
    addRow, updateRow, deleteRow,
    addServiceBlock, updateServiceBlock, deleteServiceBlock,
    addServiceRow, updateServiceRow, deleteServiceRow,
    updateProjectInfo,
    createProject, deleteProject,
    addManufacturer, updateManufacturer, deleteManufacturer,
    addVendor, updateVendor, deleteVendor,
    addMaterial, updateMaterial, deleteMaterial, importSkatBatch, updateSkatPrices, patchSkatMaterials,
    addService, updateService, deleteService,
    addExpense, updateExpense, deleteExpense,
    addExpenseGroup, updateExpenseGroup, deleteExpenseGroup,
    refreshProjectPrices,
    updateSettings,
    addMaterialType, updateMaterialType, deleteMaterialType,
    addMaterialCategory, updateMaterialCategory, deleteMaterialCategory,
    addUnit, deleteUnit,
    moveBlock, moveServiceBlock,
    saveTemplate, loadTemplate, deleteTemplate, updateTemplate, overwriteTemplate,
    createSavedBlock, updateSavedBlock, deleteSavedBlock, reorderSavedBlocks,
    addSavedBlockRow, updateSavedBlockRow, deleteSavedBlockRow,
    addAssembly, updateAssembly, deleteAssembly,
    addAssemblyRow, updateAssemblyRow, deleteAssemblyRow,
    insertSavedBlockToProject,
    setState: (updater: (s: AppState) => AppState) => setState(updater),
  };
}