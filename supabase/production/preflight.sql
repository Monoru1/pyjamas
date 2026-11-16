-- PRODUCTION PREFLIGHT — read-only. Run on pukvrerdloudfiphomsj BEFORE the V1 migration.
-- One result set: every line marked BLOQUANT must read ok = true. Nothing is written.
with history as (select version, name from supabase_migrations.schema_migrations),
required(name) as (values ('sandbox_payment_acceptance'), ('staff_security_and_interest_limits'),
  ('atomic_order_requests_and_staff_transitions'), ('order_request_rate_budget'), ('add_noel_pajama_sizes')),
pending(name) as (values ('fedapay_commerce'), ('live_test_price_quotes'), ('stock_price_admin_guards'),
  ('payment_events_index'), ('operational_notifications'), ('order_whatsapp_lifecycle'),
  ('staff_notification_channels'), ('email_only_notifications'), ('order_reconciliation'), ('physical_stock_receipts')),
must_exist(rel) as (values ('public.orders'), ('public.order_items'), ('public.order_status_history'), ('public.customers'),
  ('public.products'), ('public.product_variants'), ('public.product_images'), ('public.payment_attempts'),
  ('public.payment_events'), ('public.activity_logs'), ('public.profiles'), ('public.product_catalog')),
must_not_exist(rel) as (values ('public.inventory_movements'), ('public.notification_jobs'), ('public.live_test_authorizations'),
  ('public.notification_demo_sends'), ('public.notification_provider_events'), ('public.staff_stock_movements'),
  ('public.admin_order_list'), ('public.admin_stock_levels')),
new_columns(tbl, col) as (values ('orders', 'payment_state'), ('orders', 'delivery'), ('orders', 'needs_attention'),
  ('payment_attempts', 'order_id'), ('payment_attempts', 'inventory_state'), ('payment_attempts', 'merchant_account_id'),
  ('payment_attempts', 'next_reconcile_at'), ('payment_attempts', 'last_error'), ('order_items', 'image_url'))
select 1 as n, 'BLOQUANT' as niveau, 'Historique : les 5 migrations préalables sont appliquées' as controle,
  (select count(*) = 5 from required r where exists (select 1 from history h where h.name = r.name)) as ok,
  (select coalesce(string_agg(r.name, ', '), 'aucune manquante') from required r where not exists (select 1 from history h where h.name = r.name)) as detail
union all select 2, 'BLOQUANT', 'Historique : aucune des 10 migrations V1 n''est déjà appliquée',
  (select count(*) = 0 from pending p where exists (select 1 from history h where h.name = p.name)),
  (select coalesce(string_agg(p.name, ', '), 'aucune') from pending p where exists (select 1 from history h where h.name = p.name))
union all select 3, 'INFO', 'Historique : dernière version et nombre de versions (attendu : 56, add_noel_pajama_sizes)', true,
  (select count(*) || ' versions ; dernière ' || max(version) from history)
union all select 4, 'BLOQUANT', 'Structure : objets requis présents',
  (select count(*) = 0 from must_exist where to_regclass(rel) is null),
  (select coalesce(string_agg(rel, ', '), 'tous présents') from must_exist where to_regclass(rel) is null)
union all select 5, 'BLOQUANT', 'Structure : objets V1 encore absents (pas d''application partielle)',
  (select count(*) = 0 from must_not_exist where to_regclass(rel) is not null),
  (select coalesce(string_agg(rel, ', '), 'aucun présent') from must_not_exist where to_regclass(rel) is not null)
union all select 6, 'BLOQUANT', 'Structure : colonnes V1 encore absentes',
  (select count(*) = 0 from new_columns n join information_schema.columns c on c.table_schema = 'public' and c.table_name = n.tbl and c.column_name = n.col),
  (select coalesce(string_agg(n.tbl || '.' || n.col, ', '), 'aucune présente') from new_columns n join information_schema.columns c on c.table_schema = 'public' and c.table_name = n.tbl and c.column_name = n.col)
union all select 7, 'BLOQUANT', 'Structure : contraintes historiques de payment_attempts à remplacer',
  (select count(*) = 2 from pg_constraint where conrelid = to_regclass('public.payment_attempts') and conname in ('payment_attempts_environment_check', 'payment_attempts_provider_id_key')),
  (select coalesce(string_agg(conname, ', '), 'aucune trouvée') from pg_constraint where conrelid = to_regclass('public.payment_attempts') and conname in ('payment_attempts_environment_check', 'payment_attempts_provider_id_key'))
union all select 8, 'BLOQUANT', 'Structure : fonctions is_admin() et generate_order_number() présentes',
  (select count(distinct proname) = 2 from pg_proc where pronamespace = 'public'::regnamespace and proname in ('is_admin', 'generate_order_number')), ''
union all select 9, 'BLOQUANT', 'Données : payment_attempts compatibles (environnement sandbox/live, pas de doublon fournisseur)',
  (select not exists (select 1 from public.payment_attempts where environment not in ('sandbox', 'live'))
     and not exists (select 1 from public.payment_attempts where provider_id is not null group by environment, provider_id having count(*) > 1)),
  (select count(*) || ' tentative(s) de paiement existante(s)' from public.payment_attempts)
union all select 10, 'BLOQUANT', 'Données : aucun prix produit ne sera réécrit (base_price = prix minimal des variantes actives)',
  (select count(*) = 0 from public.products p join (select product_id, min(price) price from public.product_variants where is_active group by product_id) x on x.product_id = p.id where p.base_price is distinct from x.price),
  (select coalesce(string_agg(p.slug || ' : ' || p.base_price || ' → ' || x.price, ' ; '), 'aucun écart') from public.products p join (select product_id, min(price) price from public.product_variants where is_active group by product_id) x on x.product_id = p.id where p.base_price is distinct from x.price)
union all select 11, 'BLOQUANT', 'Données : aucun stock négatif', (select count(*) = 0 from public.product_variants where stock_quantity < 0), ''
union all select 12, 'INFO', 'Relevé : produits / variantes / stock total', true,
  (select count(*) from public.products) || ' / ' || (select count(*) from public.product_variants) || ' / ' || (select coalesce(sum(stock_quantity), 0) from public.product_variants)
union all select 13, 'INFO', 'Relevé : commandes / lignes / clients / total des commandes', true,
  (select count(*) from public.orders) || ' / ' || (select count(*) from public.order_items) || ' / ' || (select count(*) from public.customers) || ' / ' || (select coalesce(sum(total), 0) from public.orders)
union all select 14, 'INFO', 'Relevé : lignes de commande qui recevront la photo actuelle du produit', true,
  (select count(*)::text from public.order_items i where i.product_id is not null and exists (select 1 from public.product_images p where p.product_id = i.product_id))
union all select 15, 'INFO', 'Relevé : comptes staff actifs par rôle', true,
  (select coalesce(string_agg(role || ' ' || n, ', '), 'aucun') from (select role::text, count(*) n from public.profiles where is_active group by role) r)
union all select 16, 'INFO', 'Empreinte catalogue (id, prix, stock des variantes)', true,
  (select md5(coalesce(string_agg(id || ':' || price || ':' || stock_quantity, ',' order by id), '')) from public.product_variants)
union all select 17, 'INFO', 'Empreinte commandes (id, référence, statut, total)', true,
  (select md5(coalesce(string_agg(id || ':' || order_number || ':' || status || ':' || total, ',' order by id), '')) from public.orders)
order by n;
