WITH cat AS (
  SELECT id, slug FROM public.categories
), products_seed AS (
  SELECT * FROM (VALUES
    ('noel-famille-velours-bordeaux','Noel Famille Velours Bordeaux','Ensemble familial bordeaux profond, pense pour les photos de Noel, les matins doux et les cadeaux qui restent.',42000,52000,'famille',true,true,1,'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=1200&q=85'),
    ('cocooning-femme-creme-or','Cocooning Femme Creme Or','Pyjama femme creme avec notes dorees, doux, lumineux et elegant pour les soirees de fete.',28000,34000,'femme',true,true,2,'https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=1200&q=85'),
    ('homme-sapin-premium','Homme Sapin Premium','Pyjama homme vert sapin, sobre et premium, parfait pour offrir sans hesitation.',30000,36000,'homme',true,false,3,'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=1200&q=85'),
    ('couple-minuit-bordeaux','Couple Minuit Bordeaux','Duo couple bordeaux nuit, doux et chic pour un Noel coordonne sans tomber dans le kitsch.',56000,68000,'couple',true,true,4,'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?auto=format&fit=crop&w=1200&q=85'),
    ('enfant-etoile-creme','Enfant Etoile Creme','Modele enfant lumineux, doux et facile a porter pour les matins de fete.',22000,26000,'enfant',true,false,5,'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=1200&q=85'),
    ('edition-cadeau-rouge-or','Edition Cadeau Rouge Or','Piece signature rouge et or, concue pour donner un effet cadeau des le premier regard.',35000,42000,'noel',true,true,6,'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?auto=format&fit=crop&w=1200&q=85')
  ) AS v(slug,name_fr,description_fr,base_price,compare_at_price,category_slug,is_featured,is_new,sort_order,image_url)
), upserted AS (
  INSERT INTO public.products (slug,name_fr,description_fr,base_price,compare_at_price,currency_code,category_id,is_featured,is_new,sort_order,is_active,seo_title_fr,seo_description_fr)
  SELECT ps.slug, ps.name_fr, ps.description_fr, ps.base_price, ps.compare_at_price, 'XOF', c.id, ps.is_featured, ps.is_new, ps.sort_order, true, ps.name_fr, ps.description_fr
  FROM products_seed ps
  LEFT JOIN cat c ON c.slug = ps.category_slug
  ON CONFLICT (slug) DO UPDATE SET
    name_fr = EXCLUDED.name_fr,
    description_fr = EXCLUDED.description_fr,
    base_price = EXCLUDED.base_price,
    compare_at_price = EXCLUDED.compare_at_price,
    category_id = EXCLUDED.category_id,
    is_featured = EXCLUDED.is_featured,
    is_new = EXCLUDED.is_new,
    sort_order = EXCLUDED.sort_order,
    updated_at = now()
  RETURNING id, slug, name_fr, base_price
), images_insert AS (
  INSERT INTO public.product_images (product_id,url,alt_fr,is_primary,sort_order)
  SELECT u.id, ps.image_url, ps.name_fr, true, 1
  FROM upserted u
  JOIN products_seed ps ON ps.slug = u.slug
  ON CONFLICT DO NOTHING
  RETURNING id
)
INSERT INTO public.product_variants (product_id,sku,color_name_fr,color_name_en,color_hex,size_label,audience,price,compare_at_price,stock_quantity,low_stock_threshold,is_active)
SELECT u.id, upper(replace(u.slug,'-','_')) || '_' || s.size_label, s.color_fr, s.color_en, s.color_hex, s.size_label, s.audience, u.base_price, null, s.stock, 4, true
FROM upserted u
CROSS JOIN (VALUES
  ('S','Bordeaux','Burgundy','#8F1428','femme',8),
  ('M','Vert sapin','Evergreen','#0F3B2E','mixte',12),
  ('L','Creme chaud','Warm cream','#FFF6EC','mixte',10)
) AS s(size_label,color_fr,color_en,color_hex,audience,stock)
ON CONFLICT (sku) DO UPDATE SET
  price = EXCLUDED.price,
  stock_quantity = EXCLUDED.stock_quantity,
  is_active = true,
  updated_at = now();
