'use client';

import { useRef, useState } from 'react';
import { createOrderRequest } from '@/app/panier/actions';
import { buildWhatsAppMessage, buildWhatsAppUrl } from '@/features/cart/whatsapp.service';
import { useCartStore } from '@/features/cart/cart.store';
import { useCheckoutCustomerStore } from '@/features/checkout/customer-form.store';

interface WhatsAppCheckoutButtonProps {
  phoneNumber: string;
}

export function WhatsAppCheckoutButton({ phoneNumber }: WhatsAppCheckoutButtonProps) {
  const lines = useCartStore((state) => state.lines);
  const name = useCheckoutCustomerStore((state) => state.name);
  const customerPhone = useCheckoutCustomerStore((state) => state.phone);
  const comment = useCheckoutCustomerStore((state) => state.comment);
  const clearCart = useCartStore((state) => state.clear);
  const clearCustomer = useCheckoutCustomerStore((state) => state.clearCustomer);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = lines.length === 0 || !phoneNumber || isSubmitting;

  async function handleCheckout() {
    if (disabled || lock.current) return;
    setError(null);
    if (name.trim().length < 2) {
      setError('Indique ton nom pour envoyer la demande.');
      return;
    }
    if (customerPhone.replace(/\D/g, '').length < 8) {
      setError('Indique un numéro WhatsApp valide.');
      return;
    }

    lock.current = true;
    setIsSubmitting(true);
    try {
      const serialized = JSON.stringify({ name, phone: customerPhone, comment, lines: lines.map(line => ({ variantId: line.variantId, quantity: line.quantity })) });
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized));
      const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      let previous: { fingerprint?: string; key?: string } | null = null;
      try { previous = JSON.parse(sessionStorage.getItem('mdp-order-request') || 'null'); } catch { /* Replace corrupted local state. */ }
      const key = previous?.fingerprint === fingerprint && previous.key ? previous.key : crypto.randomUUID();
      sessionStorage.setItem('mdp-order-request', JSON.stringify({ fingerprint, key }));
      const order = await createOrderRequest({
        idempotencyKey: key,
        customer: { name, phone: customerPhone, comment },
        lines: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
      });
      const message = buildWhatsAppMessage(lines, { name, phone: customerPhone, comment }, order.orderNumber);
      sessionStorage.removeItem('mdp-order-request');
      clearCart();
      clearCustomer();
      window.location.assign(buildWhatsAppUrl(phoneNumber, message));
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'La commande n’a pas pu être enregistrée.');
      lock.current = false;
      setIsSubmitting(false);
    }
  }

  return <div className="space-y-2">
    {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
    <button
      type="button"
      disabled={disabled}
      onClick={handleCheckout}
      className="w-full rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-white disabled:bg-foreground/25"
    >
      {isSubmitting ? 'Enregistrement…' : 'Envoyer la demande sur WhatsApp'}
    </button>
    <p className="px-2 text-center text-xs leading-5 text-foreground/55">La demande est d’abord vérifiée par la boutique avant confirmation.</p>
  </div>;
}
