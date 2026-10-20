create or replace view public.product_catalog
with (security_invoker = on) as
  select
    p.id,
    p.category_id,
    p.slug,
    p.name_fr,
    p.name_en,
    p.description_fr,
    p.description_en,
    p.base_price,
    p.compare_at_price,
    p.currency_code,
    p.is_active,
    p.is_featured,
    p.is_new,
    p.sort_order,
    p.seo_title_fr,
    p.seo_title_en,
    p.seo_description_fr,
    p.seo_description_en,
    p.created_at,
    p.updated_at,
    p.deleted_at,
    c.slug as category_slug,
    c.name_fr as category_name_fr,
    c.name_en as category_name_en,
    coalesce(sum(v.stock_quantity), 0::bigint)::integer as total_stock,
    min(v.price) as min_variant_price,
    max(v.price) as max_variant_price,
    pi.url as primary_image_url,
    coalesce(
      (
        select array_agg(col.slug order by col.slug)
        from public.product_collections pc
        join public.collections col on col.id = pc.collection_id
        where pc.product_id = p.id
      ),
      array[]::text[]
    ) as collection_slugs
  from public.products p
  left join public.categories c on c.id = p.category_id
  left join public.product_variants v on v.product_id = p.id and v.is_active = true
  left join public.product_images pi on pi.product_id = p.id and pi.is_primary = true
  where p.deleted_at is null
  group by p.id, c.slug, c.name_fr, c.name_en, pi.url;
