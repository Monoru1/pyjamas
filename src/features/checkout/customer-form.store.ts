'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface CheckoutCustomerState {
  name: string;
  phone: string;
  comment: string;
  setName: (name: string) => void;
  setPhone: (phone: string) => void;
  setComment: (comment: string) => void;
  clearCustomer: () => void;
}

export const useCheckoutCustomerStore = create<CheckoutCustomerState>()(
  persist(
    (set) => ({
      name: '',
      phone: '',
      comment: '',
      setName: (name) => set({ name }),
      setPhone: (phone) => set({ phone }),
      setComment: (comment) => set({ comment }),
      clearCustomer: () => set({ name: '', phone: '', comment: '' }),
    }),
    {
      name: 'mdp-checkout-customer',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
