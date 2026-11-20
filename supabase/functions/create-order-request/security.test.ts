import { expect, it, vi } from 'vitest';
import { serverConfiguration, requestBudgetSubject } from './security.ts';
import { createOrderRequestHandler } from './handler.ts';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const hmac='b'.repeat(64), apiKey='sb_secret_isolated_fixture';
const environment:Record<string,string>={SUPABASE_URL:'https://fixture.invalid',SUPABASE_SECRET_KEYS:JSON.stringify({default:apiKey}),ORDER_REQUEST_HMAC_SECRET:hmac,ORDER_REQUEST_HMAC_READY_AT:'2026-01-01T00:06:00Z',ORDER_REQUESTS_ENABLED:'true'};
const body={idempotencyKey:'11111111-1111-4111-8111-111111111111',customer:{name:'Fixture client',phone:'2290100000000'},lines:[{variantId:'22222222-2222-4222-8222-222222222222',quantity:1}]};
const request=(data:unknown=body)=>new Request('https://fixture.invalid',{method:'POST',headers:{'content-type':'application/json',origin:'https://pyjamas25.netlify.app'},body:JSON.stringify(data)});
it('accepts a named modern key and a separate dedicated HMAC secret',()=>{
 expect(serverConfiguration(n=>environment[n],Date.parse('2026-11-20T00:00:00Z'))).toMatchObject({apiKey,hmacKey:hmac,enabled:true});
 expect(serverConfiguration(n=>({...environment,SUPABASE_SECRET_KEYS:JSON.stringify({worker:apiKey}),ORDER_REQUEST_API_KEY_NAME:'worker'})[n],Date.now()).apiKey).toBe(apiKey);
});
for(const override of [{SUPABASE_SECRET_KEYS:''},{SUPABASE_SECRET_KEYS:'invalid'},{SUPABASE_SECRET_KEYS:JSON.stringify({default:'eyJlegacy.jwt.key'})},{ORDER_REQUEST_HMAC_SECRET:''},{ORDER_REQUEST_HMAC_SECRET:apiKey},{ORDER_REQUEST_HMAC_READY_AT:''}])it('fails closed for absent, Legacy or incomplete configuration without leaking values',async()=>{
 const admin=vi.fn();const handler=createOrderRequestHandler({env:n=>({...environment,...override})[n],createAdmin:admin});
 const result=await handler(request());expect(result.status).toBe(500);expect(admin).not.toHaveBeenCalled();const text=await result.text();expect(text).not.toContain(apiKey);expect(text).not.toContain(hmac);
});
it('keeps sales closed by default and blocks the HMAC transition before activation',async()=>{
 for(const env of [{...environment,ORDER_REQUESTS_ENABLED:'false'},{...environment,ORDER_REQUEST_HMAC_READY_AT:'2099-01-01T00:06:00Z'}]){
 const admin=vi.fn();const handler=createOrderRequestHandler({env:n=>env[n],createAdmin:admin});expect((await handler(request())).status).toBe(503);expect(admin).not.toHaveBeenCalled();
 }
});
it('preserves request validation, forbidden origins and the honeypot without DB calls',async()=>{
 const admin=vi.fn();const handler=createOrderRequestHandler({env:n=>environment[n],createAdmin:admin});
 expect((await handler(request({...body,lines:[]}))).status).toBe(400);
 expect((await handler(new Request('https://fixture.invalid',{method:'POST',headers:{origin:'https://attacker.invalid'}}))).status).toBe(403);
 expect((await handler(request({...body,website:'bot'}))).status).toBe(200);expect(admin).not.toHaveBeenCalled();
});
it('keeps HMAC identities stable across Supabase API key rotations',async()=>{
 const before=await requestBudgetSubject(hmac,body.customer.phone);expect(before).toMatch(/^[a-f0-9]{64}$/);
 expect(await requestBudgetSubject(hmac,body.customer.phone)).toBe(before);
 expect(serverConfiguration(n=>({...environment,SUPABASE_SECRET_KEYS:JSON.stringify({default:'sb_secret_rotated_fixture'})})[n],Date.now()).hmacKey).toBe(hmac);
});
it('enforces the existing five-request quota through the handler in an isolated database',async()=>{
 const db=new PGlite();try{
 await db.exec('create role anon;create role authenticated;create role service_role;create schema storage;create table storage.buckets(id text,file_size_limit bigint);');
 await db.exec(readFileSync('supabase/migrations/20261023082445_order_request_rate_budget.sql','utf8'));
 const calls:string[]=[];
 const handler=createOrderRequestHandler({env:n=>environment[n],createAdmin:(url,key)=>{
 expect(url).toBe(environment.SUPABASE_URL);expect(key).toBe(apiKey);
 return{rpc:async(name,args)=>{calls.push(name);if(name==='consume_order_request_budget')return{data:(await db.query<{ok:boolean}>('select public.consume_order_request_budget($1) ok',[args.p_subject])).rows[0].ok,error:null};return{data:'ISOLATED-ORDER',error:null};}};
 }});
 for(let i=0;i<5;i++)expect((await handler(request())).status).toBe(201);
 expect((await handler(request())).status).toBe(429);expect(calls.filter(n=>n==='create_order_request_atomic')).toHaveLength(5);
 // Closed admission allows no mutation, including during the old/new HMAC transition.
 const before=(await db.query('select sum(attempts)::int n from order_request_limits')).rows;
 const closed=createOrderRequestHandler({env:n=>({...environment,ORDER_REQUESTS_ENABLED:'false'})[n],createAdmin:()=>{throw new Error('No database call allowed');}});
 expect((await closed(request())).status).toBe(503);expect((await db.query('select sum(attempts)::int n from order_request_limits')).rows).toEqual(before);
 }finally{await db.close();}
},30000);
