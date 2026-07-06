import { formatPrice } from '@/lib/utils/money';
import type { CartLine, CheckoutCustomer } from './types';

export function computeSubtotal(lines: CartLine[]) {
  return lines.reduce((total, line) => total + line.unitPrice * line.quantity, 0);
}

export function buildWhatsAppMessage(lines: CartLine[], customer: CheckoutCustomer) {
  if (lines.length === 0) {
    throw new Error('Cannot build a WhatsApp order message with an empty cart.');
  }

  const currency = lines[0]?.currency ?? 'XOF';
  const items = lines.map((line, index) => {
    const attributes = [
      line.sizeLabel ? `Taille : ${line.sizeLabel}` : null,
      line.colorName ? `Couleur : ${line.colorName}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    return [
      `${index + 1}. ${line.productName}`,
      `   Réf : ${line.sku}`,
      attributes ? `   ${attributes}` : null,
      `   ${line.quantity} × ${formatPrice(line.unitPrice, line.currency)} = ${formatPrice(
        line.unitPrice * line.quantity,
        line.currency,
      )}`,
    ]
      .filter(Boolean)
      .join('\n');
  });

  return [
    '🛍️ *Nouvelle commande — La Maison des Pyjamas*',
    '',
    `*Client :* ${customer.name.trim()}`,
    `*Téléphone :* ${customer.phone?.trim() || '—'}`,
    '',
    '*Articles :*',
    ...items,
    '',
    `*Total : ${formatPrice(computeSubtotal(lines), currency)}*`,
    '',
    `*Commentaire :* ${customer.comment?.trim() || '—'}`,
  ].join('\n');
}

export function buildWhatsAppUrl(phoneNumber: string, message: string) {
  const digits = phoneNumber.replace(/\D/g, '');

  if (!digits) {
    throw new Error('WhatsApp phone number is missing.');
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
