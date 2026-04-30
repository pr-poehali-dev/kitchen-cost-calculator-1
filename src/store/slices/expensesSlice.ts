import type { ExpenseItem, ExpenseGroup } from '../types';
import { setState } from '../stateCore';

export const addExpense = (expense: Omit<ExpenseItem, 'id'>) => {
  const id = `e${Date.now()}${Math.random().toString(36).slice(2)}`;
  setState(s => ({ ...s, expenses: [...s.expenses, { ...expense, id }] }));
};

export const updateExpense = (id: string, data: Partial<ExpenseItem>) => {
  setState(s => ({ ...s, expenses: s.expenses.map(e => e.id === id ? { ...e, ...data } : e) }));
};

export const deleteExpense = (id: string) => {
  setState(s => ({ ...s, expenses: s.expenses.filter(e => e.id !== id) }));
};

export const addExpenseGroup = (name: string) => {
  const id = `eg${Date.now()}${Math.random().toString(36).slice(2)}`;
  setState(s => ({ ...s, expenseGroups: [...(s.expenseGroups || []), { id, name }] }));
  return id;
};

export const updateExpenseGroup = (id: string, data: Partial<ExpenseGroup>) => {
  setState(s => ({
    ...s,
    expenseGroups: (s.expenseGroups || []).map(g => g.id === id ? { ...g, ...data } : g),
  }));
};

export const deleteExpenseGroup = (id: string) => {
  setState(s => ({
    ...s,
    expenseGroups: (s.expenseGroups || []).filter(g => g.id !== id),
    expenses: s.expenses.map(e => e.groupId === id ? { ...e, groupId: undefined } : e),
  }));
};
