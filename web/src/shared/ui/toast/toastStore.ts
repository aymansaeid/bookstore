import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error';
  action?: { label: string; to: string };
}

interface ToastState {
  toasts: Toast[];
  show: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

const DURATION_MS = 4000;
const MAX_VISIBLE = 3;
let nextId = 1;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  show: (toast) => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { ...toast, id }].slice(-MAX_VISIBLE) });
    window.setTimeout(() => {
      get().dismiss(id);
    }, DURATION_MS);
  },
  dismiss: (id) => {
    set({ toasts: get().toasts.filter((toast) => toast.id !== id) });
  },
}));

/** Call from anywhere, including outside React. */
export const toast = {
  success: (message: string, action?: Toast['action']) => {
    useToastStore.getState().show({ message, tone: 'success', ...(action ? { action } : {}) });
  },
  error: (message: string) => {
    useToastStore.getState().show({ message, tone: 'error' });
  },
};
