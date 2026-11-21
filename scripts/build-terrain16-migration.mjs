// Run from the repository root. Prints the versioned transaction and never opens a connection.
import { readFileSync } from 'node:fs';

const names = [
  '20261121170000_checkout_client_limits',
  '20261121180000_unpaid_reservation_30_minutes',
  '20261121180100_two_admin_accounts_mfa',
  '20261121180200_retire_unpaid_order_requests',
  '20261121180300_storage_no_public_listing',
  '20261121180400_admin_session_30_days',
];

const preflight = readFileSync('supabase/production/terrain16-preflight.sql', 'utf8');
const identities = preflight.match(/^-- 2\. [^\n]+\n(select[\s\S]+?);/m)?.[1];
if (!identities) throw new Error('Missing administrator preflight query');
const postflight = readFileSync('supabase/production/terrain16-postflight.sql', 'utf8').trim().replace(/;$/, '');
const versions = names.map(name => "'" + name.slice(0, 14) + "'").join(', ');
const tag = '$terrain16_migration_body$';
const mutations = names.map(name => {
  const sql = readFileSync(`supabase/migrations/${name}.sql`, 'utf8');
  if (sql.includes(tag) || /\b(begin|commit|rollback)\s*;/i.test(sql.replace(/\$\$[\s\S]*?\$\$/g, ''))) {
    throw new Error(`Unsafe migration in transaction: ${name}`);
  }
  return `${sql.trimEnd()}
insert into supabase_migrations.schema_migrations(version, name, statements)
values ('${name.slice(0, 14)}', '${name.slice(15)}', array[${tag}${sql}${tag}]);`;
});

process.stdout.write(`-- Terrain 16 — versioned release transaction. Generated from the repository.
begin isolation level repeatable read;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
do $terrain16_preflight$
begin
  if not pg_try_advisory_xact_lock(hashtextextended('terrain16-production-migration', 0)) then
    raise exception 'Terrain 16: migration already running';
  end if;
  if (select max(version) from supabase_migrations.schema_migrations) is distinct from '20261119091918'
    or exists (select 1 from supabase_migrations.schema_migrations where version in (${versions})) then
    raise exception 'Terrain 16: unexpected migration history';
  end if;
  if not exists (select 1 from (${identities}) a where a.technical_owner_ready and a.manager_identity_reserved) then
    raise exception 'Terrain 16: confirmed technical owner or reserved manager identity missing';
  end if;
end;
$terrain16_preflight$;

${mutations.join('\n\n')}

do $terrain16_postflight$
begin
  if exists (select 1 from (${postflight}) p
    cross join lateral jsonb_each(to_jsonb(p)) check_result
    where check_result.value is distinct from 'true'::jsonb)
    or (select count(*) from supabase_migrations.schema_migrations where version in (${versions})) <> 6 then
    raise exception 'Terrain 16: postflight failed';
  end if;
end;
$terrain16_postflight$;
notify pgrst, 'reload schema';
commit;
`);
