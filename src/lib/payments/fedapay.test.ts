import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { mapProviderStatus, paymentConfiguration, providerRequest, safeCheckoutUrl, transactionFromResponse, validateTransaction, verifyWebhook } from './fedapay';

const env = { FEDAPAY_ENABLED:'true', FEDAPAY_ENVIRONMENT:'sandbox', FEDAPAY_SECRET_KEY:'sk_sandbox_test', FEDAPAY_WEBHOOK_SECRET:'wh_test', SUPABASE_SERVICE_ROLE_KEY:'test', PAYMENT_SITE_URL:'https://example.com', FEDAPAY_ACCOUNT_ID:'42', PAYMENT_DATABASE_ISOLATED:'true', NEXT_PUBLIC_SUPABASE_URL:'https://acceptance.supabase.co', PAYMENT_SHIPPING_XOF:'0' };
const body = '{"id":42,"name":"transaction.approved"}';
const header = (raw = body, timestamp = 1000) => `t=${timestamp},s=${createHmac('sha256','wh_test').update(`${timestamp}.${raw}`).digest('hex')}`;

describe('FedaPay fail-closed configuration and webhooks', () => {
  it('requires isolated sandbox and explicit production approval', () => {
    expect(paymentConfiguration(env).origin).toBe('https://example.com');
    for (const override of [{FEDAPAY_ENVIRONMENT:'live'}, {FEDAPAY_SECRET_KEY:'sk_live_no'}, {FEDAPAY_ENABLED:'false'}, {SUPABASE_SERVICE_ROLE_KEY:''}, {PAYMENT_SITE_URL:'http://example.com'}]) expect(() => paymentConfiguration({...env,...override})).toThrow();
  });
  it('accepts live only in production after final approval and rejects sandbox production DB', () => {
    const live={...env,FEDAPAY_ENVIRONMENT:'live',FEDAPAY_SECRET_KEY:'sk_live_test',CONTEXT:'production',FEDAPAY_LIVE_APPROVED:'true'};
    expect(paymentConfiguration(live).apiOrigin).toBe('https://api.fedapay.com');
    expect(()=>paymentConfiguration({...live,CONTEXT:'deploy-preview'})).toThrow();
    expect(()=>paymentConfiguration({...env,NEXT_PUBLIC_SUPABASE_URL:'https://pukvrerdloudfiphomsj.supabase.co'})).toThrow();
    expect(()=>paymentConfiguration({...env,PAYMENT_SHIPPING_XOF:''})).toThrow();
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

it('allows live acceptance only on PR 11 and the exact isolated database with a strict ceiling',()=>{
 const acceptance={...env,FEDAPAY_ENVIRONMENT:'live',FEDAPAY_SECRET_KEY:'sk_live_fixture',CONTEXT:'deploy-preview',REVIEW_ID:'11',PAYMENT_SITE_URL:'https://deploy-preview-11--pyjamas25.netlify.app',NEXT_PUBLIC_SUPABASE_URL:'https://oxhymanjibveayhcaqvj.supabase.co',PAYMENT_LIVE_TEST_ENABLED:'true',PAYMENT_LIVE_TEST_MAX_XOF:'100',PAYMENT_LIVE_TEST_AUTHORIZATION_ID:'11111111-1111-4111-8111-111111111111'};
 expect(paymentConfiguration(acceptance)).toMatchObject({liveTest:true,staffOnly:true,testCeiling:100});
 for(const override of [{REVIEW_ID:'12'},{CONTEXT:'production'},{FEDAPAY_LIVE_APPROVED:'true'},{PAYMENT_SITE_URL:'https://other.netlify.app'},{NEXT_PUBLIC_SUPABASE_URL:'https://pukvrerdloudfiphomsj.supabase.co'},{PAYMENT_LIVE_TEST_ENABLED:'false'},{PAYMENT_LIVE_TEST_MAX_XOF:'1001'},{PAYMENT_LIVE_TEST_AUTHORIZATION_ID:''},{FEDAPAY_SECRET_KEY:'sk_sandbox_fixture'}])expect(()=>paymentConfiguration({...acceptance,...override})).toThrow();
});
it('uses the real build metadata when Netlify does not provide CONTEXT/REVIEW_ID at runtime',()=>{
 try {
  const values={...env,FEDAPAY_ENVIRONMENT:'live',FEDAPAY_SECRET_KEY:'sk_live_fixture',NEXT_PUBLIC_SUPABASE_URL:'https://oxhymanjibveayhcaqvj.supabase.co',FEDAPAY_LIVE_APPROVED:'false',PAYMENT_LIVE_TEST_ENABLED:'true',PAYMENT_LIVE_TEST_MAX_XOF:'100',PAYMENT_LIVE_TEST_AUTHORIZATION_ID:'11111111-1111-4111-8111-111111111111',PAYMENT_BUILD_CONTEXT:'deploy-preview',PAYMENT_BUILD_REVIEW_ID:'11',PAYMENT_BUILD_ORIGIN:'https://deploy-preview-11--pyjamas25.netlify.app'};
  for(const [key,value]of Object.entries(values))vi.stubEnv(key,value);
  vi.stubEnv('CONTEXT',undefined);vi.stubEnv('REVIEW_ID',undefined);
  expect(paymentConfiguration().liveTest).toBe(true);
  vi.stubEnv('CONTEXT','production');expect(paymentConfiguration().liveTest).toBe(true);
  vi.stubEnv('PAYMENT_BUILD_REVIEW_ID','12');expect(()=>paymentConfiguration()).toThrow();
 }finally{vi.unstubAllEnvs();}
});
