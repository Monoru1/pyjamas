insert into public.categories (slug, name_fr, name_en, description_fr, description_en, sort_order, is_active)
values
  ('pyjamas', 'Pyjamas', 'Pajamas', 'Pièces douces pour la nuit, la maison et les matins en famille.', 'Soft pieces for nights, home and family mornings.', 10, true),
  ('accessoires', 'Accessoires', 'Accessories', 'Détails cocooning, coffrets et pièces cadeaux autour du pyjama.', 'Cocooning details, gift boxes and accessories around pajamas.', 20, true),
  ('chaussons', 'Chaussons', 'Slippers', 'Chaussons doux pour compléter le rituel maison.', 'Soft slippers to complete the home ritual.', 21, true),
  ('plaids', 'Plaids', 'Throws', 'Plaids chauds pour les soirées lentes.', 'Warm throws for slow evenings.', 22, true),
  ('coffrets-cadeaux', 'Coffrets cadeaux', 'Gift boxes', 'Coffrets et pochettes pour offrir avec soin.', 'Gift boxes and pouches for a thoughtful present.', 23, true),
  ('femme', 'Femme', 'Women', 'Sélections élégantes pour elle.', 'Elegant selections for her.', 30, true),
  ('homme', 'Homme', 'Men', 'Sélections confortables pour lui.', 'Comfortable selections for him.', 31, true),
  ('enfant', 'Enfant', 'Kids', 'Pièces douces pour les plus petits.', 'Soft pieces for kids.', 32, true),
  ('famille', 'Famille', 'Family', 'Looks coordonnés pour toute la famille.', 'Coordinated looks for the whole family.', 33, true)
on conflict (slug) do update set
  name_fr = excluded.name_fr,
  name_en = excluded.name_en,
  description_fr = excluded.description_fr,
  description_en = excluded.description_en,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.collections (slug, name_fr, name_en, description_fr, description_en, image_url, sort_order, is_featured, is_active)
values
  ('noel-fetes', 'Noël & fêtes', 'Christmas & holidays', 'Pyjamas, cadeaux et souvenirs pour les moments de fête.', 'Pajamas, gifts and memories for festive moments.', 'https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=1200&q=85', 10, true, true),
  ('famille-assortie', 'Famille assortie', 'Matching family', 'Des ensembles coordonnés pour les photos et les matins doux.', 'Coordinated sets for photos and soft mornings.', 'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=1200&q=85', 20, true, true),
  ('femme', 'Femme', 'Women', 'Coupes douces, élégantes et faciles à porter.', 'Soft, elegant and easy-to-wear cuts.', 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=1200&q=85', 30, true, true),
  ('homme', 'Homme', 'Men', 'Confort sobre, couleurs profondes et finition soignée.', 'Quiet comfort, deep colors and refined finish.', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=85', 40, true, true),
  ('enfant', 'Enfant', 'Kids', 'Douceur, fantaisie et confort pour les plus petits.', 'Softness, fantasy and comfort for kids.', 'https://images.unsplash.com/photo-1489702932289-406b7782113c?auto=format&fit=crop&w=1200&q=85', 50, true, true),
  ('cocooning-maison', 'Cocooning maison', 'Home cocooning', 'Plaids, chaussons et détails pour rester bien chez soi.', 'Throws, slippers and details for staying well at home.', 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=85', 60, true, true),
  ('cadeaux-premium', 'Cadeaux premium', 'Premium gifts', 'Sélections prêtes à offrir avec une touche raffinée.', 'Selections ready to gift with a refined touch.', 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1200&q=85', 70, true, true),
  ('nouveautes', 'Nouveautés', 'New arrivals', 'Les dernières pièces ajoutées à la maison.', 'The latest pieces added to the house.', 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1200&q=85', 80, true, true),
  ('accessoires', 'Accessoires', 'Accessories', 'Les détails qui transforment un pyjama en cadeau.', 'Details that turn pajamas into gifts.', 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=1200&q=85', 90, true, true)
on conflict (slug) do update set
  name_fr = excluded.name_fr,
  name_en = excluded.name_en,
  description_fr = excluded.description_fr,
  description_en = excluded.description_en,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order,
  is_featured = excluded.is_featured,
  is_active = excluded.is_active,
  updated_at = now();

with accessory_category as (
  select id from public.categories where slug = 'accessoires'
), upserted_products as (
  insert into public.products (category_id, slug, name_fr, name_en, description_fr, description_en, base_price, compare_at_price, currency_code, is_active, is_featured, is_new, sort_order, seo_title_fr, seo_description_fr)
  select accessory_category.id, data.slug, data.name_fr, data.name_en, data.description_fr, data.description_en, data.base_price, data.compare_at_price, 'XOF', true, data.is_featured, true, data.sort_order, data.name_fr || ' | La Maison des Pyjamas', data.description_fr
  from accessory_category
  cross join (values
    ('chaussons-douceur-creme', 'Chaussons douceur crème', 'Cream soft slippers', 'Des chaussons moelleux pour compléter un pyjama avec élégance.', 'Soft slippers to complete pajamas with elegance.', 6500::numeric, 8500::numeric, true, 210),
    ('masque-sommeil-satin-nuit', 'Masque de sommeil satin nuit', 'Night satin sleep mask', 'Un masque doux et satiné pour offrir une vraie pause.', 'A soft satin mask for a real pause.', 3500::numeric, 4500::numeric, true, 220),
    ('plaid-cocooning-vert-sapin', 'Plaid cocooning vert sapin', 'Evergreen cocooning throw', 'Un plaid chaud pour les soirées maison et les matins lents.', 'A warm throw for home evenings and slow mornings.', 14500::numeric, 17500::numeric, true, 230),
    ('coffret-cadeau-premium', 'Coffret cadeau premium', 'Premium gift box', 'Un coffret prêt à offrir pour transformer la commande en cadeau.', 'A ready-to-gift box to turn the order into a present.', 5000::numeric, 6500::numeric, true, 240),
    ('pochette-cadeau-bordeaux', 'Pochette cadeau bordeaux', 'Burgundy gift pouch', 'Une pochette élégante pour une présentation soignée.', 'An elegant pouch for a refined presentation.', 2500::numeric, 3500::numeric, false, 250),
    ('bonnet-nuit-doux', 'Bonnet de nuit doux', 'Soft night bonnet', 'Un accessoire doux pour protéger les cheveux pendant la nuit.', 'A soft accessory to protect hair during the night.', 4500::numeric, 5500::numeric, false, 260)
  ) as data(slug, name_fr, name_en, description_fr, description_en, base_price, compare_at_price, is_featured, sort_order)
  on conflict (slug) do update set
    category_id = excluded.category_id,
    name_fr = excluded.name_fr,
    name_en = excluded.name_en,
    description_fr = excluded.description_fr,
    description_en = excluded.description_en,
    base_price = excluded.base_price,
    compare_at_price = excluded.compare_at_price,
    is_active = excluded.is_active,
    is_featured = excluded.is_featured,
    is_new = excluded.is_new,
    sort_order = excluded.sort_order,
    seo_title_fr = excluded.seo_title_fr,
    seo_description_fr = excluded.seo_description_fr,
    updated_at = now()
  returning id, slug, base_price, compare_at_price
), image_data as (
  select * from (values
    ('chaussons-douceur-creme', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=85', 'Chaussons douceur crème'),
    ('masque-sommeil-satin-nuit', 'https://images.unsplash.com/photo-1556228724-4b8b275c61b3?auto=format&fit=crop&w=900&q=85', 'Masque de sommeil satin nuit'),
    ('plaid-cocooning-vert-sapin', 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=900&q=85', 'Plaid cocooning vert sapin'),
    ('coffret-cadeau-premium', 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=900&q=85', 'Coffret cadeau premium'),
    ('pochette-cadeau-bordeaux', 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=900&q=85', 'Pochette cadeau bordeaux'),
    ('bonnet-nuit-doux', 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=85', 'Bonnet de nuit doux')
  ) as data(slug, url, alt_fr)
)
insert into public.product_images (product_id, url, alt_fr, is_primary, sort_order)
select upserted_products.id, image_data.url, image_data.alt_fr, true, 1
from upserted_products
join image_data on image_data.slug = upserted_products.slug
where not exists (
  select 1 from public.product_images existing
  where existing.product_id = upserted_products.id and existing.is_primary = true
);

with products_for_variants as (
  select id, slug, base_price, compare_at_price from public.products where slug in (
    'chaussons-douceur-creme', 'masque-sommeil-satin-nuit', 'plaid-cocooning-vert-sapin', 'coffret-cadeau-premium', 'pochette-cadeau-bordeaux', 'bonnet-nuit-doux'
  )
)
insert into public.product_variants (product_id, sku, color_name_fr, color_name_en, color_hex, size_label, audience, price, compare_at_price, stock_quantity, low_stock_threshold, is_active)
select id,
  upper(replace(slug, '-', '-')) || '-STD',
  'Signature',
  'Signature',
  '#8F1428',
  'Unique',
  'accessory',
  base_price,
  compare_at_price,
  18,
  4,
  true
from products_for_variants
on conflict (product_id, color_name_fr, size_label) do update set
  sku = excluded.sku,
  price = excluded.price,
  compare_at_price = excluded.compare_at_price,
  stock_quantity = excluded.stock_quantity,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.product_collections (product_id, collection_id)
select p.id, c.id
from public.products p
join public.collections c on c.slug in ('accessoires', 'cocooning-maison', 'cadeaux-premium', 'nouveautes')
where p.slug in ('chaussons-douceur-creme', 'masque-sommeil-satin-nuit', 'plaid-cocooning-vert-sapin', 'coffret-cadeau-premium', 'pochette-cadeau-bordeaux', 'bonnet-nuit-doux')
on conflict do nothing;

insert into public.product_collections (product_id, collection_id)
select p.id, c.id
from public.products p
join public.collections c on c.slug = 'noel-fetes'
where p.slug in ('noel-famille-velours-bordeaux','cocooning-femme-creme-or','homme-sapin-premium','couple-minuit-bordeaux','enfant-etoile-creme','edition-cadeau-rouge-or')
on conflict do nothing;
