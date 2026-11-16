-- PRODUCTION POSTFLIGHT — read-only. Run after the V1 migration; compare lines 5 to 7 with the preflight.
select 1 as n, 'Historique : les 10 migrations V1 sont enregistrées sous les versions du dépôt' as controle,
  (select count(*) = 10 from supabase_migrations.schema_migrations where version in ('20261029093122', '20261029105353', '20261029105807',
    '20261029111200', '20261103163942', '20261113090005', '20261113093826', '20261113102412', '20261113150500', '20261113154852')) as ok,
  (select count(*) || ' versions ; dernière ' || max(version) from supabase_migrations.schema_migrations) as detail
union all select 2, 'RLS activée sur toutes les tables V1',
  (select count(*) = 6 and bool_and(relrowsecurity) from pg_class where relnamespace = 'public'::regnamespace and relname in
    ('inventory_movements', 'notification_jobs', 'live_test_authorizations', 'notification_demo_sends', 'notification_provider_events', 'staff_stock_movements')), ''
union all select 3, 'Aucun droit anon sur les tables et vues V1',
  (select count(*) = 0 from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public' and table_name in
    ('inventory_movements', 'notification_jobs', 'live_test_authorizations', 'notification_demo_sends', 'notification_provider_events',
     'staff_stock_movements', 'admin_order_list', 'admin_stock_levels', 'payment_attempts', 'payment_events')),
  (select coalesce(string_agg(distinct table_name, ', '), 'aucun') from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public' and table_name in
    ('inventory_movements', 'notification_jobs', 'live_test_authorizations', 'notification_demo_sends', 'notification_provider_events',
     'staff_stock_movements', 'admin_order_list', 'admin_stock_levels', 'payment_attempts', 'payment_events'))
union all select 4, 'anon et authenticated ne peuvent plus écrire directement dans orders / order_items',
  (select count(*) = 0 from information_schema.role_table_grants where grantee in ('anon', 'authenticated') and table_schema = 'public'
    and table_name in ('orders', 'order_items') and privilege_type in ('INSERT', 'UPDATE', 'DELETE')), ''
union all select 5, 'Relevé : produits / variantes / stock total', true,
  (select count(*) from public.products) || ' / ' || (select count(*) from public.product_variants) || ' / ' || (select coalesce(sum(stock_quantity), 0) from public.product_variants)
union all select 6, 'Empreinte catalogue (id, prix, stock des variantes)', true,
  (select md5(coalesce(string_agg(id || ':' || price || ':' || stock_quantity, ',' order by id), '')) from public.product_variants)
union all select 7, 'Empreinte commandes (id, référence, statut, total)', true,
  (select md5(coalesce(string_agg(id || ':' || order_number || ':' || status || ':' || total, ',' order by id), '')) from public.orders)
union all select 8, 'Commandes historiques : toutes « unpaid », aucune file de notification ni mouvement de stock créés',
  (select not exists (select 1 from public.orders where payment_state <> 'unpaid') and not exists (select 1 from public.notification_jobs) and not exists (select 1 from public.inventory_movements)), ''
union all select 9, 'Le catalogue public reste lisible (vue product_catalog)', (select count(*) > 0 from public.product_catalog), (select count(*)::text from public.product_catalog)
order by n;
