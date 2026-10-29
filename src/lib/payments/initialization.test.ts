import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({db:{from:vi.fn()},resolved:vi.fn(),provider:vi.fn(),reconcile:vi.fn(),permission:{} as Record<string,unknown>,payment:{} as Record<string,unknown>,updates:[] as Record<string,unknown>[]}));
vi.mock('./server',()=>({paymentDatabase:()=>mocks.db,resolvedTransaction:mocks.resolved,reconcilePayment:mocks.reconcile}));
vi.mock('./fedapay',async original=>({...await original<object>(),providerRequest:mocks.provider}));
import { recoverPrivateCheckout } from './initialization';
import { ProviderHttpError } from './fedapay';
const id='11111111-1111-4111-8111-111111111111';
function chain(data:unknown){const q:Record<string,unknown>={then:(resolve:(v:unknown)=>unknown)=>Promise.resolve({data,error:null}).then(resolve)};for(const k of ['select','eq','maybeSingle'])q[k]=()=>q;q.update=(u:Record<string,unknown>)=>{mocks.updates.push(u);return q;};return q;}
beforeEach(()=>{
 vi.clearAllMocks();mocks.updates=[];
 for(const[k,v]of Object.entries({FEDAPAY_ENABLED:'true',PAYMENT_CHECKOUT_ENABLED:'true',FEDAPAY_ENVIRONMENT:'live',FEDAPAY_SECRET_KEY:'sk_live_fixture',FEDAPAY_WEBHOOK_SECRET:'wh_fixture',SUPABASE_SERVICE_ROLE_KEY:'fixture',FEDAPAY_ACCOUNT_ID:'101915',PAYMENT_DATABASE_ISOLATED:'true',NEXT_PUBLIC_SUPABASE_URL:'https://oxhymanjibveayhcaqvj.supabase.co',PAYMENT_SITE_URL:'https://deploy-preview-11--pyjamas25.netlify.app',CONTEXT:'deploy-preview',REVIEW_ID:'11',FEDAPAY_LIVE_APPROVED:'false',PAYMENT_SHIPPING_XOF:'0',PAYMENT_LIVE_TEST_ENABLED:'true',PAYMENT_LIVE_TEST_MAX_XOF:'100',PAYMENT_LIVE_TEST_AUTHORIZATION_ID:id}))vi.stubEnv(k,v);
 mocks.permission={staff_user_id:'staff',merchant_account_id:101915,amount_xof:100,expires_at:new Date(Date.now()+300000).toISOString(),revoked_at:null,payment_id:id};
 mocks.payment={id,order_id:'order',provider_id:113943841,public_token:'reference',amount_xof:100,merchant_account_id:101915,status:'pending',checkout_url:null};
 mocks.db.from.mockImplementation((table:string)=>chain(table==='live_test_authorizations'?mocks.permission:mocks.payment));
 mocks.resolved.mockResolvedValue({id:113943841,amount:100,status:'pending',currency:{iso:'XOF'},account_id:101915,merchant_reference:id,custom_metadata:{payment_id:id,purpose:'shop',order_id:'order'}});
 mocks.provider.mockResolvedValue({token:'fixture-token',url:'https://checkout.fedapay.com/fixture-token'});
});
afterEach(()=>vi.unstubAllEnvs());
it('reuses the bound provider id, generates only its token and persists a validated link',async()=>{
 expect(await recoverPrivateCheckout(id,'staff')).toBe('checkout_ready');
 expect(mocks.provider.mock.calls.map(([path])=>path)).toEqual(['/transactions/113943841/token']);
 expect(mocks.updates).toContainEqual({checkout_url:'https://checkout.fedapay.com/fixture-token',last_error:null});
});
it('expired, revoked, wrong-staff, wrong-merchant and different-intent approvals never contact the provider',async()=>{
 const valid={...mocks.permission};
 for(const change of [{expires_at:new Date(0).toISOString()},{expires_at:'invalid'},{revoked_at:new Date().toISOString()},{staff_user_id:'other'},{merchant_account_id:9},{amount_xof:101},{payment_id:'other'}]){
  mocks.permission={...valid,...change};expect(await recoverPrivateCheckout(id,'staff')).toBe('approval_required');
 }
 expect(mocks.provider).not.toHaveBeenCalled();expect(mocks.resolved).not.toHaveBeenCalled();expect(mocks.updates).toHaveLength(0);
});
it('requires an existing provider association and the exact approved amount',async()=>{
 const valid={...mocks.payment};
 for(const change of [{provider_id:null},{amount_xof:99},{merchant_account_id:9}]){mocks.payment={...valid,...change};expect(await recoverPrivateCheckout(id,'staff')).toBe('unavailable');}
 expect(mocks.provider).not.toHaveBeenCalled();
});
it('returns an existing validated link without generating another token',async()=>{
 mocks.payment.checkout_url='https://checkout.fedapay.com/fixture-token';
 expect(await recoverPrivateCheckout(id,'staff')).toBe('checkout_ready');expect(mocks.provider).not.toHaveBeenCalled();expect(mocks.resolved).toHaveBeenCalledOnce();
});
it('reconciles a provider-confirmed terminal state instead of offering a new link',async()=>{
 for(const state of ['approved','expired','refunded','approved_partially_refunded']){
  mocks.resolved.mockResolvedValue({id:113943841,amount:100,status:state,currency:{iso:'XOF'},account_id:101915,merchant_reference:id,custom_metadata:{payment_id:id,purpose:'shop',order_id:'order'}});
  expect(await recoverPrivateCheckout(id,'staff')).toBe('state_updated');
 }
 expect(mocks.provider).not.toHaveBeenCalled();expect(mocks.reconcile).toHaveBeenCalledTimes(4);
});
it('records only safe phase and HTTP status on token failure, preserving the same transaction',async()=>{
 const spy=vi.spyOn(console,'error').mockImplementation(()=>{});
 try {mocks.provider.mockRejectedValue(new ProviderHttpError(403));expect(await recoverPrivateCheckout(id,'staff')).toBe('retry_failed');
 expect(mocks.updates).toContainEqual({last_error:'initialization_failed:request_checkout_token:http_403'});
 expect(JSON.stringify(spy.mock.calls)).not.toContain('sk_live_fixture');expect(JSON.stringify(spy.mock.calls)).not.toContain('fixture-token');}finally{spy.mockRestore();}
});
