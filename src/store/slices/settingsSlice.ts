import type { Settings, MaterialType, MaterialCategory } from '../types';
import { setState } from '../stateCore';

export const updateSettings = (data: Partial<Settings>) => {
  setState(s => ({ ...s, settings: { ...s.settings, ...data } }));
};

export const addUnit = (unit: string, currentUnits: string[]) => {
  if (!unit.trim() || currentUnits.includes(unit.trim())) return;
  setState(s => ({ ...s, settings: { ...s.settings, units: [...s.settings.units, unit.trim()] } }));
};

export const deleteUnit = (unit: string) => {
  setState(s => ({ ...s, settings: { ...s.settings, units: s.settings.units.filter(u => u !== unit) } }));
};

export const addMaterialType = (mt: Omit<MaterialType, 'id'>) => {
  const id = `mt${Date.now()}${Math.random().toString(36).slice(2)}`;
  setState(s => ({
    ...s,
    settings: { ...s.settings, materialTypes: [...s.settings.materialTypes, { ...mt, id }] },
  }));
};

export const updateMaterialType = (id: string, data: Partial<MaterialType>) => {
  setState(s => ({
    ...s,
    settings: { ...s.settings, materialTypes: s.settings.materialTypes.map(t => t.id === id ? { ...t, ...data } : t) },
  }));
};

export const deleteMaterialType = (id: string) => {
  setState(s => ({
    ...s,
    settings: { ...s.settings, materialTypes: s.settings.materialTypes.filter(t => t.id !== id) },
  }));
};

export const addMaterialCategory = (cat: Omit<MaterialCategory, 'id'>) => {
  const id = `mc${Date.now()}${Math.random().toString(36).slice(2)}`;
  setState(s => ({
    ...s,
    settings: { ...s.settings, materialCategories: [...(s.settings.materialCategories || []), { ...cat, id }] },
  }));
};

export const updateMaterialCategory = (id: string, data: Partial<MaterialCategory>) => {
  setState(s => ({
    ...s,
    settings: {
      ...s.settings,
      materialCategories: (s.settings.materialCategories || []).map(c => c.id === id ? { ...c, ...data } : c),
    },
  }));
};

export const deleteMaterialCategory = (id: string) => {
  setState(s => ({
    ...s,
    settings: {
      ...s.settings,
      materialCategories: (s.settings.materialCategories || []).filter(c => c.id !== id),
    },
  }));
};
