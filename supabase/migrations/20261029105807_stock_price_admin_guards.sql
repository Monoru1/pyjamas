create function public.admin_set_available_stock(p_id uuid,p_expected_stock integer,p_stock integer)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare current_stock integer;
begin
 if auth.uid() is null or not public.is_admin() or p_stock<0 then raise exception 'Staff access and valid stock required'; end if;
 select stock_quantity into current_stock from public.product_variants where id=p_id for update;
 if not found or current_stock<>p_expected_stock then raise exception 'Stock changed; refresh before retrying'; end if;
 update public.product_variants set stock_quantity=p_stock where id=p_id;
end $$;
create function public.admin_set_variant_price(p_id uuid,p_expected_price numeric,p_price numeric)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare current_price numeric;
begin
 if auth.uid() is null or not public.is_admin() or p_price<=0 or trunc(p_price)<>p_price then raise exception 'Staff access and integer price required'; end if;
 select price into current_price from public.product_variants where id=p_id for update;
 if not found or current_price<>p_expected_price then raise exception 'Price changed; refresh before retrying'; end if;
 update public.product_variants set price=p_price,compare_at_price=case when compare_at_price>p_price then compare_at_price else null end where id=p_id;
end $$;
revoke all on function public.admin_set_available_stock(uuid,integer,integer),public.admin_set_variant_price(uuid,numeric,numeric) from public,anon;
grant execute on function public.admin_set_available_stock(uuid,integer,integer),public.admin_set_variant_price(uuid,numeric,numeric) to authenticated;
