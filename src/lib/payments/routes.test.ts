import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createQuoteToken } from './quotes';
import { createHmac, createHash } from 'node:crypto';
import { checkoutSchema } from './checkout-input';
const mocks=vi.hoisted(()=>({db:{rpc:vi.fn(),from:vi.fn()},resolved:vi.fn(),reconcile:vi.fn(),provider:vi.fn(),allowed:true,notifications:vi.fn()}));
vi.mock('@/lib/payments/server',()=>({paymentDatabase:()=>mocks.db,reconcilePayment:mocks.reconcile,resolvedTransaction:mocks.resolved}));
vi.mock('@/lib/payments/notifications',()=>({processNotificationJobs:mocks.notifications}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:async()=>({data:{user:{id:'staff'}}})},rpc:async()=>({data:mocks.allowed})})}));
vi.mock('@/lib/payments/fedapay',async(importOriginal)=>({...await importOriginal<object>(),providerRequest:mocks.provider}));
import { POST as checkout } from '@/app/api/payments/checkout/route';
import { POST as webhook } from '@/app/api/payments/webhook/route';
import { POST as reconcile } from '@/app/api/payments/reconcile/route';
import { GET as status } from '@/app/api/payments/status/route';
import { GET as inspect } from '@/app/api/payments/inspect/route';
const payment={id:'11111111-1111-4111-8111-111111111111',order_id:'22222222-2222-4222-8222-222222222222',public_token:'33333333-3333-4333-8333-333333333333',amount_xof:15500,provider_id:null as number|null,checkout_url:null as string|null,status:'pending'};
const quote={amount_xof:15500,shipping_xof:500,currency:'XOF' as const,items:[{variantId:'55555555-5555-4555-8555-555555555555',quantity:1,unitPrice:15000,name:'Fixture',maxStock:5}]};
const input={quoteToken:createQuoteToken(quote,'fixture-reconcile-secret-32-characters'),idempotencyKey:'44444444-4444-4444-8444-444444444444',customer:{name:'Fixture Test',phone:'+229 01 00 00 00 00',email:'test@example.test',address:'Adresse fictive 123',city:'Cotonou'},lines:[{variantId:'55555555-5555-4555-8555-555555555555',quantity:1}]};
const request=(body:unknown,origin='https://preview.example.test')=>new Request(`${origin}/api/payments/checkout`,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
function chain(data:unknown,error:unknown=null) {
 const query:Record<string,unknown>={then:(resolve:(value:unknown)=>unknown)=>Promise.resolve({data,error}).then(resolve)};
 for(const name of ['select','update','eq','is','not','order','limit','lte','single','maybeSingle']) query[name]=vi.fn(()=>query);
 return query;
}
beforeEach(()=>{
 vi.clearAllMocks();mocks.allowed=true;mocks.notifications.mockResolvedValue(0);
 const env={PAYMENT_RECONCILE_SECRET:'fixture-reconcile-secret-32-characters',PAYMENT_CHECKOUT_ENABLED:'true',FEDAPAY_ENABLED:'true',FEDAPAY_ENVIRONMENT:'sandbox',FEDAPAY_SECRET_KEY:'sk_sandbox_fixture',FEDAPAY_WEBHOOK_SECRET:'wh_fixture',SUPABASE_SERVICE_ROLE_KEY:'fixture',FEDAPAY_ACCOUNT_ID:'42',PAYMENT_DATABASE_ISOLATED:'true',NEXT_PUBLIC_SUPABASE_URL:'https://acceptance.supabase.co',PAYMENT_SITE_URL:'https://preview.example.test',PAYMENT_SHIPPING_XOF:'500'};
 for(const [key,value] of Object.entries(env))vi.stubEnv(key,value);
 mocks.db.rpc.mockImplementation(async(name:string)=>({data:name==='consume_order_request_budget'?true:name==='quote_shop_basket'?quote:{...payment},error:null}));
 mocks.db.from.mockImplementation(()=>chain([{id:payment.id}]));
 mocks.provider.mockImplementation(async(path:string)=>path.endsWith('/token')?{token:'fixture',url:'https://sandbox-checkout.fedapay.com/fixture'}:{id:42});
 mocks.resolved.mockResolvedValue({id:42,amount:15500,status:'pending',currency:{iso:'XOF'},account_id:42,merchant_reference:payment.id,custom_metadata:{payment_id:payment.id,order_id:payment.order_id,purpose:'shop'}});
});
afterEach(()=>vi.unstubAllEnvs());
it('creates checkout with only server-calculated amount and correct immutable order metadata',async()=>{
 const response=await checkout(request(input));expect(response.status).toBe(200);
 const creation=mocks.provider.mock.calls.find(([path])=>path==='/transactions');
 const sent=JSON.parse(creation![1].body);expect(sent.amount).toBe(15500);expect(sent.custom_metadata.order_id).toBe(payment.order_id);
 expect(sent.customer.phone_number.number).toBe('+2290100000000');
 expect(sent.callback_url).toBe(`https://preview.example.test/paiement?reference=${payment.public_token}`);
});
it('rejects supplied frontend amount, invalid origin and unauthorized sandbox users',async()=>{
 expect((await checkout(request({...input,amount:1}))).status).toBe(400);
 expect((await checkout(request(input,'https://evil.test'))).status).toBe(403);
 mocks.allowed=false;expect((await checkout(request(input))).status).toBe(403);expect(mocks.provider).not.toHaveBeenCalled();
});
it('does not POST again when a refresh finds provider creation already claimed',async()=>{
 mocks.db.from.mockImplementation(()=>chain([]));
 expect((await checkout(request(input))).status).toBe(409);expect(mocks.provider).not.toHaveBeenCalled();
});
it('recovers token generation for existing transaction without creating another charge',async()=>{
 mocks.db.rpc.mockImplementation(async(name:string)=>({data:name==='consume_order_request_budget'?true:name==='quote_shop_basket'?quote:{...payment,provider_id:42},error:null}));
 expect((await checkout(request(input))).status).toBe(200);
 expect(mocks.provider.mock.calls.map(([path])=>path)).toEqual(['/transactions/42/token']);
});
it('rechecks the provider recipient before returning an existing URL without creating a new transaction',async()=>{
 mocks.db.rpc.mockImplementation(async(name:string)=>({data:name==='consume_order_request_budget'?true:name==='quote_shop_basket'?quote:{...payment,provider_id:42,checkout_url:'https://sandbox-checkout.fedapay.com/existing'},error:null}));
 expect((await checkout(request(input))).status).toBe(200);expect(mocks.provider).not.toHaveBeenCalled();
 expect(mocks.resolved).toHaveBeenCalledWith(42);
});
it('never offers a payment link when provider merchant or amount differs',async()=>{
 for(const override of [{account_id:43},{amount:1}]) {
  mocks.provider.mockClear();mocks.resolved.mockResolvedValue({id:42,amount:15500,status:'pending',currency:{iso:'XOF'},account_id:42,merchant_reference:payment.id,custom_metadata:{payment_id:payment.id,order_id:payment.order_id,purpose:'shop'},...override});
  expect((await checkout(request(input))).status).toBe(503);
  expect(mocks.provider.mock.calls.some(([path])=>String(path).endsWith('/token'))).toBe(false);
 }
});
it('returns retryable error on provider failure, never pretending payment succeeded',async()=>{
 mocks.provider.mockRejectedValue(new Error('timeout'));
 expect((await checkout(request(input))).status).toBe(503);
});
it('suspends new checkouts without disabling server payment configuration',async()=>{
 vi.stubEnv('PAYMENT_CHECKOUT_ENABLED','false');expect((await checkout(request(input))).status).toBe(503);expect(mocks.provider).not.toHaveBeenCalled();
 mocks.db.from.mockImplementation(()=>chain({status:'pending',environment:'sandbox',amount_xof:15500}));
 expect((await status(new Request(`https://preview.example.test/api/payments/status?reference=${payment.public_token}`))).status).toBe(200);
});
it('rate-limits checkout before creating a provider transaction',async()=>{
 mocks.db.rpc.mockResolvedValue({data:false,error:null});expect((await checkout(request(input))).status).toBe(429);expect(mocks.provider).not.toHaveBeenCalled();
});
function signedEvent(valid=true) {
 const body=JSON.stringify({id:100,name:'transaction.approved',entity:{id:42}});const t=Math.floor(Date.now()/1000);
 const signature=createHmac('sha256',valid?'wh_fixture':'wrong').update(`${t}.${body}`).digest('hex');
 return new Request('https://preview.example.test/api/payments/webhook',{method:'POST',headers:{'content-type':'application/json','x-fedapay-signature':`t=${t},s=${signature}`},body});
}
it('invalid webhook never reaches reconciliation, valid replay uses the same event key',async()=>{
 expect((await webhook(signedEvent(false))).status).toBe(400);expect(mocks.reconcile).not.toHaveBeenCalled();
 mocks.db.from.mockImplementation(()=>chain({id:payment.id}));
 expect((await webhook(signedEvent())).status).toBe(200);expect((await webhook(signedEvent())).status).toBe(200);
 expect(mocks.reconcile.mock.calls[0]).toEqual(mocks.reconcile.mock.calls[1]);
});
it('provider lookup failure makes webhook retryable',async()=>{
 mocks.db.from.mockImplementation(()=>chain({id:payment.id}));mocks.reconcile.mockRejectedValueOnce(new Error('provider unavailable'));
 expect((await webhook(signedEvent())).status).toBe(503);
});
it('browser return parameters cannot confirm an unpaid transaction',async()=>{
 mocks.db.from.mockImplementation(()=>chain({status:'pending',amount_xof:15500,environment:'sandbox',orders:{order_number:'FIXTURE',needs_attention:false}}));
 const response=await status(new Request(`https://preview.example.test/api/payments/status?reference=${payment.public_token}&status=approved`));
 expect((await response.json()).status).toBe('pending');expect(mocks.reconcile).not.toHaveBeenCalled();
});
it('reconciliation rejects unauthorized callers without querying the DB',async()=>{
 expect((await reconcile(new Request('https://preview.example.test/api/payments/reconcile',{method:'POST'}))).status).toBe(401);expect(mocks.db.from).not.toHaveBeenCalled();
});
it('returns the new total before creating any order or provider transaction when prices changed',async()=>{
 const r=await checkout(request({...input,quoteToken:'stale'}));expect(r.status).toBe(409);expect((await r.json()).quote.amount_xof).toBe(15500);
 expect(mocks.db.rpc.mock.calls.some(([name])=>name==='create_shop_payment')).toBe(false);expect(mocks.provider).not.toHaveBeenCalled();
});
it('live preview rejects anonymous staff access and an amount above the owner ceiling',async()=>{
 for(const [key,value]of Object.entries({FEDAPAY_ENVIRONMENT:'live',FEDAPAY_SECRET_KEY:'sk_live_fixture',CONTEXT:'deploy-preview',REVIEW_ID:'11',PAYMENT_SITE_URL:'https://deploy-preview-11--pyjamas25.netlify.app',NEXT_PUBLIC_SUPABASE_URL:'https://oxhymanjibveayhcaqvj.supabase.co',PAYMENT_LIVE_TEST_ENABLED:'true',PAYMENT_LIVE_TEST_MAX_XOF:'100',PAYMENT_LIVE_TEST_AUTHORIZATION_ID:'11111111-1111-4111-8111-111111111111'}))vi.stubEnv(key,value);
 const req=()=>request(input,'https://deploy-preview-11--pyjamas25.netlify.app');
 mocks.allowed=false;expect((await checkout(req())).status).toBe(403);
 mocks.allowed=true;expect((await checkout(req())).status).toBe(403);expect(mocks.provider).not.toHaveBeenCalled();
});
it('rejects an invalid webhook even when new payment processing is disabled',async()=>{
 vi.stubEnv('FEDAPAY_ENABLED','false');expect((await webhook(signedEvent(false))).status).toBe(400);expect(mocks.reconcile).not.toHaveBeenCalled();
});
it('requires staff for read-only provider inspection and reports comparisons without private fields',async()=>{
 const req=()=>new Request(`https://preview.example.test/api/payments/inspect?payment=${payment.id}`);
 mocks.allowed=false;expect((await inspect(req())).status).toBe(403);expect(mocks.resolved).not.toHaveBeenCalled();
 mocks.allowed=true;
 mocks.db.from.mockImplementation(()=>chain({...payment,provider_id:42,purpose:'shop',merchant_account_id:42}));
 mocks.resolved.mockResolvedValue({id:42,amount:15500,status:'pending',currency:{iso:'XOF'},account_id:42,merchant_reference:null,custom_metadata:{payment_id:payment.id,order_id:payment.order_id,purpose:'shop'},customer:{email:'private@example.invalid'},transaction_key:'private-provider-token'});
 const response=await inspect(req());const result=await response.json();
 expect(response.status).toBe(200);expect(result.firstMismatch).toBe('merchant_reference');expect(result.checks.paymentReference).toBe(true);expect(result.financialMutation).toBe(false);
 expect(JSON.stringify(result)).not.toContain('private@example.invalid');expect(JSON.stringify(result)).not.toContain('private-provider-token');
 expect(mocks.provider).not.toHaveBeenCalled();expect(mocks.db.rpc).not.toHaveBeenCalled();
});
it('reconfirms and resumes the same reserved last unit after refresh without rereading available stock or creating a charge',async()=>{
 const parsed=checkoutSchema.parse(input);
 const hash=createHash('sha256').update(JSON.stringify({customer:parsed.customer,lines:parsed.lines})).digest('hex');
 mocks.db.from.mockImplementation(()=>chain({...payment,request_hash:hash,environment:'sandbox',merchant_account_id:42,items:quote.items}));
 mocks.db.rpc.mockImplementation(async(name:string)=>({data:name==='consume_order_request_budget'?true:name==='quote_shop_basket'?null:{...payment,provider_id:42},error:null}));
 const review=await checkout(request({...input,quoteToken:undefined}));
 expect(review.status).toBe(409);const data=await review.json();expect(data.quote.reserved).toBe(true);expect(data.quote.amount_xof).toBe(15500);
 expect(mocks.provider).not.toHaveBeenCalled();
 expect((await checkout(request({...input,quoteToken:data.quoteToken}))).status).toBe(200);
 expect(mocks.db.rpc.mock.calls.some(([name])=>name==='quote_shop_basket')).toBe(false);
 expect(mocks.provider.mock.calls.map(([path])=>path)).toEqual(['/transactions/42/token']);
 mocks.provider.mockClear();expect((await checkout(request({...input,customer:{...input.customer,name:'Other Name'}}))).status).toBe(409);expect(mocks.provider).not.toHaveBeenCalled();
});
