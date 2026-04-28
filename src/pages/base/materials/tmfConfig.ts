// ─── Конфигурация коллекций ТМФ ───────────────────────────────────────────────

export interface VariantDef {
  key: string;
  label: string;
  pricePattern: RegExp;
  colorSection?: RegExp;
}

export interface CollectionConfig {
  sheetName: string;
  label: string;
  variants: VariantDef[];
  allColorsInAllVariants?: boolean;
}

export const TMF_COLLECTIONS: CollectionConfig[] = [
  {
    sheetName: 'NanoШпон', label: 'NanoШпон',
    allColorsInAllVariants: true,
    variants: [
      { key: 'с_кромкой', label: 'С кромкой', pricePattern: /прямые фасады с кромкой/i },
    ],
  },
  {
    sheetName: 'UltraPet', label: 'UltraPet',
    allColorsInAllVariants: true,
    variants: [
      { key: 'с_кромкой', label: 'С кромкой', pricePattern: /прямые фасады с кромкой/i },
    ],
  },
  {
    sheetName: 'ExtraMat', label: 'ExtraMat',
    allColorsInAllVariants: true,
    variants: [
      { key: 'с_кромкой', label: 'С кромкой', pricePattern: /прямые фасады с кромкой/i },
    ],
  },
  {
    sheetName: 'SuperMat', label: 'SuperMat',
    allColorsInAllVariants: false,
    variants: [
      { key: 'одн',  label: 'Одностороннее', pricePattern: /одностороннее/i, colorSection: /одностороннее.*покрытие/i },
      { key: 'двух', label: 'Двухстороннее', pricePattern: /двухстороннее/i, colorSection: /двухстороннее.*покрытие/i },
    ],
  },
  {
    sheetName: 'SynchroWood', label: 'SynchroWood',
    allColorsInAllVariants: false,
    variants: [
      { key: '1кат', label: '1 категория', pricePattern: /1\s*категория/i, colorSection: /1\s*категория/i },
      { key: '2кат', label: '2 категория', pricePattern: /2\s*категория/i, colorSection: /2\s*категория/i },
    ],
  },
  {
    sheetName: 'SynchroStyle', label: 'SynchroStyle',
    allColorsInAllVariants: false,
    variants: [
      { key: '1кат', label: '1 категория', pricePattern: /1\s*категория/i, colorSection: /1\s*категория/i },
      { key: '2кат', label: '2 категория', pricePattern: /2\s*категория/i, colorSection: /2\s*категория/i },
    ],
  },
  {
    sheetName: 'Акрил', label: 'Акрил',
    allColorsInAllVariants: false,
    variants: [
      { key: '1кат_одн', label: '1 кат. одностороннее', pricePattern: /1\s*категория.*одностор/i, colorSection: /1\s*категория.*одностор/i },
      { key: '2кат_одн', label: '2 кат. одностороннее', pricePattern: /2\s*категория.*одностор/i, colorSection: /2\s*категория.*одностор/i },
      { key: '3кат',     label: '3 категория',           pricePattern: /3\s*категория/i,           colorSection: /3\s*категория/i },
    ],
  },
];

// ─── Стабильные ID ────────────────────────────────────────────────────────────

export function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

export function tmfColorMaterialId(collectionLabel: string, colorName: string): string {
  return `tmf__${norm(collectionLabel)}__${norm(colorName)}`;
}

export function tmfColorVariantId(collectionLabel: string, colorName: string, variantKey: string): string {
  return `tmf__${norm(collectionLabel)}__${norm(colorName)}__${norm(variantKey)}`;
}
