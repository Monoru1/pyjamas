/** Raw counts read from `orders` (each one a simple filtered COUNT). */
export type RawOrderCounts = {
  all: number; online: number; paidOnline: number;
  pendingAll: number; pendingUnpaidOnline: number; unpaidAttempts: number;
};

/**
 * Dashboard figures. An online order counts as an order only once FedaPay confirmed it
 * (paid, or later refunded); before that it is an attempt holding stock, never "to process".
 */
export function orderDashboardCounts(raw: RawOrderCounts) {
  const nonNegative = (value: number) => Math.max(0, value);
  return {
    orders: nonNegative(raw.all - raw.online) + raw.paidOnline,
    toProcess: nonNegative(raw.pendingAll - raw.pendingUnpaidOnline),
    unpaidAttempts: raw.unpaidAttempts,
  };
}
