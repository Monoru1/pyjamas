import { beforeEach,afterEach,expect,it,vi } from 'vitest';
vi.mock('server-only',()=>({}));
const mocks=vi.hoisted(()=>({db:{rpc:vi.fn(),from:vi.fn()}}));
vi.mock('./server',()=>({paymentDatabase:()=>mocks.db}));
import { processNotificationJobs,sendOrderEmail } from './notifications';
const updates:Record<string,unknown>[]=[];
function result(data:unknown) {
 const q:Record<string,unknown>={then:(resolve:(value:unknown)=>unknown)=>Promise.resolve({data,error:null}).then(resolve)};
 for(const method of ['select','eq','single'])q[method]=()=>q;
 q.update=(v:Record<string,unknown>)=>{updates.push(v);return q;};return q;
}
beforeEach(()=>{vi.clearAllMocks();updates.length=0;vi.stubEnv('RESEND_API_KEY','fixture');vi.stubEnv('ORDER_EMAIL_FROM','sender@example.test');
 mocks.db.rpc.mockResolvedValue({data:{id:'job',order_id:'order',kind:'customer_email',lease_token:'lease',attempts:1,created_at:new Date().toISOString()},error:null});
 mocks.db.from.mockImplementation((table:string)=>result(table==='orders'?{order_number:'TEST',total:2000,payment_state:'paid',delivery:{email:'customer@example.test'}}:[{id:'job'}]));
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('uses a stable provider idempotency key and checks actual send response',async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({id:'provider-message'})));
 await sendOrderEmail({from:'sender@example.test',to:'customer@example.test',subject:'fixture',text:'fixture'},'job',fetcher);
 expect(fetcher.mock.calls[0][1].headers['Idempotency-Key']).toBe('order-job');
 const failed=vi.fn().mockResolvedValue(new Response('{}',{status:503}));
 await expect(sendOrderEmail({from:'a',to:'b',subject:'s',text:'t'},'job',failed)).rejects.toThrow('email_provider_failed');
});
it('mail failure stays retryable and is never marked sent',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}',{status:503})));
 expect(await processNotificationJobs(1)).toBe(0);
 expect(updates).toContainEqual(expect.objectContaining({status:'pending',last_error:'email_delivery_failed'}));
 expect(updates.some(u=>u.status==='sent')).toBe(false);
});
it('missing email configuration queues work visibly without claiming delivery',async()=>{
 vi.stubEnv('RESEND_API_KEY','');const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 expect(await processNotificationJobs(1)).toBe(0);expect(fetcher).not.toHaveBeenCalled();expect(updates).toContainEqual(expect.objectContaining({last_error:'email_not_configured_or_order_unavailable'}));
});
it('successful provider response marks the leased job sent',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({id:'provider-message'}))));
 expect(await processNotificationJobs(1)).toBe(1);expect(updates).toContainEqual(expect.objectContaining({status:'sent',last_error:null}));
});
