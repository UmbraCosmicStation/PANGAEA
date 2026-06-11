import { create } from 'zustand';

/** 토스트 알림 상태 (M1-D6) */

export interface Toast {
  id: number;
  message: string;
  kind: 'info' | 'success' | 'error';
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, kind?: Toast['kind'], durationMs?: number) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, kind = 'info', durationMs = 3000) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, durationMs);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
