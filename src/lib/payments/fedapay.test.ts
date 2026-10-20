import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { mapProviderStatus, paymentConfiguration, providerRequest, safeCheckoutUrl, transactionFromResponse, validateTransaction, verifyWebhook } from './fedapay';

const env = { FEDAPAY_ENABLED:'true', FEDAPAY_ENVIRONMENT:'sandbox', FEDAPAY_SECRET_KEY:'sk_sandbox_test', FEDAPAY_WEBHOOK_SECRET:'wh_test', SUPABASE_SERVICE_ROLE_KEY:'test', PAYMENT_SITE_URL:'https://example.com' };
const body = '{"id":42,"name":"transaction.approved"}';
const header = (raw = body, timestamp = 1000) => `t=${timestamp},s=${createHmac('sha256','wh_test').update(`${timestamp}.${raw}`).digest('hex')}`;

describe('FedaPay fail-closed configuration and webhooks', () => {
  it('permits configured sandbox only', () => {
    expect(paymentConfiguration(env).origin).toBe('https://example.com');
    for (const override of [{FEDAPAY_ENVIRONMENT:'live'}, {FEDAPAY_SECRET_KEY:'sk_live_no'}, {FEDAPAY_ENABLED:'false'}, {SUPABASE_SERVICE_ROLE_KEY:''}, {PAYMENT_SITE_URL:'http://example.com'}]) expect(() => paymentConfiguration({...env,...override})).toThrow();
  });
  it('accepts official s signatures and multiple signatures', () => {
    expect(verifyWebhook(body, header(), 'wh_test',1000)).toBe(true);
    expect(verifyWebhook(body, header()+',s='+ '0'.repeat(64), 'wh_test',1000)).toBe(true);
  });
  it('rejects forged, modified, old and future-dated notifications', () => {
    expect(verifyWebhook(body+' ',header(),'wh_test',1000)).toBe(false);
    expect(verifyWebhook(body,header(),'wrong',1000)).toBe(false);
    expect(verifyWebhook(body,header(),'wh_test',1301)).toBe(false);
    expect(verifyWebhook(body,header(),'wh_test',699)).toBe(false);
    for(const h of [null,'s=no','t=1000,s=no',header()+',t=1000','t=NaN,s=bad']) expect(verifyWebhook(body,h,'wh_test',1000)).toBe(false);
  });
  it('maps final provider states and fails closed on unknown states',()=>{
    expect(mapProviderStatus('approved')).toBe('paid');
    expect(mapProviderStatus('transferred')).toBe('paid');
    expect(mapProviderStatus('declined')).toBe('failed');
    expect(mapProviderStatus('canceled')).toBe('cancelled');
    expect(mapProviderStatus('refunded')).toBe('refunded');
    expect(mapProviderStatus('transferred_partially_refunded')).toBe('partially_refunded');
    expect(mapProviderStatus('anything')).toBe('pending');
  });
  it('checks amount, currency, provider id and business purpose after server retrieval',()=>{
    const p={id:'local',provider_id:42,amount_xof:1000,purpose:'shop'};
    const t={id:42,amount:1000,status:'approved',currency:{iso:'XOF'},custom_metadata:{payment_id:'local',purpose:'shop'}};
    expect(validateTransaction(t,p)).toBe('paid');
    for(const change of [{amount:1},{id:43},{currency:{iso:'EUR'}},{custom_metadata:{payment_id:'local',purpose:'event'}}]) expect(()=>validateTransaction({...t,...change},p)).toThrow();
  });
  it('only redirects to the sandbox checkout host',()=>{
    expect(safeCheckoutUrl('https://sandbox-checkout.fedapay.com/token')).toContain('sandbox-checkout');
    for(const url of ['javascript:alert(1)','https://evil.test','https://sandbox-checkout.fedapay.com.evil.test','https://user:pw@sandbox-checkout.fedapay.com/token']) expect(()=>safeCheckoutUrl(url)).toThrow();
  });
  it('handles provider wrappers without accepting an invalid id',()=>{
    expect(transactionFromResponse({'v1/transaction':{id:42}}).id).toBe(42);
    expect(()=>transactionFromResponse({id:'42'})).toThrow();
  });
  it('uses sandbox-only requests with timeout and never trusts HTTP errors',async()=>{
    for(const [key,value] of Object.entries(env))vi.stubEnv(key,value);
    const fetcher=vi.fn().mockResolvedValue(new Response('{}',{status:503}));
    await expect(providerRequest('/transactions',{},fetcher)).rejects.toThrow();
    expect(fetcher.mock.calls[0][0]).toBe('https://sandbox-api.fedapay.com/v1/transactions');
    await expect(providerRequest('/payouts',{},fetcher)).rejects.toThrow();
    vi.unstubAllEnvs();
  });
});
