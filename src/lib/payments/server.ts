import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { paymentConfiguration, providerRequest, transactionFromResponse, validateTransaction, type ProviderTransaction } from './fedapay';

export function paymentDatabase() {
  paymentConfiguration();
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function resolvedTransaction(providerId: number): Promise<ProviderTransaction> {
  const transaction = transactionFromResponse(await providerRequest(`/transactions/${providerId}`));
  // FedaPay may return currency_id rather than an expanded currency. Resolve it,
  // never assume that a numeric id means XOF.
  if (!transaction.currency?.iso && Number.isSafeInteger(transaction.currency_id) && transaction.currency_id! > 0) {
    const resource = await providerRequest(`/currencies/${transaction.currency_id}`);
    transaction.currency = (resource['v1/currency'] ?? resource) as { iso: string };
  }
  return transaction;
}

/** Only sanitized evidence for this transaction; never return log bodies, IPs or tokens. */
export async function readProviderInitializationLogs(providerId: number) {
  const payload = await providerRequest('/logs?per_page=100');
  const rows = (Array.isArray(payload) ? payload : payload['v1/logs'] ?? payload.logs) as Record<string, unknown>[] | undefined;
  if (!Array.isArray(rows)) return { available: false, entries: [] };
  const entries = rows.flatMap(log => {
    let path: string;
    try { path = new URL(String(log.url), 'https://api.fedapay.com').pathname; } catch { return []; }
    if (!path.endsWith(`/transactions/${providerId}/token`)) return [];
    let response: Record<string, unknown> = {};
    try { response = typeof log.response === 'string' ? JSON.parse(log.response) : log.response as Record<string, unknown> || {}; } catch { /* No raw diagnostic output. */ }
    let checkoutHost: string | null = null;
    try { if (typeof response.url === 'string') checkoutHost = new URL(response.url).hostname; } catch { /* Invalid URL is summarized only. */ }
    return [{ method: log.method === 'POST' ? 'POST' : 'other', status: Number(log.status),
      tokenPresent: typeof response.token === 'string' && response.token.length > 0,
      urlPresent: typeof response.url === 'string', checkoutHost,
      wrappedToken: Boolean(response['v1/token']), timestamp: typeof log.created_at === 'string' ? log.created_at : null }];
  });
  return { available: true, entries };
}

export async function reconcilePayment(id: string, eventId: string, candidateProviderId?: number) {
  const db = paymentDatabase();
  const config = paymentConfiguration();
  const { data: payment, error } = await db.from('payment_attempts').select('id,provider_id,amount_xof,purpose,order_id,environment,merchant_account_id').eq('id', id).eq('environment', config.environment).single();
  if (error || !payment?.order_id || (!payment.provider_id && !candidateProviderId)) throw new Error('Paiement introuvable.');
  if (config.liveTest && (Number(payment.amount_xof) > config.testCeiling! || payment.merchant_account_id !== config.accountId)) throw new Error('Recette hors autorisation.');
  const providerId = payment.provider_id ?? candidateProviderId!;
  const transaction = await resolvedTransaction(providerId);
  const state = validateTransaction(transaction, { ...payment, provider_id: providerId });
  // Recover a signed webhook arriving after a provider-create timeout. Binding is
  // allowed only after an authenticated GET and all local/merchant checks.
  if (!payment.provider_id) {
    const { data: attached, error: attachError } = await db.from('payment_attempts').update({ provider_id: providerId }).eq('id', id).is('provider_id', null).select('id');
    if (attachError || attached?.length !== 1) throw new Error('Association différée.');
  }
  const { error: applyError } = await db.rpc('apply_shop_payment', {
    p_id: id, p_provider_id: transaction.id, p_amount: Number(transaction.amount),
    p_account: transaction.account_id, p_environment: config.environment,
    p_status: state, p_event: `${config.environment}:${eventId}`,
  });
  if (applyError) throw new Error('Confirmation différée.');
  return state;
}
