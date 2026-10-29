import { createHmac, timingSafeEqual } from 'node:crypto';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'refunded' | 'partially_refunded';
export type ProviderTransaction = { id: number; amount: number | string; status: string; currency?: { iso: string }; currency_id?: number; account_id?: number; merchant_reference?: string; custom_metadata?: { payment_id?: string; purpose?: string; order_id?: string } };

/** Real Netlify build metadata, captured by Next config for its server bundle. */
export function paymentDeployment(env:Record<string,string|undefined>=process.env) {
  const built=env===process.env;
  return {context:(built&&process.env.PAYMENT_BUILD_CONTEXT)||env.CONTEXT,
    reviewId:(built&&process.env.PAYMENT_BUILD_REVIEW_ID)||env.REVIEW_ID,
    previewOrigin:(built&&process.env.PAYMENT_BUILD_ORIGIN)||env.DEPLOY_PRIME_URL};
}

export function paymentConfiguration(env: Record<string, string | undefined> = process.env) {
  const environment = env.FEDAPAY_ENVIRONMENT;
  if (env.FEDAPAY_ENABLED !== 'true' || !['sandbox', 'live'].includes(environment || '')
    || !env.FEDAPAY_SECRET_KEY?.startsWith(`sk_${environment}_`) || !env.FEDAPAY_WEBHOOK_SECRET
    || !env.SUPABASE_SERVICE_ROLE_KEY || !/^[1-9][0-9]*$/.test(env.FEDAPAY_ACCOUNT_ID || '')
    || !Number.isSafeInteger(Number(env.FEDAPAY_ACCOUNT_ID))) throw new Error('Paiement indisponible.');
  // Never let acceptance tests reserve the production catalogue's inventory.
  if (environment === 'sandbox' && (env.PAYMENT_DATABASE_ISOLATED !== 'true'
    || !env.NEXT_PUBLIC_SUPABASE_URL || new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname === 'pukvrerdloudfiphomsj.supabase.co')) throw new Error('Base de test isolée requise.');
  const liveTest = environment === 'live' && env.PAYMENT_LIVE_TEST_ENABLED === 'true';
  const deployment=paymentDeployment(env);
  const origin = deployment.context === 'production' ? (env.PAYMENT_SITE_URL || env.URL) : (deployment.previewOrigin || env.PAYMENT_SITE_URL);
  if (!origin || new URL(origin).protocol !== 'https:' || new URL(origin).username || new URL(origin).password || new URL(origin).port) throw new Error('Adresse de retour non configurée.');
  const testCeiling = Number(env.PAYMENT_LIVE_TEST_MAX_XOF);
  if (liveTest) {
    if (deployment.context !== 'deploy-preview' || deployment.reviewId !== '11'
      || new URL(origin).origin !== 'https://deploy-preview-11--pyjamas25.netlify.app'
      || env.NEXT_PUBLIC_SUPABASE_URL !== 'https://oxhymanjibveayhcaqvj.supabase.co'
      || env.PAYMENT_DATABASE_ISOLATED !== 'true' || env.FEDAPAY_LIVE_APPROVED === 'true'
      || !Number.isSafeInteger(testCeiling) || testCeiling < 1 || testCeiling > 1000
      || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(env.PAYMENT_LIVE_TEST_AUTHORIZATION_ID || '')) throw new Error('Recette Live non autorisée.');
  } else if (environment === 'live' && (env.FEDAPAY_LIVE_APPROVED !== 'true' || deployment.context !== 'production')) throw new Error('Production non validée.');
  const shipping = Number(env.PAYMENT_SHIPPING_XOF);
  if (!env.PAYMENT_SHIPPING_XOF || !Number.isSafeInteger(shipping) || shipping < 0 || shipping > 1_000_000) throw new Error('Tarif de livraison non configuré.');
  return { key: env.FEDAPAY_SECRET_KEY, webhookSecret: env.FEDAPAY_WEBHOOK_SECRET,
    origin: new URL(origin).origin, environment: environment as 'sandbox' | 'live',
    accountId: Number(env.FEDAPAY_ACCOUNT_ID), shipping, liveTest, staffOnly: environment === 'sandbox' || liveTest,
    testCeiling: liveTest ? testCeiling : undefined, authorizationId: liveTest ? env.PAYMENT_LIVE_TEST_AUTHORIZATION_ID : undefined,
    apiOrigin: environment === 'live' ? 'https://api.fedapay.com' : 'https://sandbox-api.fedapay.com' };
}

/** Admission can stop independently while callbacks and reconciliation finish old payments. */
export function checkoutConfiguration(env: Record<string, string | undefined> = process.env) {
  const config = paymentConfiguration(env);
  if (env.PAYMENT_CHECKOUT_ENABLED !== 'true') throw new Error('Nouvelles commandes suspendues.');
  return config;
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

export class TransactionMismatchError extends Error {
  constructor(readonly field: 'provider_id' | 'amount' | 'currency' | 'payment_id' | 'purpose' | 'order_id' | 'merchant_reference' | 'merchant_account_id') {
    super('Transaction incohérente.');
    this.name = 'TransactionMismatchError';
  }
}

export function validateTransaction(transaction: ProviderTransaction, payment: { id: string; amount_xof: number; provider_id: number; purpose: string; order_id?: string; merchant_account_id?: number }) {
  if (transaction.id !== payment.provider_id) throw new TransactionMismatchError('provider_id');
  if (Number(transaction.amount) !== Number(payment.amount_xof)) throw new TransactionMismatchError('amount');
  if (transaction.currency?.iso !== 'XOF') throw new TransactionMismatchError('currency');
  if (transaction.custom_metadata?.payment_id !== payment.id) throw new TransactionMismatchError('payment_id');
  if (transaction.custom_metadata?.purpose !== payment.purpose) throw new TransactionMismatchError('purpose');
  if (payment.order_id !== undefined && transaction.custom_metadata?.order_id !== payment.order_id) throw new TransactionMismatchError('order_id');
  if (payment.order_id !== undefined && transaction.merchant_reference !== payment.id) throw new TransactionMismatchError('merchant_reference');
  if (payment.merchant_account_id !== undefined && transaction.account_id !== payment.merchant_account_id) throw new TransactionMismatchError('merchant_account_id');
  return mapProviderStatus(transaction.status);
}

export async function providerRequest(path: string, init: RequestInit = {}, fetcher: typeof fetch = fetch): Promise<Record<string, unknown>> {
  const { key, apiOrigin } = paymentConfiguration();
  const readOnlyLogs = path === '/logs?per_page=100' && (!init.method || init.method === 'GET');
  if (!readOnlyLogs && !/^(?:\/transactions(?:\/\d+(?:\/token)?)?|\/currencies\/\d+)$/.test(path)) throw new Error('Requête invalide.');
  const response = await fetcher(`${apiOrigin}/v1${path}`, {
    ...init, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    cache: 'no-store', signal: AbortSignal.timeout(8_000),
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

export function safeCheckoutUrl(value: unknown, environment: 'sandbox' | 'live' = 'sandbox') {
  if (typeof value !== 'string') throw new Error('Lien de paiement manquant.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== (environment === 'live' ? 'checkout.fedapay.com' : 'sandbox-checkout.fedapay.com') || url.port || url.username || url.password) throw new Error('Lien de paiement non autorisé.');
  return url.href;
}
