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
  whatsappUpdates:boolean;
  setWhatsAppUpdates:(enabled:boolean)=>void;
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
      comment: '', email: '', address: '', city: '', whatsappUpdates:false,
      setWhatsAppUpdates:(whatsappUpdates)=>set({whatsappUpdates}),
      setDelivery: (field, value) => set({ [field]: value }),
      setName: (name) => set({ name }),
      setPhone: (phone) => set({ phone }),
      setComment: (comment) => set({ comment }),
      clearCustomer: () => set({ name: '', phone: '', comment: '', email: '', address: '', city: '',whatsappUpdates:false }),
    }),
    {
      name: 'mdp-checkout-customer',
      version: 2,
      // Ask again after expanding the scope from confirmation to order tracking.
      migrate: (saved) => ({ ...(saved as Partial<CheckoutCustomerState>), whatsappUpdates: false }),
      storage: createJSONStorage(() => {
        localStorage.removeItem('mdp-checkout-customer');
        return sessionStorage;
      }),
    },
  ),
);
