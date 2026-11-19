import { expect, it, vi } from 'vitest';
import { runProductionServiceChecks, type ProductionDeployEvent } from './production-service-checks';
const runId = 'cadc0e78-d885-4c23-8943-3179b93a3acb';
const event: ProductionDeployEvent = { deploy: { id: 'deploy-fixture', context: 'production', branch: 'main', publishedAt: new Date().toISOString(), commitRef: 'a'.repeat(40) }, site: { id: '42bea529-6f67-4dfb-b5e0-642cf9ce7456' } };
const env = { COMMERCE_VALIDATION_RUN_ID: runId, NEXT_PUBLIC_SUPABASE_URL: 'https://pukvrerdloudfiphomsj.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'fixture-db-secret',
  FEDAPAY_ENABLED: 'false', FEDAPAY_LIVE_APPROVED: 'false', PAYMENT_CHECKOUT_ENABLED: 'false', ORDER_NOTIFICATIONS_ENABLED: 'false',
  FEDAPAY_ENVIRONMENT: 'live', FEDAPAY_ACCOUNT_ID: '101915', FEDAPAY_SECRET_KEY: 'sk_live_fixture', FEDAPAY_WEBHOOK_SECRET: 'fixture-webhook-secret',
  RESEND_API_KEY: 're_fixture', ORDER_EMAIL_FROM: 'La Maison des Pyjamas <notifications@ryadsaka.com>', ORDER_ADMIN_EMAIL: 'staff@example.test', ORDER_TEST_EMAILS: 'staff@example.test' };
const transaction = { id: 113943841, amount: 100, account_id: 101915, status: 'expired', currency: { iso: 'XOF' },
  merchant_reference: 'c11b89dd-6eb0-4834-ac54-ad7fe5fb06a4', custom_metadata: { payment_id: 'c11b89dd-6eb0-4834-ac54-ad7fe5fb06a4', order_id: 'e876f767-bb08-4c56-bf43-2ae311b69f66', purpose: 'shop' } };
function setup({ duplicate = false, provider = transaction, providerStatus = 200, signing = env.FEDAPAY_WEBHOOK_SECRET } = {}) {
  const writes: { url: string; body: Record<string, unknown> }[] = [];
  const fetcher = vi.fn(async (url: string | URL | Request, init: RequestInit = {}) => {
    const target = String(url); const method = init.method || 'GET';
    expect(init.redirect).toBe('error');
    if (target.includes('/rest/v1/')) {
      if (method === 'POST' || method === 'PATCH') {
        const body = JSON.parse(String(init.body)); writes.push({ url: target, body });
        if (target.includes('/activity_logs')) return method === 'POST' ? Response.json(duplicate ? [] : [{ id: runId }]) : new Response(null, { status: 204 });
        if (target.endsWith('/rpc/quote_shop_basket')) return Response.json({ currency: 'XOF', amount_xof: 25000 });
        throw new Error('Unexpected database write');
      }
      if (target.includes('/product_variants?')) return Response.json([{ id: '11111111-1111-4111-8111-111111111111', price: 25000 }]);
      return Response.json([]);
    }
    if (target.startsWith('https://api.fedapay.com/v1/')) {
      expect(method).toBe('GET');
      if (target.endsWith('/transactions/113943841')) return Response.json({ 'v1/transaction': { ...provider, customer: { email: 'private@example.test' }, receipt_url: 'https://private.test/secret' } }, { status: providerStatus });
      if (target.endsWith('/webhooks')) return Response.json({ 'v1/webhooks': [{ url: 'https://pyjamas25.netlify.app/api/payments/webhook', enabled: true, secret: signing }] });
      throw new Error('Unexpected provider endpoint');
    }
    if (target === 'https://api.resend.com/emails') {
      expect(method).toBe('POST');
      return Response.json({ id: '33333333-3333-4333-8333-333333333333' });
    }
    throw new Error('Unexpected destination');
  });
  return { fetcher, writes };
}
it('uses only provider reads, quote reads, an audit record and one technical email', async () => {
  const { fetcher, writes } = setup();
  const result = await runProductionServiceChecks(event, env, fetcher);
  expect(result?.checks.supabase.ok).toBe(true);
  expect(result?.checks.fedapay).toMatchObject({ ok: true, state: 'expired', financialMutation: false });
  expect(result?.checks.fedapayWebhook).toMatchObject({ ok: true, enabled: true, secretMatches: true });
  expect(result?.checks.resend).toMatchObject({ ok: true, accepted: true, delivered: false, commercialOrderCreated: false });
  const call = fetcher.mock.calls.find(([url]) => url === 'https://api.resend.com/emails')!;
  expect(JSON.parse(String(call[1]?.body)).text).toContain('aucune commande');
  expect(new Headers(call[1]?.headers).get('Idempotency-Key')).toBe(`technical-production-${runId}`);
  expect(writes.filter(w => !w.url.includes('/rpc/'))).toHaveLength(2);
  const serialized = JSON.stringify(result);
  for (const secret of [env.SUPABASE_SERVICE_ROLE_KEY, env.FEDAPAY_SECRET_KEY, env.FEDAPAY_WEBHOOK_SECRET, env.RESEND_API_KEY, 'private@example.test', 'receipt_url']) expect(serialized).not.toContain(secret);
});
it('does nothing for previews, another project, an absent authorization or open sales', async () => {
  const { fetcher } = setup();
  for (const e of [{ ...event, deploy: { ...event.deploy, context: 'deploy-preview' } }, { ...event, site: { id: 'other' } }]) expect(await runProductionServiceChecks(e, env, fetcher)).toBeNull();
  for (const override of [{ COMMERCE_VALIDATION_RUN_ID: '' }, { NEXT_PUBLIC_SUPABASE_URL: 'https://recipe.supabase.co' }, { PAYMENT_CHECKOUT_ENABLED: 'true' }, { ORDER_NOTIFICATIONS_ENABLED: 'true' }]) expect(await runProductionServiceChecks(event, { ...env, ...override }, fetcher)).toBeNull();
  expect(fetcher).not.toHaveBeenCalled();
});
it('a repeated event never repeats provider reads or email sends', async () => {
  const { fetcher } = setup({ duplicate: true });
  expect(await runProductionServiceChecks(event, env, fetcher)).toBeNull();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('rejects a sandbox key without contacting the financial provider', async () => {
  const { fetcher } = setup();
  const result = await runProductionServiceChecks(event, { ...env, FEDAPAY_SECRET_KEY: 'sk_sandbox_fixture' }, fetcher);
  expect(result?.checks.fedapay).toEqual({ ok: false, code: 'live_key_or_merchant_not_configured' });
  expect(fetcher.mock.calls.some(([url]) => String(url).includes('fedapay.com'))).toBe(false);
});
it('marks wrong merchant identity and signing configuration as unvalidated', async () => {
  const { fetcher } = setup({ provider: { ...transaction, account_id: 4 }, signing: 'other' });
  const result = await runProductionServiceChecks(event, env, fetcher);
  expect(result?.checks.fedapay.ok).toBe(false);
  expect(result?.checks.fedapayWebhook.secretMatches).toBe(false);
});
it('stores only a safe error code when the provider returns a private failure body', async () => {
  const { fetcher } = setup({ providerStatus: 401 });
  const result = await runProductionServiceChecks(event, env, fetcher);
  expect(result?.checks.fedapay).toEqual({ ok: false, code: 'fedapay_http_401' });
  expect(JSON.stringify(result)).not.toContain('private@example.test');
});
