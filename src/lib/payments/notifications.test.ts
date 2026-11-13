import { beforeEach,afterEach,expect,it,vi } from 'vitest';
vi.mock('server-only',()=>({}));
const mocks=vi.hoisted(()=>({db:{rpc:vi.fn(),from:vi.fn()}}));
vi.mock('./operations',()=>({operationsDatabase:()=>mocks.db}));
import { processNotificationJobs,sendOrderEmail } from './notifications';
const updates:Record<string,unknown>[]=[];
function result(data:unknown) {
 const q:Record<string,unknown>={then:(resolve:(value:unknown)=>unknown)=>Promise.resolve({data,error:null}).then(resolve)};
 for(const method of ['select','eq','single','maybeSingle','order','in'])q[method]=()=>q;
 q.update=(v:Record<string,unknown>)=>{updates.push(v);return q;};return q;
}
beforeEach(()=>{vi.stubEnv('ORDER_NOTIFICATIONS_ENABLED','true');vi.stubEnv('ORDER_TEST_EMAILS','customer@example.test,fixture@example.test,admin@example.test,b');vi.clearAllMocks();updates.length=0;vi.stubEnv('RESEND_API_KEY','fixture');vi.stubEnv('ORDER_EMAIL_FROM','sender@example.test');vi.stubEnv('ORDER_ADMIN_EMAIL','admin@example.test');
 mocks.db.rpc.mockResolvedValue({data:{id:'job',order_id:'order',kind:'admin_email',lease_token:'lease',attempts:1,created_at:new Date().toISOString()},error:null});
 mocks.db.from.mockImplementation((table:string)=>result(table==='orders'?{order_number:'TEST',total:2000,payment_state:'paid',delivery:{email:'customer@example.test'}}:table==='order_items'?[]:[{id:'job'}]));
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('uses a stable provider idempotency key and checks actual send response',async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({id:'provider-message'})));
 await sendOrderEmail({from:'sender@example.test',to:'customer@example.test',subject:'fixture',text:'fixture'},'job',fetcher);
 expect(fetcher.mock.calls[0][1].headers['Idempotency-Key']).toBe('order-job');
 expect(fetcher.mock.calls[0][1].redirect).toBe('error');
 const redirected=vi.fn().mockResolvedValue(new Response(null,{status:307,headers:{location:'https://other.example/emails'}}));
 await expect(sendOrderEmail({from:'a',to:'admin@example.test',subject:'s',text:'t'},'job',redirected)).rejects.toThrow('email_provider_failed');
 const failed=vi.fn().mockResolvedValue(new Response('{}',{status:503}));
 await expect(sendOrderEmail({from:'a',to:'admin@example.test',subject:'s',text:'t'},'job',failed)).rejects.toThrow('email_provider_failed');
});
it('mail failure stays retryable and is never marked sent',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}',{status:503})));
 expect(await processNotificationJobs(1)).toBe(0);
 expect(updates).toContainEqual(expect.objectContaining({status:'pending',last_error:'email_provider_failed'}));
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

it('does not send a retry after another worker has acquired the lease',async()=>{
 mocks.db.rpc.mockResolvedValue({data:{id:'job',order_id:'order',kind:'admin_email',lease_token:'old',attempts:2,first_delivery_at:new Date().toISOString()},error:null});
 mocks.db.from.mockImplementation((table:string)=>result(table==='orders'?{order_number:'TEST',total:2000,payment_state:'paid',delivery:{email:'customer@example.test'}}:[]));
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 expect(await processNotificationJobs(1)).toBe(0);expect(fetcher).not.toHaveBeenCalled();
});
it('never reports delivery when the acknowledgement loses its lease',async()=>{
 let notificationCalls=0;
 mocks.db.from.mockImplementation((table:string)=>result(table==='orders'?{order_number:'TEST',total:2000,payment_state:'paid',delivery:{email:'customer@example.test'}}:table==='order_items'?[]:++notificationCalls===1?[{id:'job'}]:[]));
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({id:'provider-message'}))));
 expect(await processNotificationJobs(1)).toBe(0);
});
it('rejects an empty provider acknowledgement',async()=>{
 await expect(sendOrderEmail({from:'a',to:'admin@example.test',subject:'s',text:'t'},'job',vi.fn().mockResolvedValue(new Response('{"id":""}')))).rejects.toThrow('email_provider_invalid');
});

it('disabled notifications do not claim work or contact providers',async()=>{vi.stubEnv('ORDER_NOTIFICATIONS_ENABLED','false');expect(await processNotificationJobs(2)).toBe(0);expect(mocks.db.rpc).not.toHaveBeenCalled();});

it('renders all nine email models and escapes product data', async () => {
 const { demoEmailOrder, emailKinds, renderOrderEmail } = await import('./order-email');
 expect(emailKinds).toHaveLength(9);
 for (const kind of emailKinds) {
  const message = renderOrderEmail(kind, demoEmailOrder, 'https://pyjamas25.netlify.app');
  expect(message.subject).toContain('[DÉMONSTRATION]');
  expect(message.html).toContain('logo-email.png');
  expect(message.html).toContain('Taille M');
  expect(message.text).toContain('25\u202f000 FCFA');
 }
 const pending = renderOrderEmail('staff_email_new', { ...demoEmailOrder, demo: false,
   lines: [{ name: '<script>fixture</script>', quantity: 1, total: 25000, photo: 'https://evil.test/1.png' }],
 }, 'https://pyjamas25.netlify.app');
 expect(pending.subject).toContain('en attente de paiement');
 expect(pending.html).toContain('&lt;script&gt;fixture');
 expect(pending.html).not.toContain('evil.test');
 expect(pending.html).not.toContain('DÉMONSTRATION');
});
