export const orderStatusLabels: Record<string, string> = {
  pending: 'En attente', confirmed: 'Prise en charge', preparing: 'En préparation',
  ready: 'Prête', delivered: 'Livrée', cancelled: 'Refusée / annulée',
};
export const paymentStateLabels: Record<string, string> = {
  unpaid: 'Sans paiement en ligne', pending_payment: 'Paiement en attente', paid: 'Paiement confirmé',
  failed: 'Paiement refusé', cancelled: 'Paiement annulé', expired: 'Paiement expiré',
  refunded: 'Remboursé', partially_refunded: 'Partiellement remboursé',
};
/** Mirrors admin_transition_order; the SQL function remains the authority. */
export const nextOrderStatuses: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'], confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'], ready: ['delivered', 'cancelled'], delivered: [], cancelled: [],
};
export const transitionLabels: Record<string, string> = {
  confirmed: 'Prendre en charge', preparing: 'Passer en préparation', ready: 'Marquer comme prête',
  delivered: 'Marquer comme livrée', cancelled: 'Refuser / annuler',
};
export function canFulfill(order: { source: string; payment_state: string; needs_attention: boolean }) {
  if (order.source === 'notification_demo') return false;
  return !order.source.startsWith('fedapay_') || (order.payment_state === 'paid' && !order.needs_attention);
}
export const dateTime = (value: string) => new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Porto-Novo',
}).format(new Date(value));
