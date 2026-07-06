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
    });

    expect(message).toContain('Nouvelle commande');
    expect(message).toContain('Awa');
    expect(message).toContain('Réf : PYJ-H-VRT-XL');
    expect(message).toContain('Taille : XL | Couleur : Vert');
    expect(message).toContain('Total : 25 000 FCFA');
  });

  it('builds a wa.me URL with an encoded message', () => {
    expect(buildWhatsAppUrl('+229 90 00 00 00', 'Bonjour & merci')).toBe(
      'https://wa.me/22990000000?text=Bonjour%20%26%20merci',
    );
  });
});
