import { useSyncExternalStore } from 'react';
import type { AppState, Project, MaterialCategory, CalcRow } from './types';
import {
  getGlobalState, setState, listeners,
  setStoreToken, loadStateFromDb, forceSetGlobalState, saveStateToDb,
  undoProjects, canUndo, undoListeners,
} from './stateCore';

// Слайсы
import * as projectSlice from './slices/projectSlice';
import * as catalogSlice from './slices/catalogSlice';
import * as servicesSlice from './slices/servicesSlice';
import * as expensesSlice from './slices/expensesSlice';
import * as settingsSlice from './slices/settingsSlice';
import * as savedBlocksSlice from './slices/savedBlocksSlice';
import * as templatesSlice from './slices/templatesSlice';

export { setStoreToken, loadStateFromDb, forceSetGlobalState, saveStateToDb, undoProjects, canUndo, undoListeners };

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useStore() {
  const state = useSyncExternalStore(subscribe, getGlobalState, getGlobalState);

  // ── Вычисляемые хелперы (зависят от state) ────────────────────
  const calcPriceWithMarkup = (basePrice: number, applyTo: 'materials' | 'services' = 'materials') => {
    const allMarkupItems = state.expenses.filter(e => e.type === 'markup' && e.applyTo === applyTo);
    const activeMarkupItems = allMarkupItems.filter(e => e.enabled !== false);
    if (allMarkupItems.length > 0) {
      if (activeMarkupItems.length === 0) return basePrice;
      const totalMarkupPct = activeMarkupItems.reduce((s, e) => s + e.value, 0);
      return Math.round(basePrice * (1 + totalMarkupPct / 100));
    }
    const fallback = applyTo === 'materials' ? state.settings.markupMaterial : state.settings.markupService;
    return Math.round(basePrice * (1 + fallback / 100));
  };

  const calcProjectTotals = (project: Project) => {
    const activeExpenses = state.expenses.filter(e => e.enabled !== false);
    const rowValid = (r: { name: string }) => r.name.trim() !== '';
    const rawMaterials = project.blocks.reduce((sum, b) => sum + b.rows.filter(rowValid).reduce((s, r) => s + r.qty * r.price, 0), 0);
    const rawServices = project.serviceBlocks.reduce((sum, b) => sum + b.rows.filter(rowValid).reduce((s, r) => s + r.qty * r.price, 0), 0);
    const base = rawMaterials + rawServices;
    const totalMarkupItems = activeExpenses.filter(e => e.type === 'markup' && e.applyTo === 'total');
    const totalMarkupPct = totalMarkupItems.reduce((s, e) => s + e.value, 0);
    const totalMarkupAmount = Math.round(base * totalMarkupPct / 100);
    const blockExtras = project.blocks.map(b => {
      const blockBase = b.rows.filter(rowValid).reduce((s, r) => s + r.qty * r.price, 0);
      const blockMarkups = activeExpenses.filter(e => e.type === 'markup' && e.applyTo === 'block' && (e.blockIds || []).includes(b.id));
      const extraPct = blockMarkups.reduce((s, e) => s + e.value, 0);
      return { blockId: b.id, blockName: b.name, base: blockBase, extra: Math.round(blockBase * extraPct / 100) };
    });
    const blockExtraTotal = blockExtras.reduce((s, b) => s + b.extra, 0);
    const baseForOverhead = base + totalMarkupAmount + blockExtraTotal;
    const percentAmount = Math.round(activeExpenses.filter(e => e.type === 'percent').reduce((s, e) => s + baseForOverhead * e.value / 100, 0));
    const fixedAmount = activeExpenses.filter(e => e.type === 'fixed').reduce((s, e) => s + e.value, 0);
    return { rawMaterials, rawServices, base, totalMarkupAmount, totalMarkupPct, percentAmount, fixedAmount, blockExtraTotal, blockExtras, grandTotal: baseForOverhead + percentAmount + fixedAmount, activeExpenses };
  };

  const getActiveProject = () => state.projects.find(p => p.id === state.activeProjectId) || null;
  const getTypeName = (typeId?: string) => state.settings.materialTypes.find(t => t.id === typeId)?.name || '';
  const getTypeById = (typeId?: string) => state.settings.materialTypes.find(t => t.id === typeId);
  const getManufacturerById = (id?: string) => state.manufacturers.find(m => m.id === id);
  const getVendorById = (id?: string) => state.vendors.find(v => v.id === id);
  const getCategoryById = (id?: string) => (state.settings.materialCategories || []).find(c => c.id === id);
  const getCategoriesForType = (typeId?: string) =>
    (state.settings.materialCategories || []).filter((c: MaterialCategory) => {
      const ids = c.typeIds?.length ? c.typeIds : (c.typeId ? [c.typeId] : []);
      return ids.length === 0 || (typeId ? ids.includes(typeId) : true);
    });

  // resolveRows нужен для insertSavedBlockToProject
  const resolveRows = (rows: CalcRow[]) => rows.map(r => {
    const mat = r.materialId ? state.materials.find(m => m.id === r.materialId) : undefined;
    const variant = (mat && r.variantId) ? (mat.variants || []).find(v => v.id === r.variantId) : null;
    const basePrice = variant ? variant.basePrice : (mat ? mat.basePrice : (r.basePrice ?? 0));
    const price = mat ? calcPriceWithMarkup(basePrice, 'materials') : r.price;
    return { ...r, id: `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`, basePrice, price };
  });

  return {
    // Сырое состояние
    ...state,

    // Хелперы
    getActiveProject,
    calcPriceWithMarkup,
    calcProjectTotals,
    getTypeName, getTypeById,
    getManufacturerById, getVendorById,
    getCategoryById, getCategoriesForType,

    // Проекты
    createProject: projectSlice.createProject,
    deleteProject: projectSlice.deleteProject,
    duplicateProject: (id: string) => projectSlice.duplicateProject(id, state),
    updateProjectInfo: projectSlice.updateProjectInfo,

    // Блоки материалов
    addBlock: projectSlice.addBlock,
    updateBlock: projectSlice.updateBlock,
    deleteBlock: projectSlice.deleteBlock,
    duplicateBlock: projectSlice.duplicateBlock,
    moveBlock: projectSlice.moveBlock,
    reorderBlocks: projectSlice.reorderBlocks,

    // Строки материалов
    addRow: projectSlice.addRow,
    updateRow: projectSlice.updateRow,
    deleteRow: projectSlice.deleteRow,
    duplicateRow: projectSlice.duplicateRow,
    copyRowToBlock: projectSlice.copyRowToBlock,
    reorderRows: projectSlice.reorderRows,
    refreshProjectPrices: (projectId: string) => projectSlice.refreshProjectPrices(projectId, state, calcPriceWithMarkup),

    // Блоки услуг
    addServiceBlock: projectSlice.addServiceBlock,
    updateServiceBlock: projectSlice.updateServiceBlock,
    deleteServiceBlock: projectSlice.deleteServiceBlock,
    duplicateServiceBlock: projectSlice.duplicateServiceBlock,
    moveServiceBlock: projectSlice.moveServiceBlock,

    // Строки услуг
    addServiceRow: projectSlice.addServiceRow,
    updateServiceRow: projectSlice.updateServiceRow,
    deleteServiceRow: projectSlice.deleteServiceRow,
    reorderServiceRows: projectSlice.reorderServiceRows,

    // Производители
    addManufacturer: catalogSlice.addManufacturer,
    updateManufacturer: catalogSlice.updateManufacturer,
    deleteManufacturer: catalogSlice.deleteManufacturer,

    // Поставщики
    addVendor: catalogSlice.addVendor,
    updateVendor: catalogSlice.updateVendor,
    deleteVendor: catalogSlice.deleteVendor,

    // Материалы
    addMaterial: catalogSlice.addMaterial,
    updateMaterial: catalogSlice.updateMaterial,
    deleteMaterial: catalogSlice.deleteMaterial,
    duplicateMaterial: (id: string) => catalogSlice.duplicateMaterial(id, state.materials),
    importSkatBatch: (
      mfr: Parameters<typeof catalogSlice.importSkatBatch>[0],
      cats: Parameters<typeof catalogSlice.importSkatBatch>[1],
      mats: Parameters<typeof catalogSlice.importSkatBatch>[2]
    ) => catalogSlice.importSkatBatch(mfr, cats, mats, state.materials),
    patchSkatMaterials: catalogSlice.patchSkatMaterials,
    updateSkatPrices: catalogSlice.updateSkatPrices,
    deleteLegacyBoyardMaterials: catalogSlice.deleteLegacyBoyardMaterials,

    // Услуги
    addService: servicesSlice.addService,
    updateService: servicesSlice.updateService,
    deleteService: servicesSlice.deleteService,

    // Расходы
    addExpense: expensesSlice.addExpense,
    updateExpense: expensesSlice.updateExpense,
    deleteExpense: expensesSlice.deleteExpense,
    addExpenseGroup: expensesSlice.addExpenseGroup,
    updateExpenseGroup: expensesSlice.updateExpenseGroup,
    deleteExpenseGroup: expensesSlice.deleteExpenseGroup,

    // Настройки
    updateSettings: settingsSlice.updateSettings,
    addUnit: (unit: string) => settingsSlice.addUnit(unit, state.settings.units),
    deleteUnit: settingsSlice.deleteUnit,
    addMaterialType: settingsSlice.addMaterialType,
    updateMaterialType: settingsSlice.updateMaterialType,
    deleteMaterialType: settingsSlice.deleteMaterialType,
    addMaterialCategory: settingsSlice.addMaterialCategory,
    updateMaterialCategory: settingsSlice.updateMaterialCategory,
    deleteMaterialCategory: settingsSlice.deleteMaterialCategory,

    // Шаблоны
    saveTemplate: (projectId: string, name: string, description?: string) =>
      templatesSlice.saveTemplate(projectId, name, state, description),
    loadTemplate: (projectId: string, templateId: string) =>
      templatesSlice.loadTemplate(projectId, templateId, state, calcPriceWithMarkup),
    deleteTemplate: templatesSlice.deleteTemplate,
    updateTemplate: templatesSlice.updateTemplate,
    overwriteTemplate: (templateId: string, projectId: string) =>
      templatesSlice.overwriteTemplate(templateId, projectId, state),

    // Сохранённые блоки
    createSavedBlock: savedBlocksSlice.createSavedBlock,
    updateSavedBlock: savedBlocksSlice.updateSavedBlock,
    deleteSavedBlock: savedBlocksSlice.deleteSavedBlock,
    reorderSavedBlocks: savedBlocksSlice.reorderSavedBlocks,
    addSavedBlockRow: savedBlocksSlice.addSavedBlockRow,
    updateSavedBlockRow: savedBlocksSlice.updateSavedBlockRow,
    deleteSavedBlockRow: savedBlocksSlice.deleteSavedBlockRow,

    // Сборки
    addAssembly: savedBlocksSlice.addAssembly,
    updateAssembly: savedBlocksSlice.updateAssembly,
    deleteAssembly: savedBlocksSlice.deleteAssembly,
    addAssemblyRow: savedBlocksSlice.addAssemblyRow,
    updateAssemblyRow: savedBlocksSlice.updateAssemblyRow,
    deleteAssemblyRow: savedBlocksSlice.deleteAssemblyRow,
    insertSavedBlockToProject: (projectId: string, savedBlockId: string, assemblyId?: string) =>
      savedBlocksSlice.insertSavedBlockToProject(projectId, savedBlockId, state, resolveRows, assemblyId),

    // Низкоуровневый доступ
    setState: (updater: (s: AppState) => AppState) => setState(updater),
  };
}