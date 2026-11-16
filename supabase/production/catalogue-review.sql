-- PRODUCTION — read-only. What is actually sold: one row per size, to confirm with the shop
-- whether each sale unit is a LOT before any provisional price is applied.
select p.slug, p.name_fr as produit, left(coalesce(p.description_fr, ''), 90) as description, p.is_active as en_ligne,
  p.deleted_at is not null as archive, v.sku, v.color_name_fr as variante, v.size_label as taille, v.is_active as taille_active,
  v.price as prix_actuel, v.compare_at_price as prix_barre, v.stock_quantity as stock_actuel,
  (v.is_active and p.is_active and p.deleted_at is null) as commercialisee
from public.products p left join public.product_variants v on v.product_id = p.id
order by p.name_fr, v.size_label;
