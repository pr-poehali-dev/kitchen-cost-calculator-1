import type { Manufacturer, Vendor, Material, MaterialVariant, MaterialCategory } from '../types';
import { setState } from '../stateCore';

// ── Производители ─────────────────────────────────────────────
export const addManufacturer = (m: Omit<Manufacturer, 'id'>) => {
  const id = `mfr${Date.now()}${Math.random().toString(36).slice(2)}`;
  setState(s => ({ ...s, manufacturers: [...s.manufacturers, { ...m, id }] }));
};

export const updateManufacturer = (id: string, data: Partial<Manufacturer>) => {
  setState(s => ({ ...s, manufacturers: s.manufacturers.map(m => m.id === id ? { ...m, ...data } : m) }));
};

export const deleteManufacturer = (id: string) => {
  setState(s => ({ ...s, manufacturers: s.manufacturers.filter(m => m.id !== id) }));
};

// ── Поставщики ────────────────────────────────────────────────
export const addVendor = (v: Omit<Vendor, 'id'>) => {
  const id = `v${Date.now()}${Math.random().toString(36).slice(2)}`;
  setState(s => ({ ...s, vendors: [...s.vendors, { ...v, id }] }));
};

export const updateVendor = (id: string, data: Partial<Vendor>) => {
  setState(s => ({ ...s, vendors: s.vendors.map(v => v.id === id ? { ...v, ...data } : v) }));
};

export const deleteVendor = (id: string) => {
  setState(s => ({ ...s, vendors: s.vendors.filter(v => v.id !== id) }));
};

// ── Материалы ─────────────────────────────────────────────────
export const addMaterial = (material: Omit<Material, 'id'>) => {
  const id = `m${Date.now()}${Math.random().toString(36).slice(2)}`;
  const today = new Date().toISOString().slice(0, 10);
  setState(s => ({ ...s, materials: [...s.materials, { ...material, id, priceUpdatedAt: today }] }));
};

export const updateMaterial = (id: string, data: Partial<Material>) => {
  setState(s => ({
    ...s,
    materials: s.materials.map(m => {
      if (m.id !== id) return m;
      const updated = { ...m, ...data };
      if (data.basePrice !== undefined && data.basePrice !== m.basePrice) {
        const today = new Date().toISOString().slice(0, 10);
        updated.priceHistory = [{ date: today, price: m.basePrice }, ...(m.priceHistory || [])].slice(0, 20);
        updated.priceUpdatedAt = today;
      }
      return updated;
    }),
  }));
};

export const deleteMaterial = (id: string) => {
  setState(s => ({ ...s, materials: s.materials.filter(m => m.id !== id) }));
};

export const duplicateMaterial = (id: string, currentMaterials: Material[]) => {
  const src = currentMaterials.find(m => m.id === id);
  if (!src) return;
  const newId = `m${Date.now()}${Math.random().toString(36).slice(2)}`;
  const today = new Date().toISOString().slice(0, 10);
  setState(s => ({
    ...s,
    materials: [...s.materials, { ...src, id: newId, name: `${src.name} (копия)`, priceUpdatedAt: today, priceHistory: [] }],
  }));
};

export const importSkatBatch = (
  manufacturer: Omit<Manufacturer, 'id'> & { existingId?: string },
  categories: Array<Omit<MaterialCategory, 'id'> & { key: string }>,
  materials: Array<{
    name: string; typeId: string; vendorId?: string; thickness?: number; article: string;
    categoryKey?: string; unit: string;
    groupKey?: string;
    variants: Array<{ variantId: string; size?: string; thickness?: number; params: string; basePrice: number; article?: string }>;
  }>,
  currentMaterials: Material[]
): { created: number; updated: number; skipped: number } => {
  const ts = Date.now();
  let created = 0; let updated = 0; let skipped = 0;

  materials.forEach(mat => {
    const ex = mat.groupKey
      ? currentMaterials.find(m => m.article === mat.groupKey)
      : currentMaterials.find(m => m.article === mat.article);
    if (ex) {
      if (ex.variants && ex.variants.length === mat.variants.length) skipped++;
      else updated++;
    } else created++;
  });

  setState(s => {
    let next = { ...s };

    let mfrId = manufacturer.existingId || '';
    if (!mfrId) {
      mfrId = `mfr${ts}`;
      next = { ...next, manufacturers: [...next.manufacturers, { ...manufacturer, id: mfrId }] };
    }

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

    const keyIndex = new Map(next.materials.map((m, i) => [m.article, i]));
    const newMaterials = [...next.materials];
    materials.forEach((mat, i) => {
      const lookupKey = mat.groupKey ?? mat.article;
      const catId = mat.categoryKey ? catIdMap[mat.categoryKey] : undefined;
      const variants: MaterialVariant[] = mat.variants.map(v => ({
        id: v.variantId, size: v.size, thickness: v.thickness, params: v.params, basePrice: v.basePrice,
        ...(v.article ? { article: v.article } : {}),
      }));
      const basePrice = mat.variants[0]?.basePrice ?? 0;
      if (keyIndex.has(lookupKey)) {
        const idx = keyIndex.get(lookupKey)!;
        newMaterials[idx] = { ...newMaterials[idx], variants, basePrice };
      } else {
        newMaterials.push({
          id: `m${ts}${i}`, manufacturerId: mfrId, categoryId: catId,
          name: mat.name, typeId: mat.typeId, vendorId: mat.vendorId,
          thickness: mat.thickness, article: lookupKey, unit: mat.unit, basePrice, variants,
        });
      }
    });
    next = { ...next, materials: newMaterials };
    return next;
  });

  return { created, updated, skipped };
};

export const patchSkatMaterials = (typeId: string, vendorId: string): number => {
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

export const updateSkatPrices = (
  updates: Array<{
    article: string;
    materialId?: string;
    variants: Array<{ variantId: string; basePrice: number; size?: string; thickness?: number }>;
  }>
): number => {
  let count = 0;
  setState(s => {
    const newMaterials = s.materials.map(m => {
      const upd = updates.find(u => u.materialId ? u.materialId === m.id : (m.article && u.article === m.article));
      if (!upd) return m;
      const newVariants = (m.variants || []).map(v => {
        const vu = upd.variants.find(x => x.variantId === v.id);
        if (!vu) return v;
        return {
          ...v, basePrice: vu.basePrice,
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

export const deleteLegacyBoyardMaterials = (): number => {
  let count = 0;
  setState(s => {
    const boyardMfrIds = new Set(
      s.manufacturers.filter(m => m.name.toLowerCase() === 'boyard').map(m => m.id)
    );
    if (boyardMfrIds.size === 0) return s;
    const filtered = s.materials.filter(m => {
      const isLegacy = boyardMfrIds.has(m.manufacturerId) && !m.article?.startsWith('boyard__group__');
      if (isLegacy) count++;
      return !isLegacy;
    });
    return { ...s, materials: filtered };
  });
  return count;
};
