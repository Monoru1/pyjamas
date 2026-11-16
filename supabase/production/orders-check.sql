-- PRODUCTION — read-only. Explains how many orders really exist before any migration.
-- The repository documentation noted 9 orders on 13 November; a connector reading returned 1.
-- Result set 1: exact row count of every public table (no estimate).
select table_name,
  (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text::bigint as lignes
from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name;
-- Result set 2: orders by origin, status and month, without any customer data.
select coalesce(source, '(vide)') as source, status::text, to_char(date_trunc('month', created_at), 'YYYY-MM') as mois,
  count(*) as commandes, sum(total) as total_cumule, min(created_at) as premiere, max(created_at) as derniere
from public.orders group by 1, 2, 3 order by 3, 1, 2;
-- Result set 3: traces of orders that would no longer exist (history or lines pointing to nothing), and deletions journaled.
select (select count(distinct order_id) from public.order_status_history) as commandes_dans_historique,
  (select count(distinct order_id) from public.order_items) as commandes_avec_lignes,
  (select count(*) from public.order_status_history h where not exists (select 1 from public.orders o where o.id = h.order_id)) as historique_orphelin,
  (select count(*) from public.order_items i where not exists (select 1 from public.orders o where o.id = i.order_id)) as lignes_orphelines,
  (select count(*) from public.activity_logs where entity_type ilike '%order%' and action ilike '%delet%') as suppressions_journalisees,
  (select count(*) from public.payment_attempts) as tentatives_paiement;
