export type CurrencyCode = 'XOF' | 'EUR' | 'USD' | 'GBP';

const CURRENCY_META: Record<CurrencyCode, { label: string; decimals: number }> = {
  XOF: { label: 'FCFA', decimals: 0 },
  EUR: { label: '€', decimals: 2 },
  USD: { label: '$', decimals: 2 },
  GBP: { label: '£', decimals: 2 },
};

export function formatPrice(amount: number, currency: CurrencyCode | string = 'XOF'): string {
  const meta = CURRENCY_META[currency as CurrencyCode] ?? CURRENCY_META.XOF;
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  })
    .format(amount)
    .replace(/\u00A0|\u202F/g, ' ');

  return currency === 'XOF' ? `${formatted} ${meta.label}` : `${meta.label}${formatted}`;
}
