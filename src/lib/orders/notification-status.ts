export type DeliveryTone = 'waiting' | 'accepted' | 'delivered' | 'failed';

const provider: Record<string, [string, DeliveryTone]> = {
  delivered: ['Livré', 'delivered'],
  delivery_delayed: ['Livraison retardée', 'accepted'],
  bounced: ['Rejeté par le destinataire', 'failed'],
  complained: ['Signalé comme indésirable', 'failed'],
  failed: ['Échec fournisseur', 'failed'],
  suppressed: ['Adresse bloquée par Resend', 'failed'],
};

/** "sent" in the queue only means Resend accepted the message, never that it arrived. */
export function notificationState(status: string, deliveryStatus?: string | null): { label: string; tone: DeliveryTone } {
  if (status === 'pending') return { label: 'En attente', tone: 'waiting' };
  if (status === 'sending') return { label: 'En cours', tone: 'waiting' };
  if (status === 'blocked') return { label: 'Échec', tone: 'failed' };
  if (status !== 'sent') return { label: status, tone: 'waiting' };
  const [label, tone] = provider[deliveryStatus ?? ''] ?? ['Accepté par Resend', 'accepted'];
  return { label, tone };
}

type Summary = {
  notification_total: number | null; notification_failed: number | null; notification_waiting: number | null;
  notification_accepted: number | null; notification_delivered: number | null;
};

export function notificationSummary(row: Summary): { label: string; tone: DeliveryTone | 'none' } {
  const total = row.notification_total ?? 0;
  if (!total) return { label: 'Aucune', tone: 'none' };
  if (row.notification_failed) return { label: `${row.notification_failed} en échec / ${total}`, tone: 'failed' };
  if (row.notification_waiting) return { label: `${row.notification_waiting} en attente / ${total}`, tone: 'waiting' };
  if (row.notification_accepted) return { label: `${row.notification_delivered ?? 0} livrée(s) / ${total} · reste accepté`, tone: 'accepted' };
  return { label: `${total} livrée(s)`, tone: 'delivered' };
}

export const toneClass: Record<DeliveryTone | 'none', string> = {
  none: 'bg-black/5 text-black/60',
  waiting: 'bg-amber-100 text-amber-900',
  accepted: 'bg-sky-100 text-sky-900',
  delivered: 'bg-emerald-100 text-emerald-900',
  failed: 'bg-red-100 text-red-900',
};
