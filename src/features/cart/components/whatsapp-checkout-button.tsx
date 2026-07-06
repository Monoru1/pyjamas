'use client';

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
  const disabled = lines.length === 0 || !phoneNumber;

  function handleCheckout() {
    if (disabled) return;
    const message = buildWhatsAppMessage(lines, {
      name: name || 'Client boutique',
      phone: customerPhone || null,
      comment: comment || null,
    });
    window.open(buildWhatsAppUrl(phoneNumber, message), '_blank', 'noopener,noreferrer');
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleCheckout}
      className="w-full rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-white disabled:bg-foreground/25"
    >
      Envoyer la commande sur WhatsApp
    </button>
  );
}
