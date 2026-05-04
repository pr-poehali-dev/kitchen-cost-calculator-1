import type { Service, ServiceCategory } from '../types';
import { setState } from '../stateCore';

export const addService = (service: Omit<Service, 'id'>) => {
  const id = `sv${Date.now()}${Math.random().toString(36).slice(2)}`;
  setState(s => ({ ...s, services: [...s.services, { ...service, id }] }));
};

export const updateService = (id: string, data: Partial<Service>) => {
  setState(s => ({ ...s, services: s.services.map(sv => sv.id === id ? { ...sv, ...data } : sv) }));
};

export const deleteService = (id: string) => {
  setState(s => ({ ...s, services: s.services.filter(sv => sv.id !== id) }));
};

export const archiveService = (id: string, archived: boolean) => {
  setState(s => ({ ...s, services: s.services.map(sv => sv.id === id ? { ...sv, archived } : sv) }));
};

// Категории услуг
export const addServiceCategory = (cat: Omit<ServiceCategory, 'id'>) => {
  const id = `sc${Date.now()}${Math.random().toString(36).slice(2)}`;
  setState(s => ({ ...s, serviceCategories: [...s.serviceCategories, { ...cat, id }] }));
};

export const updateServiceCategory = (id: string, data: Partial<ServiceCategory>) => {
  setState(s => ({
    ...s,
    serviceCategories: s.serviceCategories.map(c => c.id === id ? { ...c, ...data } : c),
  }));
};

export const deleteServiceCategory = (id: string) => {
  setState(s => ({
    ...s,
    serviceCategories: s.serviceCategories.filter(c => c.id !== id),
    // Сбрасываем categoryId у услуг этой категории
    services: s.services.map(sv => sv.categoryId === id ? { ...sv, categoryId: undefined } : sv),
  }));
};
