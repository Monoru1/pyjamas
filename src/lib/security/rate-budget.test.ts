import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
const db=new PGlite();
beforeAll(async()=>{
  await db.exec(`create role anon;create role authenticated;create role service_role; create schema storage;create table storage.buckets(id text,file_size_limit bigint);insert into storage.buckets values('site-assets',52428800),('product-images',52428800);`);
  await db.exec(readFileSync('supabase/migrations/20261023082445_order_request_rate_budget.sql','utf8'));
},30000);
afterAll(async()=>{await db.close();});
it('durably limits each contact to five attempts per 5 minute window',async()=>{
  for(let i=0;i<5;i++) expect((await db.query('select consume_order_request_budget($1) as ok',['a'.repeat(64)])).rows[0]).toEqual({ok:true});
  expect((await db.query('select consume_order_request_budget($1) as ok',['a'.repeat(64)])).rows[0]).toEqual({ok:false});
});
it('enforces a global budget even if contacts rotate',async()=>{
  await db.exec("update order_request_limits set attempts=120 where subject='global'");
  expect((await db.query('select consume_order_request_budget($1) as ok',['b'.repeat(64)])).rows[0]).toEqual({ok:false});
});
it('rejects direct anonymous or ordinary-user budget access and clears stale counters',async()=>{
  for(const role of ['anon','authenticated']){
    await db.exec('set role '+role);
    await expect(db.query('select * from order_request_limits')).rejects.toThrow('permission denied');
    await expect(db.query('select consume_order_request_budget($1)',['a'.repeat(64)])).rejects.toThrow('permission denied');
    await db.exec('reset role');
  }
  await db.exec("delete from order_request_limits;insert into order_request_limits values('old',now()-interval '2 hours',1)");
  await db.query('select consume_order_request_budget($1)',['c'.repeat(64)]);
  expect((await db.query("select count(*)::int as n from order_request_limits where subject='old'")).rows[0]).toEqual({n:0});
  expect((await db.query("select file_size_limit from storage.buckets where id='site-assets'")).rows[0]).toEqual({file_size_limit:5242880});
});
