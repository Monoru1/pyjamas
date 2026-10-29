import { beforeEach,afterEach,expect,it,vi } from 'vitest';
vi.mock('server-only',()=>({}));
const mocks=vi.hoisted(()=>({db:{rpc:vi.fn(),from:vi.fn()},provider:vi.fn()}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>mocks.db}));
vi.mock('./fedapay',async(importOriginal)=>({...await importOriginal<object>(),providerRequest:mocks.provider}));
import {reconcilePayment,readProviderInitializationLogs} from './server';
const payment={id:'local',order_id:'order',provider_id:42,amount_xof:2000,purpose:'shop',environment:'sandbox',merchant_account_id:7};
const transaction={id:42,amount:2000,status:'approved',account_id:7,merchant_reference:'local',currency:{iso:'XOF'},custom_metadata:{payment_id:'local',order_id:'order',purpose:'shop'}};
function chain(data:unknown) {const q:Record<string,unknown>={then:(resolve:(v:unknown)=>unknown)=>Promise.resolve({data,error:null}).then(resolve)};for(const name of ['select','eq','single','is','update'])q[name]=()=>q;return q;}
beforeEach(()=>{vi.clearAllMocks();for(const [k,v] of Object.entries({FEDAPAY_ENABLED:'true',FEDAPAY_ENVIRONMENT:'sandbox',FEDAPAY_SECRET_KEY:'sk_sandbox_fixture',FEDAPAY_WEBHOOK_SECRET:'wh_fixture',SUPABASE_SERVICE_ROLE_KEY:'fixture',FEDAPAY_ACCOUNT_ID:'7',PAYMENT_DATABASE_ISOLATED:'true',NEXT_PUBLIC_SUPABASE_URL:'https://acceptance.supabase.co',PAYMENT_SITE_URL:'https://preview.example.test',PAYMENT_SHIPPING_XOF:'0'}))vi.stubEnv(k,v);mocks.db.from.mockReturnValue(chain(payment));mocks.db.rpc.mockResolvedValue({error:null});mocks.provider.mockResolvedValue(transaction);});
afterEach(()=>vi.unstubAllEnvs());
it('retrieves authoritative provider data before transactional payment application',async()=>{
 expect(await reconcilePayment('local','event:1')).toBe('paid');expect(mocks.provider).toHaveBeenCalledWith('/transactions/42');
 expect(mocks.db.rpc).toHaveBeenCalledWith('apply_shop_payment',expect.objectContaining({p_environment:'sandbox',p_event:'sandbox:event:1',p_account:7,p_amount:2000}));
});
it('resolves a numeric currency id instead of assuming XOF',async()=>{
 mocks.provider.mockImplementation(async(path:string)=>path.startsWith('/currencies/')?{'v1/currency':{iso:'XOF'}}:{...transaction,currency:undefined,currency_id:1});
 expect(await reconcilePayment('local','event:2')).toBe('paid');expect(mocks.provider).toHaveBeenCalledWith('/currencies/1');
});
it('rejects wrong merchant, reference, metadata, amount and currency without paying order',async()=>{
 for(const change of [{account_id:8},{merchant_reference:'other'},{custom_metadata:{...transaction.custom_metadata,order_id:'other'}},{amount:1},{currency:{iso:'EUR'}}]) {
  mocks.db.rpc.mockClear();mocks.provider.mockResolvedValue({...transaction,...change});
  await expect(reconcilePayment('local','event:3')).rejects.toThrow('Transaction incohérente');expect(mocks.db.rpc).not.toHaveBeenCalled();
 }
});
it('summarizes only token-request evidence for this provider id without returning secrets or private logs',async()=>{
 mocks.provider.mockResolvedValue({'v1/logs':[
  {url:'https://api.fedapay.com/v1/transactions/42/token',method:'POST',status:200,ip_address:'private-ip',body:'private-body',response:JSON.stringify({token:'private-token',url:'https://checkout.fedapay.com/private-token'})},
  {url:'https://api.fedapay.com/v1/transactions/43/token',method:'POST',status:200,response:'private-other-transaction'},
 ]});
 const result=await readProviderInitializationLogs(42);
 expect(result.entries).toHaveLength(1);expect(result.entries[0]).toMatchObject({status:200,tokenPresent:true,checkoutHost:'checkout.fedapay.com'});
 expect(JSON.stringify(result)).not.toContain('private');expect(mocks.provider).toHaveBeenCalledWith('/logs?per_page=100');
});
