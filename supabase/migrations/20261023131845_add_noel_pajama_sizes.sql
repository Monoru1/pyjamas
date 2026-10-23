-- Add the provisional size runs needed to order every pajama in the Noël collection.
-- The gift box is intentionally excluded: it is not a sized garment.
with size_run(slug, size_label, sku_suffix, audience, color_fr, color_en, color_hex, stock) as (
  values
    ('noel-carreaux-rouges', 'S',   'S',   'mixte', 'Carreaux rouges', 'Red plaid',   '#8F1428', 10),
    ('noel-carreaux-rouges', 'M',   'M',   'mixte', 'Carreaux rouges', 'Red plaid',   '#8F1428', 10),
    ('noel-carreaux-rouges', 'L',   'L',   'mixte', 'Carreaux rouges', 'Red plaid',   '#8F1428', 10),
    ('noel-carreaux-rouges', 'XL',  'XL',  'mixte', 'Carreaux rouges', 'Red plaid',   '#8F1428', 10),
    ('noel-carreaux-rouges', 'XXL', 'XXL', 'mixte', 'Carreaux rouges', 'Red plaid',   '#8F1428', 10),
    ('noel-carreaux-rouges', '3XL', '3XL', 'mixte', 'Carreaux rouges', 'Red plaid',   '#8F1428', 10),
    ('noel-carreaux-bleus',  'S',   'S',   'mixte', 'Carreaux bleus',  'Blue plaid',  '#183B66', 10),
    ('noel-carreaux-bleus',  'M',   'M',   'mixte', 'Carreaux bleus',  'Blue plaid',  '#183B66', 10),
    ('noel-carreaux-bleus',  'L',   'L',   'mixte', 'Carreaux bleus',  'Blue plaid',  '#183B66', 10),
    ('noel-carreaux-bleus',  'XL',  'XL',  'mixte', 'Carreaux bleus',  'Blue plaid',  '#183B66', 10),
    ('noel-carreaux-bleus',  'XXL', 'XXL', 'mixte', 'Carreaux bleus',  'Blue plaid',  '#183B66', 10),
    ('noel-carreaux-bleus',  '3XL', '3XL', 'mixte', 'Carreaux bleus',  'Blue plaid',  '#183B66', 10),
    ('noel-imprime-festif',  'S',   'S',   'mixte', 'Imprimé festif',  'Festive print','#F4E9D5', 10),
    ('noel-imprime-festif',  'M',   'M',   'mixte', 'Imprimé festif',  'Festive print','#F4E9D5', 10),
    ('noel-imprime-festif',  'L',   'L',   'mixte', 'Imprimé festif',  'Festive print','#F4E9D5', 10),
    ('noel-imprime-festif',  'XL',  'XL',  'mixte', 'Imprimé festif',  'Festive print','#F4E9D5', 10),
    ('noel-imprime-festif',  'XXL', 'XXL', 'mixte', 'Imprimé festif',  'Festive print','#F4E9D5', 10),
    ('noel-imprime-festif',  '3XL', '3XL', 'mixte', 'Imprimé festif',  'Festive print','#F4E9D5', 10),
    ('noel-bleu-renne',      'S',   'S',   'femme', 'Bleu renne',      'Reindeer blue','#264B73', 10),
    ('noel-bleu-renne',      'M',   'M',   'femme', 'Bleu renne',      'Reindeer blue','#264B73', 10),
    ('noel-bleu-renne',      'L',   'L',   'femme', 'Bleu renne',      'Reindeer blue','#264B73', 10),
    ('noel-bleu-renne',      'XL',  'XL',  'femme', 'Bleu renne',      'Reindeer blue','#264B73', 10),
    ('noel-bleu-renne',      'XXL', 'XXL', 'femme', 'Bleu renne',      'Reindeer blue','#264B73', 10),
    ('noel-bleu-renne',      '3XL', '3XL', 'femme', 'Bleu renne',      'Reindeer blue','#264B73', 10),
    ('noel-bebe-carreaux-rouges', '3-6 mois',   '03-06M', 'bebe', 'Carreaux rouges', 'Red plaid', '#8F1428', 10),
    ('noel-bebe-carreaux-rouges', '6-9 mois',   '06-09M', 'bebe', 'Carreaux rouges', 'Red plaid', '#8F1428', 10),
    ('noel-bebe-carreaux-rouges', '9-12 mois',  '09-12M', 'bebe', 'Carreaux rouges', 'Red plaid', '#8F1428', 10),
    ('noel-bebe-carreaux-rouges', '12-18 mois', '12-18M', 'bebe', 'Carreaux rouges', 'Red plaid', '#8F1428', 10),
    ('noel-bebe-carreaux-rouges', '18-24 mois', '18-24M', 'bebe', 'Carreaux rouges', 'Red plaid', '#8F1428', 10)
), variants as (
  select
    p.id as product_id,
    'LMP-' || upper(replace(p.slug, 'noel-', 'N-')) || '-' || s.sku_suffix as sku,
    s.color_fr,
    s.color_en,
    s.color_hex,
    s.size_label,
    s.audience,
    p.base_price as price,
    s.stock
  from size_run s
  join public.products p on p.slug = s.slug
  join public.product_collections pc on pc.product_id = p.id
  join public.collections c on c.id = pc.collection_id and c.slug = 'noel'
  where p.is_active = true and p.deleted_at is null
)
insert into public.product_variants (
  product_id, sku, color_name_fr, color_name_en, color_hex, size_label,
  audience, price, compare_at_price, stock_quantity, low_stock_threshold, is_active
)
select
  product_id, sku, color_fr, color_en, color_hex, size_label,
  audience, price, null, stock, 2, true
from variants
on conflict (product_id, color_name_fr, size_label) do update set
  sku = excluded.sku,
  color_name_en = excluded.color_name_en,
  color_hex = excluded.color_hex,
  audience = excluded.audience,
  price = excluded.price,
  stock_quantity = excluded.stock_quantity,
  low_stock_threshold = excluded.low_stock_threshold,
  is_active = true,
  updated_at = now();
