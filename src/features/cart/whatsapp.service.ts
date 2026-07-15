import { formatPrice } from '@/lib/utils/money';
import type { CartLine, CheckoutCustomer } from './types';

export function computeSubtotal(lines: CartLine[]) {
  return lines.reduce((total, line) => total + line.unitPrice * line.quantity, 0);
}

export function buildWhatsAppMessage(lines: CartLine[], customer: CheckoutCustomer, orderNumber?: string) {
  if (lines.length === 0) {
    throw new Error('Cannot build a WhatsApp order message with an empty cart.');
  }

  const currency = lines[0]?.currency ?? 'XOF';
  const separator = '━━━━━━━━━━━━━━━━━━━━';
  const items = lines.flatMap((line, index) => {
    const total = line.unitPrice * line.quantity;

    return [
      `${index + 1}. ${line.productName}`,
      `Réf : ${line.sku}`,
      line.sizeLabel ? `Taille : ${line.sizeLabel}` : null,
      line.colorName ? `Couleur : ${line.colorName}` : null,
      `Quantité : ${line.quantity}`,
      `Prix : ${formatPrice(line.unitPrice, line.currency)}`,
      `Sous-total : ${formatPrice(total, line.currency)}`,
      '',
    ].filter(Boolean);
  });

  return [
    separator,
    '🛍️ Nouvelle commande',
    'La Maison des Pyjamas',
    orderNumber ? `Commande : #${orderNumber}` : null,
    separator,
    '',
    '👤 Client',
    `Nom : ${customer.name.trim()}`,
    `Téléphone : ${customer.phone?.trim() || '—'}`,
    '',
    separator,
    '🎁 Articles',
    ...items,
    separator,
    `Total : ${formatPrice(computeSubtotal(lines), currency)}`,
    separator,
    '',
    '💬 Message client',
    customer.comment?.trim() || '—',
    '',
    'Merci de me confirmer la disponibilité et les modalités de livraison.',
  ].join('\n');
}

export function buildWhatsAppUrl(phoneNumber: string, message: string) {
  const digits = phoneNumber.replace(/\D/g, '');

  if (!digits) {
    throw new Error('WhatsApp phone number is missing.');
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
