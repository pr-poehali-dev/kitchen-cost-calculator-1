import type { Service } from '../types';
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
