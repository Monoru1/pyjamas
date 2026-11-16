import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('replays all release migrations on the complete schema snapshot and passes the 20 nonfinancial assertions',async()=>{
  const db=new PGlite();
  try {
    // Only managed Auth and extension entry points are fixtures. Every public
    // table, FK, trigger, view, policy and grant comes from the inspected schema.
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon,authenticated,service_role;
      create schema extensions;
      create function extensions.unaccent(text) returns text language sql immutable as $$select $1$$;`);
    const snapshot=readFileSync('supabase/recette/bootstrap-production-schema.sql','utf8').replace(/^create extension[^;]+;$/gm,'');
    await db.exec(snapshot);
    for(const name of ['20261029093122_fedapay_commerce','20261029105353_live_test_price_quotes','20261029105807_stock_price_admin_guards','20261029111200_payment_events_index'])await db.exec(readFileSync(`supabase/migrations/${name}.sql`,'utf8'));
    await db.exec(`insert into currencies(code,name,symbol) values('XOF','Franc CFA','FCFA');
      insert into products(slug,name_fr,base_price,currency_code) values('migration-fixture','Fixture migration uniquement',100,'XOF');`);
    const checks=readFileSync('supabase/recette/nonfinancial-checks.sql','utf8');
    await db.exec(checks.slice(0,checks.lastIndexOf('select pg_temp.check_recette()')));
    const result=await db.query<{nonfinancial_result:{passed:boolean;count:number;provider_requests:number;all_fixture_mutations_rolled_back:boolean}}>('select pg_temp.check_recette() as nonfinancial_result');
    expect(result.rows[0].nonfinancial_result).toMatchObject({passed:true,count:20,provider_requests:0,all_fixture_mutations_rolled_back:true});
    expect((await db.query('select count(*)::int n from orders')).rows[0]).toEqual({n:0});
  }finally{await db.close();}
},60000);
