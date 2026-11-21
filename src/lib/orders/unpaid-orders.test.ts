import { expect, it } from 'vitest';
import { fulfilmentLabel, isUnpaidOnlineOrder, orderStatusLabels } from './labels';
import { orderDashboardCounts } from './dashboard-counts';
import { orderReferenceLine } from '@/app/paiement/payment-status';

const states = ['unpaid', 'pending_payment', 'paid', 'failed', 'cancelled', 'expired', 'refunded', 'partially_refunded'];

it('an online order is a sale only once FedaPay confirmed it; other sources are unchanged', () => {
  for (const source of ['fedapay_live', 'fedapay_sandbox']) for (const payment_state of states) {
    const unpaid = !['paid', 'refunded', 'partially_refunded'].includes(payment_state);
    expect(isUnpaidOnlineOrder({ source, payment_state })).toBe(unpaid);
    expect(fulfilmentLabel({ source, payment_state, status: 'pending' })).toBe(unpaid ? 'Non payée — rien à préparer' : 'En attente');
  }
  for (const source of ['website', 'whatsapp', 'notification_demo', null]) {
    expect(isUnpaidOnlineOrder({ source, payment_state: 'unpaid' })).toBe(false);
    expect(fulfilmentLabel({ source, payment_state: 'unpaid', status: 'pending' })).toBe(orderStatusLabels.pending);
  }
  expect(fulfilmentLabel({ source: 'fedapay_live', payment_state: 'paid', status: 'delivered' })).toBe('Livrée');
});

it('dashboard counts never go negative and exclude unpaid attempts from orders and to-process', () => {
  expect(orderDashboardCounts({ all: 10, online: 7, paidOnline: 2, pendingAll: 8, pendingUnpaidOnline: 5, unpaidAttempts: 5 }))
    .toEqual({ orders: 5, toProcess: 3, unpaidAttempts: 5 });
  expect(orderDashboardCounts({ all: 0, online: 0, paidOnline: 0, pendingAll: 0, pendingUnpaidOnline: 0, unpaidAttempts: 0 }))
    .toEqual({ orders: 0, toProcess: 0, unpaidAttempts: 0 });
});

it('the customer reference line says "non payée" for every state except a confirmed payment', () => {
  for (const status of states) {
    const line = orderReferenceLine(status, 'MDP-X');
    if (status === 'paid') expect(line).toBe('Commande MDP-X');
    else if (status.includes('refunded')) expect(line).toContain('remboursement');
    else expect(line).toContain('non payée');
  }
});
