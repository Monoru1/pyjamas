'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CartLine } from './types';

interface CartState {
  lines: CartLine[];
  addLine: (line: Omit<CartLine, 'quantity'>, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeLine: (variantId: string) => void;
  clear: () => void;
}

function clampQuantity(quantity: number, maxStock: number) {
  return Math.max(1, Math.min(quantity, Math.max(maxStock, 1)));
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      addLine: (line, quantity = 1) => {
        set((state) => {
          const existing = state.lines.find((item) => item.variantId === line.variantId);

          if (existing) {
            return {
              lines: state.lines.map((item) =>
                item.variantId === line.variantId
                  ? {
                      ...item,
                      quantity: clampQuantity(item.quantity + quantity, item.maxStock),
                    }
                  : item,
              ),
            };
          }

          return {
            lines: [
              ...state.lines,
              {
                ...line,
                quantity: clampQuantity(quantity, line.maxStock),
              },
            ],
          };
        });
      },
      setQuantity: (variantId, quantity) => {
        set((state) => ({
          lines: state.lines.map((item) =>
            item.variantId === variantId
              ? { ...item, quantity: clampQuantity(quantity, item.maxStock) }
              : item,
          ),
        }));
      },
      removeLine: (variantId) => {
        set((state) => ({
          lines: state.lines.filter((item) => item.variantId !== variantId),
        }));
      },
      clear: () => set({ lines: [] }),
    }),
    {
      name: 'mdp-cart',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function selectTotalItems(state: CartState) {
  return state.lines.reduce((total, item) => total + item.quantity, 0);
}

export function selectSubtotal(state: CartState) {
  return state.lines.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}
