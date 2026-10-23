import { createHmac, timingSafeEqual } from 'node:crypto';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'refunded' | 'partially_refunded';
export type ProviderTransaction = { id: number; amount: number | string; status: string; currency: { iso: string }; custom_metadata?: { payment_id?: string; purpose?: string } };

export function paymentConfiguration(env: Record<string, string | undefined> = process.env) {
  // Live is deliberately unsupported until the merchant's validation and full sandbox acceptance.
  if (env.FEDAPAY_ENABLED !== 'true' || env.FEDAPAY_ENVIRONMENT !== 'sandbox'
    || !env.FEDAPAY_SECRET_KEY?.startsWith('sk_sandbox_') || !env.FEDAPAY_WEBHOOK_SECRET
    || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Paiement de test indisponible.');
  const origin = env.DEPLOY_PRIME_URL || env.PAYMENT_SITE_URL || process.env.SITE_ORIGIN;
  if (!origin || new URL(origin).protocol !== 'https:') throw new Error('Adresse de retour non configurée.');
  return { key: env.FEDAPAY_SECRET_KEY, webhookSecret: env.FEDAPAY_WEBHOOK_SECRET, origin: new URL(origin).origin };
}

export function mapProviderStatus(status: string): PaymentStatus {
  switch (status) {
    case 'approved': case 'transferred': return 'paid';
    case 'declined': return 'failed';
    case 'canceled': return 'cancelled';
    case 'expired': return 'expired';
    case 'refunded': return 'refunded';
    case 'approved_partially_refunded': case 'transferred_partially_refunded': return 'partially_refunded';
    default: return 'pending'; // Unknown statuses never authorize fulfillment.
  }
}

// Protocol verified against the official fedapay@1.2.5 WebhookSignature source (scheme "s").
export function verifyWebhook(raw: string, header: string | null, secret: string, now = Math.floor(Date.now() / 1000)) {
  if (!header || raw.length > 64_000) return false;
  const parts = header.split(',').map(part => part.trim().split('='));
  const timestamps = parts.filter(([name]) => name === 't');
  if (timestamps.length !== 1 || !/^\d+$/.test(timestamps[0][1] ?? '')) return false;
  const timestamp = Number(timestamps[0][1]);
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest();
  return parts.some(([name, signature]) => name === 's' && /^[a-f0-9]{64}$/i.test(signature ?? '')
    && timingSafeEqual(Buffer.from(signature, 'hex'), expected));
}

export function validateTransaction(transaction: ProviderTransaction, payment: { id: string; amount_xof: number; provider_id: number; purpose: string }) {
  if (transaction.id !== payment.provider_id || Number(transaction.amount) !== Number(payment.amount_xof)
    || transaction.currency?.iso !== 'XOF' || transaction.custom_metadata?.payment_id !== payment.id
    || transaction.custom_metadata?.purpose !== payment.purpose) throw new Error('Transaction incohérente.');
  return mapProviderStatus(transaction.status);
}

export async function providerRequest(path: string, init: RequestInit = {}, fetcher: typeof fetch = fetch): Promise<Record<string, unknown>> {
  const { key } = paymentConfiguration();
  if (!/^\/transactions(?:\/\d+(?:\/token)?)?$/.test(path)) throw new Error('Requête invalide.');
  const response = await fetcher(`https://sandbox-api.fedapay.com/v1${path}`, {
    ...init, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    cache: 'no-store', signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('Le service de paiement est momentanément indisponible.');
  return response.json();
}

export function transactionFromResponse(payload: Record<string, unknown>): ProviderTransaction {
  // The SDK wraps responses as v1/transaction; current REST docs also show a flat resource.
  const transaction = (payload['v1/transaction'] ?? payload) as ProviderTransaction;
  if (!Number.isSafeInteger(transaction.id) || transaction.id < 1) throw new Error('Réponse de paiement invalide.');
  return transaction;
}

export function safeCheckoutUrl(value: unknown) {
  if (typeof value !== 'string') throw new Error('Lien de paiement manquant.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'sandbox-checkout.fedapay.com' || url.username || url.password) throw new Error('Lien de paiement non autorisé.');
  return url.href;
}
