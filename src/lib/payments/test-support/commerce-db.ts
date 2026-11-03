import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

/** Disposable database; never connects to Supabase or a provider. */
export async function commerceDatabase() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated,service_role;
    create schema extensions;
    create function extensions.unaccent(text) returns text language sql immutable as $$select $1$$;`);
  await db.exec(readFileSync('supabase/recette/bootstrap-production-schema.sql','utf8').replace(/^create extension[^;]+;$/gm,''));
  for (const name of ['20261029093122_fedapay_commerce','20261029105353_live_test_price_quotes','20261029105807_stock_price_admin_guards','20261029111200_payment_events_index']) {
    await db.exec(readFileSync(`supabase/migrations/${name}.sql`,'utf8'));
  }
  return db;
}

/** Small test-only PostgREST bridge: production RPCs and persistence run in SQL. */
export function sqlClient(db: PGlite) {
  const identifier = (name: string) => {
    if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error('Invalid fixture identifier');
    return `"${name}"`;
  };
  return {
    async rpc(name: string, args: Record<string, unknown> = {}) {
      try {
        const entries = Object.entries(args);
        const params = entries.map(([, value]) => value !== null && typeof value === 'object' ? JSON.stringify(value) : value);
        const result = await db.query<{value:unknown}>(`select ${identifier(name)}(${entries.map(([key], i) => `${identifier(key)} => $${i+1}`).join(',')}) as value`, params);
        return { data: result.rows[0]?.value, error: null };
      } catch (error) { return { data: null, error }; }
    },
    from(table: string) {
      const filters: [string, string, unknown][] = [];
      let update: Record<string, unknown> | undefined;
      let single = false;
      let relation = false;
      let count: number | undefined;
      let ordering: string | undefined;
      const builder = {
        select(fields = '*') { relation = fields.includes('orders('); return builder; },
        update(values: Record<string, unknown>) { update = values; return builder; },
        eq(key: string, value: unknown) { filters.push([key,'=',value]); return builder; },
        is(key: string, value: unknown) { filters.push([key,'is',value]); return builder; },
        lte(key: string, value: unknown) { filters.push([key,'<=',value]); return builder; },
        not(key: string, _op: string, value: unknown) { filters.push([key,'is not',value]); return builder; },
        order(key: string) { ordering = identifier(key); return builder; },
        limit(value: number) { count = value; return builder; },
        single() { single = true; return builder; },
        maybeSingle() { single = true; return builder; },
        async then(resolve: (value: unknown) => unknown) {
          try {
            const params: unknown[] = [];
            const bind = (value: unknown) => { params.push(value); return `$${params.length}`; };
            const assignments = update && Object.entries(update).map(([key,value]) => `${identifier(key)}=${bind(value)}`).join(',');
            const where = filters.map(([key,op,value]) => `${identifier(key)} ${op} ${value === null ? 'null' : bind(value)}`).join(' and ');
            let sql = update ? `update ${identifier(table)} set ${assignments}` : `select *, ${relation ? `(select jsonb_build_object('order_number',o.order_number,'needs_attention',o.needs_attention) from orders o where o.id=payment_attempts.order_id)` : 'null'} as orders from ${identifier(table)}`;
            if (where) sql += ` where ${where}`;
            if (update) sql += ' returning *';
            else { if (ordering) sql += ` order by ${ordering}`; if (count !== undefined) sql += ` limit ${Number(count)}`; }
            const result = await db.query(sql, params);
            return resolve({ data: single ? result.rows[0] ?? null : result.rows, error: null });
          } catch (error) { return resolve({ data: null, error }); }
        },
      };
      return builder;
    },
  };
}
