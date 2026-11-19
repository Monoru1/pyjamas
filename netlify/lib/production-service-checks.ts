const productionDatabase = 'https://pukvrerdloudfiphomsj.supabase.co';
const siteId = '42bea529-6f67-4dfb-b5e0-642cf9ce7456';
const origin = 'https://pyjamas25.netlify.app';
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const historical = { id: 113943841, amount: 100, merchant: 101915,
  payment: 'c11b89dd-6eb0-4834-ac54-ad7fe5fb06a4', order: 'e876f767-bb08-4c56-bf43-2ae311b69f66' };

type Env = Record<string, string | undefined>;
export type ProductionDeployEvent = { deploy: { id: string; context: string; branch?: string | null; commitRef?: string | null; publishedAt?: string | null }; site: { id: string } };
type Check = { ok: boolean; code: string; [name: string]: unknown };
class CheckError extends Error {}
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** One authorized technical verification, triggered by a signed Netlify deploy event.
 * Only audit rows and one technical email may be created. No order, payment or stock write.
 */
export async function runProductionServiceChecks(event: ProductionDeployEvent, env: Env, fetcher: typeof fetch = fetch) {
  const runId = env.COMMERCE_VALIDATION_RUN_ID || '';
  if (event.site?.id !== siteId || event.deploy?.context !== 'production' || event.deploy.branch !== 'main'
    || !event.deploy.publishedAt || !uuid.test(runId) || env.NEXT_PUBLIC_SUPABASE_URL !== productionDatabase
    || !env.SUPABASE_SERVICE_ROLE_KEY || ['FEDAPAY_ENABLED', 'FEDAPAY_LIVE_APPROVED', 'PAYMENT_CHECKOUT_ENABLED', 'ORDER_NOTIFICATIONS_ENABLED'].some(key => env[key] !== 'false')) return null;

  async function json(url: string, init: RequestInit, code: string): Promise<unknown> {
    let response: Response;
    try { response = await fetcher(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(8000) }); }
    catch { throw new CheckError(`${code}_network`); }
    if (!response.ok) throw new CheckError(`${code}_http_${response.status}`);
    try { return await response.json(); } catch { throw new CheckError(`${code}_invalid_response`); }
  }
  const dbHeaders = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };
  const db = (path: string, init: RequestInit = {}) => json(`${productionDatabase}/rest/v1/${path}`, { ...init, headers: { ...dbHeaders, ...init.headers } }, 'supabase');
  // The primary key is the lease: repeated deploy events cannot send a second message.
  const claim = await db('activity_logs?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ id: runId, action: 'production_service_check', entity_type: 'commerce_readiness',
      after_data: { state: 'running', runId, deployId: event.deploy.id, commit: event.deploy.commitRef, startedAt: new Date().toISOString() } }) });
  if (!Array.isArray(claim) || claim.length !== 1) return null;
  const checks: Record<string, Check> = {};
  const check = async (name: string, action: () => Promise<Omit<Check, 'code'>>) => {
    try { checks[name] = { code: 'checked', ...await action() } as Check; }
    catch (error) { checks[name] = { ok: false, code: error instanceof CheckError ? error.message : 'check_failed' }; }
  };
  await check('supabase', async () => {
    const variants = await db('product_variants?select=id,price,stock_quantity,products!inner(is_active,deleted_at)&is_active=eq.true&stock_quantity=gt.0&products.is_active=eq.true&products.deleted_at=is.null&limit=1');
    const variant = object(Array.isArray(variants) ? variants[0] : null);
    if (typeof variant.id !== 'string' || !uuid.test(variant.id)) throw new CheckError('sellable_variant_missing');
    const quote = object(await db('rpc/quote_shop_basket', { method: 'POST', body: JSON.stringify({ p_lines: [{ variantId: variant.id, quantity: 1 }], p_shipping: 0 }) }));
    for (const table of ['orders', 'payment_attempts', 'notification_jobs', 'inventory_movements']) await db(`${table}?select=id&limit=1`);
    return { ok: quote.currency === 'XOF' && Number(quote.amount_xof) === Number(variant.price),
      targetMatches: true, serverReadWrite: true, quoteMatchesCatalogue: Number(quote.amount_xof) === Number(variant.price) };
  });
  const providerGet = (path: string) => json(`https://api.fedapay.com/v1${path}`, { method: 'GET', headers: { Authorization: `Bearer ${env.FEDAPAY_SECRET_KEY}`, 'Content-Type': 'application/json' } }, 'fedapay');
  const liveKey = env.FEDAPAY_ENVIRONMENT === 'live' && env.FEDAPAY_SECRET_KEY?.startsWith('sk_live_') && env.FEDAPAY_ACCOUNT_ID === String(historical.merchant);
  await check('fedapay', async () => {
    if (!liveKey) throw new CheckError('live_key_or_merchant_not_configured');
    const payload = object(await providerGet(`/transactions/${historical.id}`));
    const tx = object(payload['v1/transaction'] ?? payload);
    let currency = object(tx.currency).iso;
    if (!currency && Number.isSafeInteger(tx.currency_id) && Number(tx.currency_id) > 0) {
      const resource = object(await providerGet(`/currencies/${tx.currency_id}`)); currency = object(resource['v1/currency'] ?? resource).iso;
    }
    const metadata = object(tx.custom_metadata);
    const match = { id: tx.id === historical.id, amount: Number(tx.amount) === historical.amount, currency: currency === 'XOF',
      merchant: tx.account_id === historical.merchant, paymentReference: metadata.payment_id === historical.payment,
      orderReference: metadata.order_id === historical.order, purpose: metadata.purpose === 'shop', merchantReference: tx.merchant_reference === historical.payment };
    const state = typeof tx.status === 'string' && /^[a-z_]{1,40}$/.test(tx.status) ? tx.status : 'unrecognized';
    return { ok: Object.values(match).every(Boolean), checks: match, providerId: historical.id, state,
      amountXof: Number(tx.amount) === historical.amount ? historical.amount : null, merchant: tx.account_id === historical.merchant ? historical.merchant : null,
      currency: currency === 'XOF' ? 'XOF' : 'unexpected', financialMutation: false };
  });
  await check('fedapayWebhook', async () => {
    if (!liveKey) throw new CheckError('live_key_or_merchant_not_configured');
    const payload = await providerGet('/webhooks');
    const wrapped = object(payload); const list = Array.isArray(payload) ? payload : wrapped['v1/webhooks'] ?? wrapped.webhooks;
    if (!Array.isArray(list)) throw new CheckError('webhook_list_unavailable');
    const matches = list.map(object).filter(row => row.url === `${origin}/api/payments/webhook`);
    // Do not output or store provider signing keys. Compare only when the API supplies one.
    const match = matches.find(row => row.enabled === true || row.disabled === false || row.status === 'enabled');
    const signing = match?.secret ?? match?.signing_secret;
    const secretMatches = typeof signing === 'string' && signing.length > 0 ? signing === env.FEDAPAY_WEBHOOK_SECRET : null;
    return { ok: Boolean(match) && secretMatches === true, endpointFound: matches.length > 0, enabled: Boolean(match),
      secretMatches, accountMatches: match?.account_id === historical.merchant, tlsVerified: match?.ssl_verify === true };
  });
  await check('resend', async () => {
    const to = env.ORDER_ADMIN_EMAIL || '';
    const allowed = (env.ORDER_TEST_EMAILS || '').split(',').map(value => value.trim().toLowerCase());
    if (!env.RESEND_API_KEY?.startsWith('re_') || env.ORDER_EMAIL_FROM !== 'La Maison des Pyjamas <notifications@ryadsaka.com>'
      || !allowed.includes(to.toLowerCase()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new CheckError('technical_email_not_configured');
    const message = object(await json('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `technical-production-${runId}` },
      body: JSON.stringify({ from: env.ORDER_EMAIL_FROM, to, subject: 'Vérification technique du serveur — La Maison des Pyjamas',
        text: 'Vérification technique de la messagerie depuis le serveur Netlify de production. Ce message ne correspond à aucune commande et ne confirme aucun paiement. Aucun débit effectué.',
        html: '<!doctype html><html lang="fr"><body><h1>La Maison des Pyjamas</h1><p>Vérification technique depuis le serveur de production.</p><p>Aucune commande créée et aucun paiement confirmé. Aucun débit effectué.</p></body></html>' }) }, 'resend'));
    if (typeof message.id !== 'string' || !uuid.test(message.id)) throw new CheckError('email_acknowledgement_invalid');
    return { ok: true, messageId: message.id, accepted: true, delivered: false, commercialOrderCreated: false };
  });
  const result = { state: 'completed', runId, deployId: event.deploy.id, commit: event.deploy.commitRef,
    completedAt: new Date().toISOString(), checks, financialMutation: false, historicalDataChanged: false };
  const response = await fetcher(`${productionDatabase}/rest/v1/activity_logs?id=eq.${runId}`, { method: 'PATCH', headers: { ...dbHeaders, Prefer: 'return=minimal' },
    redirect: 'error', signal: AbortSignal.timeout(8000), body: JSON.stringify({ after_data: result }) });
  if (!response.ok) throw new CheckError('verification_record_unavailable');
  return result;
}
