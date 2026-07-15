import { describe, expect, it } from 'vitest';
import type { CartLine } from './types';
import { buildWhatsAppMessage, buildWhatsAppUrl, computeSubtotal } from './whatsapp.service';

const baseLine: CartLine = {
  variantId: 'variant-1',
  productId: 'product-1',
  productName: 'Pyjama Homme Velours',
  sku: 'PYJ-H-VRT-XL',
  sizeLabel: 'XL',
  colorName: 'Vert',
  unitPrice: 12500,
  currency: 'XOF',
  imageUrl: null,
  quantity: 2,
  maxStock: 10,
};

describe('whatsapp checkout service', () => {
  it('computes subtotal from cart lines', () => {
    expect(computeSubtotal([baseLine, { ...baseLine, variantId: 'variant-2', unitPrice: 5000, quantity: 1 }])).toBe(30000);
  });

  it('builds a complete WhatsApp message', () => {
    const message = buildWhatsAppMessage([baseLine], {
      name: 'Awa',
      phone: null,
      comment: null,
    }, 'MDP-2026-0001');

    expect(message).toContain('✨🛍️ NOUVELLE COMMANDE 🛍️✨');
    expect(message).toContain('📦 Commande : #MDP-2026-0001');
    expect(message).toContain('Awa');
    expect(message).toContain('Réf : PYJ-H-VRT-XL');
    expect(message).toContain('Taille : XL');
    expect(message).toContain('Couleur : Vert');
    expect(message).toContain('Total : 25 000 FCFA');
  });

  it('builds the official WhatsApp send URL with an encoded message', () => {
    const url = new URL(buildWhatsAppUrl('+229 90 00 00 00', 'Bonjour & merci'));

    expect(url.origin + url.pathname).toBe('https://api.whatsapp.com/send');
    expect(url.searchParams.get('phone')).toBe('22990000000');
    expect(url.searchParams.get('text')).toBe('Bonjour & merci');
  });

  it('preserves every emoji after a complete WhatsApp URL round trip', () => {
    const message = '✨🛍️ Nouvelle commande 📦👤📞🎁📏🎨💰✅';
    const url = new URL(buildWhatsAppUrl('+229 90 00 00 00', message));

    expect(url.searchParams.get('text')).toBe(message);
  });
});
