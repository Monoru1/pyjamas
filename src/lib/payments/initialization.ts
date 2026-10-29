import { paymentDatabase, resolvedTransaction, reconcilePayment } from './server';
import { checkoutTokenFromResponse, paymentConfiguration, providerRequest, safeCheckoutUrl, validateTransaction, TransactionMismatchError, ProviderHttpError } from './fedapay';

export type StoredCheckout = { id: string; order_id: string; public_token: string; amount_xof: number; provider_id: number; checkout_url: string | null; status: string };
export class CheckoutInitializationError extends Error {
  readonly code: string;
  constructor(readonly stage: string, cause: unknown) {
    super('Initialisation du lien de paiement différée.'); this.name = 'CheckoutInitializationError';
    const reason = cause instanceof TransactionMismatchError ? cause.field : cause instanceof ProviderHttpError ? `http_${cause.status}` : cause instanceof Error && ['TimeoutError', 'AbortError'].includes(cause.name) ? 'timeout' : 'unavailable';
    this.code = `initialization_failed:${stage}:${reason}`;
  }
}

/** Requires an already bound provider id. This function can NEVER POST /transactions. */
export async function initializeStoredCheckout(payment: StoredCheckout, config = paymentConfiguration()) {
  let stage = 'verify_provider_transaction';
  try {
    const state = validateTransaction(await resolvedTransaction(payment.provider_id), { ...payment, purpose: 'shop', merchant_account_id: config.accountId });
    if (['paid','expired','refunded','partially_refunded'].includes(state)) {
      await reconcilePayment(payment.id, `checkout:${crypto.randomUUID()}`);
      return { state, url: `${config.origin}/paiement?reference=${payment.public_token}`, internal: true };
    }
    if (payment.checkout_url) return { state, url: safeCheckoutUrl(payment.checkout_url, config.environment), internal: false };
    stage = 'request_checkout_token';
    const token = await providerRequest(`/transactions/${payment.provider_id}/token`, { method: 'POST' });
    stage = 'validate_checkout_url';
    const url = checkoutTokenFromResponse(token, config.environment);
    stage = 'persist_checkout_url';
    const { error } = await paymentDatabase().from('payment_attempts').update({ checkout_url: url, last_error: null }).eq('id', payment.id).eq('provider_id', payment.provider_id);
    if (error) throw new Error('Persistence unavailable');
    return { state, url, internal: false };
  } catch (error) { throw new CheckoutInitializationError(stage, error); }
}

/** Rechecks the existing owner intent. Expired approval never allows a token retry. */
export async function recoverPrivateCheckout(paymentId: string, staffId: string) {
  const config = paymentConfiguration();
  if (!config.liveTest || process.env.PAYMENT_CHECKOUT_ENABLED !== 'true') return 'disabled' as const;
  const db = paymentDatabase();
  const { data: permission, error: permissionError } = await db.from('live_test_authorizations')
    .select('staff_user_id,merchant_account_id,amount_xof,expires_at,revoked_at,payment_id').eq('id', config.authorizationId).maybeSingle();
  if (permissionError || !permission || permission.staff_user_id !== staffId || permission.payment_id !== paymentId
    || permission.revoked_at || Date.parse(permission.expires_at) <= Date.now() || !Number.isFinite(Date.parse(permission.expires_at))
    || permission.merchant_account_id !== config.accountId || Number(permission.amount_xof) > config.testCeiling!) return 'approval_required' as const;
  const { data: payment, error } = await db.from('payment_attempts')
    .select('id,order_id,public_token,amount_xof,provider_id,checkout_url,status,merchant_account_id').eq('id', paymentId).eq('environment','live').maybeSingle();
  if (error || !payment?.provider_id || !payment.order_id || payment.merchant_account_id !== config.accountId
    || Number(payment.amount_xof) !== Number(permission.amount_xof)) return 'unavailable' as const;
  try {
    const result = await initializeStoredCheckout(payment, config);
    return result.internal ? 'state_updated' as const : 'checkout_ready' as const;
  } catch (error) {
    const code = error instanceof CheckoutInitializationError ? error.code : 'initialization_failed:recovery:unavailable';
    await db.from('payment_attempts').update({ last_error: code }).eq('id', paymentId);
    console.error('payment_recovery_failed', { paymentId, code });
    return 'retry_failed' as const;
  }
}
