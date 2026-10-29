'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface CheckoutCustomerState {
  name: string;
  phone: string;
  comment: string;
  email: string;
  address: string;
  city: string;
  setDelivery: (field: 'email' | 'address' | 'city', value: string) => void;
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
      comment: '', email: '', address: '', city: '',
      setDelivery: (field, value) => set({ [field]: value }),
      setName: (name) => set({ name }),
      setPhone: (phone) => set({ phone }),
      setComment: (comment) => set({ comment }),
      clearCustomer: () => set({ name: '', phone: '', comment: '', email: '', address: '', city: '' }),
    }),
    {
      name: 'mdp-checkout-customer',
      version: 1,
      storage: createJSONStorage(() => {
        localStorage.removeItem('mdp-checkout-customer');
        return sessionStorage;
      }),
    },
  ),
);
