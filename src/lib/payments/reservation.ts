/**
 * True once the order's own reservation deadline (payment_attempts.expires_at) has passed.
 * FedaPay keeps an abandoned or cancelled checkout `pending` and may never send a terminal
 * event (observed on MDP-20261120-E6AAAD), so this deadline is what ends the reservation.
 */
export function reservationOverdue(expiresAt: unknown, now = Date.now()) {
  const deadline = typeof expiresAt === 'string' || expiresAt instanceof Date ? new Date(expiresAt).getTime() : NaN;
  return Number.isFinite(deadline) && deadline <= now;
}
