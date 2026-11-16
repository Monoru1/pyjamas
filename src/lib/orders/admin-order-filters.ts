import { orderStatusLabels, paymentStateLabels } from './labels';

export type OrderSearchParams = {
  [K in 'q' | 'status' | 'paiement' | 'du' | 'au' | 'tri' | 'page']?: string | string[];
};

const day = (value?: string) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
  const date = new Date(value);
  if (Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value) return value;
};

export function parseAdminOrderFilters(params: OrderSearchParams) {
  const { q, status, paiement, du, au, tri, page } = params;
  return {
    search: typeof q === 'string' ? q.trim().toLowerCase().slice(0, 60).replace(/[%_\\,()*]/g, ' ').trim() : '',
    status: typeof status === 'string' && Object.hasOwn(orderStatusLabels, status) ? status : '',
    payment: typeof paiement === 'string' && Object.hasOwn(paymentStateLabels, paiement) ? paiement : '',
    from: day(typeof du === 'string' ? du : undefined),
    to: day(typeof au === 'string' ? au : undefined),
    oldestFirst: tri === 'ancien',
    page: Math.min(Math.max(typeof page === 'string' ? Number.parseInt(page, 10) || 1 : 1, 1), 5000),
  };
}
