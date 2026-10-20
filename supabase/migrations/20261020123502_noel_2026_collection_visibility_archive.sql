-- Reversible Noël 2026 collection focus.
-- No collection, product, variant, media asset, order, or relation is deleted.
-- Promotions remains active as an internal pricing workflow; storefront pages only show Noël.
insert into public.settings (key, value, description)
select 'pre_noel_2026_collection_visibility',
       coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'is_active', is_active) order by slug), '[]'::jsonb),
       'Visibility snapshot before Noël 2026 season (administrative archive)'
from public.collections
on conflict (key) do nothing;

update public.collections
set is_active = (slug in ('noel', 'promotions'))
where is_active is distinct from (slug in ('noel', 'promotions'));

-- Associate only products with explicitly seasonal names, keeping every old link intact.
insert into public.product_collections (product_id, collection_id)
select p.id, c.id
from public.products p
cross join public.collections c
where c.slug = 'noel'
  and p.deleted_at is null
  and p.slug in (
    'edition-cadeau-rouge-or',
    'enfant-etoile-creme',
    'homme-sapin-premium',
    'noel-famille-velours-bordeaux'
  )
on conflict (product_id, collection_id) do nothing;

-- To roll back visibility, restore per-slug values from
-- settings.value where key='pre_noel_2026_collection_visibility'.
