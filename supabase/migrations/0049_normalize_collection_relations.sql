-- Canonical Noël collection and a clean promotion baseline.
-- Collections are explicit product_collections relations; category_id remains a tag only.
with canonical as (select id from public.collections where slug = 'noel'),
legacy as (select id from public.collections where slug = 'noel-fetes')
insert into public.product_collections (product_id, collection_id)
select pc.product_id, canonical.id
from public.product_collections pc cross join canonical cross join legacy
where pc.collection_id = legacy.id
on conflict do nothing;

with legacy as (select name_fr, description_fr, image_url from public.collections where slug = 'noel-fetes')
update public.collections c
set name_fr = legacy.name_fr, description_fr = legacy.description_fr, image_url = legacy.image_url
from legacy
where c.slug = 'noel';

delete from public.product_collections pc using public.collections c
where pc.collection_id = c.id and c.slug = 'noel-fetes';
update public.collections set is_active = false where slug = 'noel-fetes';

-- A crossed-out price appears only after it is explicitly added from /admin/promotions.
update public.product_variants set compare_at_price = null where compare_at_price is not null;
update public.products set compare_at_price = null where compare_at_price is not null;
delete from public.product_collections pc using public.collections c
where pc.collection_id = c.id and c.slug = 'promotions';
