-- Schema-only snapshot of production, read-only extraction 2026-10-29.

-- RECETTE ONLY. No users, customers, orders or private histories are copied.

do $$ begin if exists(select 1 from pg_class where relnamespace='public'::regnamespace and relkind='r') then raise exception 'Bootstrap requires an EMPTY public schema; never run on production'; end if; end $$;

set search_path=public,extensions;

set check_function_bodies=off;

create extension if not exists "uuid-ossp" with schema "extensions";

create extension if not exists "pgcrypto" with schema "extensions";

create extension if not exists "unaccent" with schema "extensions";

create type public."admin_role" as enum ('super_admin','admin','employee');

create type public."analytics_event_type" as enum ('product_view','add_to_cart','checkout_whatsapp','collection_view');

create type public."discount_type" as enum ('percentage','fixed');

create type public."order_status" as enum ('pending','confirmed','preparing','ready','delivered','cancelled');

create table public."activity_logs" (
 "id" uuid default gen_random_uuid() not null,
 "actor_id" uuid,
 "action" text not null,
 "entity_type" text not null,
 "entity_id" uuid,
 "before_data" jsonb,
 "after_data" jsonb,
 "created_at" timestamp with time zone default now() not null
);

create table public."analytics_events" (
 "id" uuid default gen_random_uuid() not null,
 "event_type" analytics_event_type not null,
 "product_id" uuid,
 "variant_id" uuid,
 "collection_id" uuid,
 "session_id" text,
 "metadata" jsonb default '{}'::jsonb not null,
 "created_at" timestamp with time zone default now() not null
);

create table public."banners" (
 "id" uuid default gen_random_uuid() not null,
 "title_fr" text not null,
 "title_en" text,
 "subtitle_fr" text,
 "subtitle_en" text,
 "image_url" text,
 "cta_label_fr" text,
 "cta_label_en" text,
 "cta_url" text,
 "placement" text default 'home_hero'::text not null,
 "sort_order" integer default 0 not null,
 "starts_at" timestamp with time zone,
 "ends_at" timestamp with time zone,
 "is_active" boolean default true not null,
 "created_at" timestamp with time zone default now() not null,
 "updated_at" timestamp with time zone default now() not null
);

create table public."categories" (
 "id" uuid default gen_random_uuid() not null,
 "parent_id" uuid,
 "slug" text not null,
 "name_fr" text not null,
 "name_en" text,
 "description_fr" text,
 "description_en" text,
 "image_url" text,
 "sort_order" integer default 0 not null,
 "is_active" boolean default true not null,
 "created_at" timestamp with time zone default now() not null,
 "updated_at" timestamp with time zone default now() not null
);

create table public."christmas_event_config" (
 "event_key" text default 'noel-2026'::text not null,
 "display_title" text default 'La fête de Noël'::text not null,
 "event_day" date,
 "event_time" time without time zone,
 "venue_name" text,
 "venue_address" text,
 "ticket_price_xof" integer,
 "capacity" integer,
 "information_note" text,
 "requests_open" boolean default true not null,
 "updated_at" timestamp with time zone default now() not null
);

create table public."christmas_event_requests" (
 "id" uuid default gen_random_uuid() not null,
 "event_key" text default 'noel-2026'::text not null,
 "full_name" text not null,
 "phone" text not null,
 "email" text,
 "requested_places" smallint not null,
 "consent_at" timestamp with time zone not null,
 "status" text default 'requested'::text not null,
 "staff_notes" text,
 "created_at" timestamp with time zone default now() not null,
 "updated_at" timestamp with time zone default now() not null
);

create table public."collections" (
 "id" uuid default gen_random_uuid() not null,
 "slug" text not null,
 "name_fr" text not null,
 "name_en" text,
 "description_fr" text,
 "description_en" text,
 "image_url" text,
 "starts_at" timestamp with time zone,
 "ends_at" timestamp with time zone,
 "sort_order" integer default 0 not null,
 "is_featured" boolean default false not null,
 "is_active" boolean default true not null,
 "created_at" timestamp with time zone default now() not null,
 "updated_at" timestamp with time zone default now() not null
);

create table public."coupons" (
 "id" uuid default gen_random_uuid() not null,
 "code" text not null,
 "description" text,
 "discount_type" discount_type not null,
 "discount_value" numeric(12,2) not null,
 "min_order_amount" numeric(12,2) default 0,
 "starts_at" timestamp with time zone,
 "ends_at" timestamp with time zone,
 "usage_limit" integer,
 "used_count" integer default 0 not null,
 "is_active" boolean default true not null,
 "created_at" timestamp with time zone default now() not null,
 "updated_at" timestamp with time zone default now() not null
);

create table public."currencies" (
 "code" text not null,
 "name" text not null,
 "symbol" text not null,
 "decimals" integer default 0 not null,
 "is_default" boolean default false not null,
 "is_active" boolean default true not null
);

create table public."customers" (
 "id" uuid default gen_random_uuid() not null,
 "full_name" text,
 "phone" text,
 "email" text,
 "whatsapp_phone" text,
 "city" text,
 "country" text,
 "created_at" timestamp with time zone default now() not null,
 "updated_at" timestamp with time zone default now() not null
);

create table public."event_request_limits" (
 "key" text not null,
 "requests" integer not null,
 "expires_at" timestamp with time zone not null
);

create table public."faq" (
 "id" uuid default gen_random_uuid() not null,
 "question_fr" text not null,
 "question_en" text,
 "answer_fr" text not null,
 "answer_en" text,
 "sort_order" integer default 0 not null,
 "is_active" boolean default true not null,
 "created_at" timestamp with time zone default now() not null,
 "updated_at" timestamp with time zone default now() not null
);

create table public."homepage_sections" (
 "id" uuid default gen_random_uuid() not null,
 "section_key" text not null,
 "title_fr" text,
 "title_en" text,
 "content" jsonb default '{}'::jsonb not null,
 "sort_order" integer default 0 not null,
 "is_active" boolean default true not null,
 "updated_at" timestamp with time zone default now() not null
);

create table public."languages" (
 "code" text not null,
 "name" text not null,
 "is_default" boolean default false not null,
 "is_active" boolean default true not null
);

create table public."media_assets" (
 "id" uuid default gen_random_uuid() not null,
 "bucket" text default 'site-assets'::text not null,
 "path" text not null,
 "url" text not null,
 "title" text,
 "alt_fr" text,
 "alt_en" text,
 "asset_type" text default 'image'::text not null,
 "mime_type" text,
 "size_bytes" bigint,
 "width" integer,
 "height" integer,
 "tags" text[] default '{}'::text[] not null,
 "metadata" jsonb default '{}'::jsonb not null,
 "is_active" boolean default true not null,
 "created_by" uuid,
 "created_at" timestamp with time zone default now() not null,
 "updated_at" timestamp with time zone default now() not null
);

create table public."order_items" (
 "id" uuid default gen_random_uuid() not null,
 "order_id" uuid not null,
 "product_id" uuid,
 "variant_id" uuid,
 "sku" text not null,
 "product_name" text not null,
 "color_name" text,
 "size_label" text,
 "quantity" integer not null,
 "unit_price" numeric(12,2) not null,
 "line_total" numeric(12,2) not null,
 "created_at" timestamp with time zone default now() not null
);

create table public."order_request_limits" (
 "subject" text not null,
 "window_start" timestamp with time zone not null,
 "attempts" integer not null
);

create table public."order_status_history" (
 "id" uuid default gen_random_uuid() not null,
 "order_id" uuid not null,
 "old_status" order_status,
 "new_status" order_status not null,
 "changed_by" uuid,
 "note" text,
 "created_at" timestamp with time zone default now() not null
);

create table public."orders" (
 "id" uuid default gen_random_uuid() not null,
 "order_number" text not null,
 "customer_id" uuid,
 "status" order_status default 'pending'::order_status not null,
 "currency_code" text default 'XOF'::text not null,
 "subtotal" numeric(12,2) default 0 not null,
 "discount_total" numeric(12,2) default 0 not null,
 "total" numeric(12,2) default 0 not null,
 "coupon_code" text,
 "customer_note" text,
 "whatsapp_message" text,
 "whatsapp_opened_at" timestamp with time zone,
 "source" text default 'website'::text not null,
 "created_at" timestamp with time zone default now() not null,
 "updated_at" timestamp with time zone default now() not null,
 "request_key" uuid,
 "request_hash" text
);

create table public."payment_attempts" (
 "id" uuid default gen_random_uuid() not null,
 "public_token" uuid default gen_random_uuid() not null,
 "idempotency_key" uuid not null,
 "request_hash" text not null,
 "environment" text default 'sandbox'::text not null,
 "purpose" text default 'shop'::text not null,
 "customer" jsonb not null,
 "items" jsonb not null,
 "amount_xof" bigint not null,
 "provider_id" bigint,
 "checkout_url" text,
 "status" text default 'pending'::text not null,
 "expires_at" timestamp with time zone default (now() + '00:30:00'::interval) not null,
 "created_at" timestamp with time zone default now() not null,
 "updated_at" timestamp with time zone default now() not null
);

create table public."payment_events" (
 "id" bigint generated always as identity not null,
 "payment_id" uuid not null,
 "external_event" text not null,
 "new_status" text not null,
 "created_at" timestamp with time zone default now() not null
);

create table public."product_collections" (
 "product_id" uuid not null,
 "collection_id" uuid not null
);

create table public."product_images" (
 "id" uuid default gen_random_uuid() not null,
 "product_id" uuid not null,
 "url" text not null,
 "alt_fr" text,
 "alt_en" text,
 "is_primary" boolean default false not null,
 "sort_order" integer default 0 not null,
 "created_at" timestamp with time zone default now() not null
);

create table public."product_variants" (
 "id" uuid default gen_random_uuid() not null,
 "product_id" uuid not null,
 "sku" text not null,
 "color_name_fr" text not null,
 "color_name_en" text,
 "color_hex" text,
 "size_label" text not null,
 "audience" text,
 "price" numeric(12,2) not null,
 "compare_at_price" numeric(12,2),
 "stock_quantity" integer default 0 not null,
 "low_stock_threshold" integer default 5 not null,
 "is_active" boolean default true not null,
 "created_at" timestamp with time zone default now() not null,
 "updated_at" timestamp with time zone default now() not null
);

create table public."products" (
 "id" uuid default gen_random_uuid() not null,
 "category_id" uuid,
 "slug" text not null,
 "name_fr" text not null,
 "name_en" text,
 "description_fr" text,
 "description_en" text,
 "base_price" numeric(12,2) default 0 not null,
 "compare_at_price" numeric(12,2),
 "currency_code" text default 'XOF'::text not null,
 "is_active" boolean default true not null,
 "is_featured" boolean default false not null,
 "is_new" boolean default false not null,
 "sort_order" integer default 0 not null,
 "seo_title_fr" text,
 "seo_title_en" text,
 "seo_description_fr" text,
 "seo_description_en" text,
 "created_at" timestamp with time zone default now() not null,
 "updated_at" timestamp with time zone default now() not null,
 "deleted_at" timestamp with time zone
);

create table public."profiles" (
 "id" uuid not null,
 "full_name" text,
 "email" text,
 "role" admin_role default 'employee'::admin_role not null,
 "is_active" boolean default true not null,
 "created_at" timestamp with time zone default now() not null,
 "updated_at" timestamp with time zone default now() not null
);

create table public."reviews" (
 "id" uuid default gen_random_uuid() not null,
 "product_id" uuid,
 "customer_name" text not null,
 "rating" integer not null,
 "comment" text,
 "is_approved" boolean default false not null,
 "created_at" timestamp with time zone default now() not null
);

create table public."settings" (
 "key" text not null,
 "value" jsonb not null,
 "description" text,
 "updated_at" timestamp with time zone default now() not null
);

create table public."testimonials" (
 "id" uuid default gen_random_uuid() not null,
 "customer_name" text not null,
 "message_fr" text not null,
 "message_en" text,
 "rating" integer,
 "image_url" text,
 "sort_order" integer default 0 not null,
 "is_active" boolean default true not null,
 "created_at" timestamp with time zone default now() not null,
 "updated_at" timestamp with time zone default now() not null
);

alter table public."payment_attempts" add constraint "payment_attempts_idempotency_key_key" UNIQUE (idempotency_key);

alter table public."profiles" add constraint "profiles_pkey" PRIMARY KEY (id);

alter table public."languages" add constraint "languages_pkey" PRIMARY KEY (code);

alter table public."currencies" add constraint "currencies_pkey" PRIMARY KEY (code);

alter table public."settings" add constraint "settings_pkey" PRIMARY KEY (key);

alter table public."categories" add constraint "categories_pkey" PRIMARY KEY (id);

alter table public."categories" add constraint "categories_slug_key" UNIQUE (slug);

alter table public."collections" add constraint "collections_pkey" PRIMARY KEY (id);

alter table public."collections" add constraint "collections_slug_key" UNIQUE (slug);

alter table public."products" add constraint "products_base_price_check" CHECK ((base_price >= (0)::numeric));

alter table public."christmas_event_config" add constraint "christmas_event_config_event_key_check" CHECK ((event_key = 'noel-2026'::text));

alter table public."christmas_event_config" add constraint "christmas_event_config_ticket_price_xof_check" CHECK (((ticket_price_xof IS NULL) OR (ticket_price_xof >= 0)));

alter table public."christmas_event_config" add constraint "christmas_event_config_capacity_check" CHECK (((capacity IS NULL) OR (capacity >= 1)));

alter table public."products" add constraint "products_compare_at_price_check" CHECK (((compare_at_price IS NULL) OR (compare_at_price >= (0)::numeric)));

alter table public."products" add constraint "products_pkey" PRIMARY KEY (id);

alter table public."products" add constraint "products_slug_key" UNIQUE (slug);

alter table public."product_collections" add constraint "product_collections_pkey" PRIMARY KEY (product_id, collection_id);

alter table public."product_images" add constraint "product_images_pkey" PRIMARY KEY (id);

alter table public."product_variants" add constraint "product_variants_price_check" CHECK ((price >= (0)::numeric));

alter table public."product_variants" add constraint "product_variants_compare_at_price_check" CHECK (((compare_at_price IS NULL) OR (compare_at_price >= (0)::numeric)));

alter table public."product_variants" add constraint "product_variants_stock_quantity_check" CHECK ((stock_quantity >= 0));

alter table public."product_variants" add constraint "product_variants_low_stock_threshold_check" CHECK ((low_stock_threshold >= 0));

alter table public."product_variants" add constraint "product_variants_pkey" PRIMARY KEY (id);

alter table public."product_variants" add constraint "product_variants_sku_key" UNIQUE (sku);

alter table public."customers" add constraint "customers_pkey" PRIMARY KEY (id);

alter table public."orders" add constraint "orders_subtotal_check" CHECK ((subtotal >= (0)::numeric));

alter table public."orders" add constraint "orders_discount_total_check" CHECK ((discount_total >= (0)::numeric));

alter table public."orders" add constraint "orders_total_check" CHECK ((total >= (0)::numeric));

alter table public."orders" add constraint "orders_pkey" PRIMARY KEY (id);

alter table public."orders" add constraint "orders_order_number_key" UNIQUE (order_number);

alter table public."order_items" add constraint "order_items_quantity_check" CHECK ((quantity > 0));

alter table public."order_items" add constraint "order_items_unit_price_check" CHECK ((unit_price >= (0)::numeric));

alter table public."order_items" add constraint "order_items_line_total_check" CHECK ((line_total >= (0)::numeric));

alter table public."order_items" add constraint "order_items_pkey" PRIMARY KEY (id);

alter table public."coupons" add constraint "coupons_discount_value_check" CHECK ((discount_value > (0)::numeric));

alter table public."coupons" add constraint "coupons_min_order_amount_check" CHECK ((min_order_amount >= (0)::numeric));

alter table public."coupons" add constraint "coupons_usage_limit_check" CHECK (((usage_limit IS NULL) OR (usage_limit > 0)));

alter table public."coupons" add constraint "coupons_used_count_check" CHECK ((used_count >= 0));

alter table public."coupons" add constraint "coupons_pkey" PRIMARY KEY (id);

alter table public."coupons" add constraint "coupons_code_key" UNIQUE (code);

alter table public."christmas_event_config" add constraint "christmas_event_config_pkey" PRIMARY KEY (event_key);

alter table public."payment_attempts" add constraint "payment_attempts_provider_id_key" UNIQUE (provider_id);

alter table public."reviews" add constraint "reviews_rating_check" CHECK (((rating >= 1) AND (rating <= 5)));

alter table public."reviews" add constraint "reviews_pkey" PRIMARY KEY (id);

alter table public."banners" add constraint "banners_pkey" PRIMARY KEY (id);

alter table public."homepage_sections" add constraint "homepage_sections_pkey" PRIMARY KEY (id);

alter table public."homepage_sections" add constraint "homepage_sections_section_key_key" UNIQUE (section_key);

alter table public."faq" add constraint "faq_pkey" PRIMARY KEY (id);

alter table public."testimonials" add constraint "testimonials_rating_check" CHECK (((rating >= 1) AND (rating <= 5)));

alter table public."testimonials" add constraint "testimonials_pkey" PRIMARY KEY (id);

alter table public."analytics_events" add constraint "analytics_events_pkey" PRIMARY KEY (id);

alter table public."activity_logs" add constraint "activity_logs_pkey" PRIMARY KEY (id);

alter table public."media_assets" add constraint "media_assets_pkey" PRIMARY KEY (id);

alter table public."products" add constraint "products_base_price_positive" CHECK ((base_price >= (0)::numeric));

alter table public."product_variants" add constraint "variants_price_positive" CHECK ((price >= (0)::numeric));

alter table public."product_variants" add constraint "variants_stock_positive" CHECK ((stock_quantity >= 0));

alter table public."payment_attempts" add constraint "payment_attempts_environment_check" CHECK ((environment = 'sandbox'::text));

alter table public."payment_events" add constraint "payment_events_pkey" PRIMARY KEY (id);

alter table public."payment_events" add constraint "payment_events_external_event_key" UNIQUE (external_event);

alter table public."reviews" add constraint "reviews_rating_range" CHECK (((rating >= 1) AND (rating <= 5)));

alter table public."orders" add constraint "orders_amounts_positive" CHECK (((subtotal >= (0)::numeric) AND (discount_total >= (0)::numeric) AND (total >= (0)::numeric)));

alter table public."order_items" add constraint "order_items_amounts_positive" CHECK (((quantity > 0) AND (unit_price >= (0)::numeric) AND (line_total >= (0)::numeric)));

alter table public."media_assets" add constraint "media_assets_asset_type_check" CHECK ((asset_type = ANY (ARRAY['image'::text, 'video'::text, 'document'::text, 'logo'::text, 'banner'::text, 'icon'::text])));

alter table public."media_assets" add constraint "media_assets_size_check" CHECK (((size_bytes IS NULL) OR (size_bytes >= 0)));

alter table public."media_assets" add constraint "media_assets_width_check" CHECK (((width IS NULL) OR (width >= 0)));

alter table public."media_assets" add constraint "media_assets_height_check" CHECK (((height IS NULL) OR (height >= 0)));

alter table public."order_status_history" add constraint "order_status_history_pkey" PRIMARY KEY (id);

alter table public."payment_attempts" add constraint "payment_attempts_purpose_check" CHECK ((purpose = 'shop'::text));

alter table public."payment_attempts" add constraint "payment_attempts_amount_xof_check" CHECK ((amount_xof > 0));

alter table public."payment_attempts" add constraint "payment_attempts_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'cancelled'::text, 'expired'::text, 'refunded'::text, 'partially_refunded'::text])));

alter table public."payment_attempts" add constraint "payment_attempts_pkey" PRIMARY KEY (id);

alter table public."christmas_event_requests" add constraint "christmas_event_requests_event_key_check" CHECK ((event_key = 'noel-2026'::text));

alter table public."payment_attempts" add constraint "payment_attempts_public_token_key" UNIQUE (public_token);

alter table public."christmas_event_requests" add constraint "christmas_event_requests_full_name_check" CHECK (((char_length(btrim(full_name)) >= 2) AND (char_length(btrim(full_name)) <= 120)));

alter table public."christmas_event_requests" add constraint "christmas_event_requests_phone_check" CHECK (((char_length(btrim(phone)) >= 7) AND (char_length(btrim(phone)) <= 25)));

alter table public."christmas_event_requests" add constraint "christmas_event_requests_email_check" CHECK (((email IS NULL) OR ((char_length(email) <= 254) AND (email ~* '^[^@ ]+@[^@ ]+\.[^@ ]+$'::text))));

alter table public."christmas_event_requests" add constraint "christmas_event_requests_requested_places_check" CHECK (((requested_places >= 1) AND (requested_places <= 8)));

alter table public."christmas_event_requests" add constraint "christmas_event_requests_status_check" CHECK ((status = ANY (ARRAY['requested'::text, 'contacted'::text, 'confirmed'::text, 'cancelled'::text])));

alter table public."christmas_event_requests" add constraint "christmas_event_requests_staff_notes_check" CHECK (((staff_notes IS NULL) OR (char_length(staff_notes) <= 2000)));

alter table public."christmas_event_requests" add constraint "christmas_event_requests_pkey" PRIMARY KEY (id);

alter table public."event_request_limits" add constraint "event_request_limits_requests_check" CHECK ((requests > 0));

alter table public."event_request_limits" add constraint "event_request_limits_pkey" PRIMARY KEY (key);

alter table public."orders" add constraint "orders_request_key_key" UNIQUE (request_key);

alter table public."order_request_limits" add constraint "order_request_limits_attempts_check" CHECK (((attempts >= 1) AND (attempts <= 121)));

alter table public."order_request_limits" add constraint "order_request_limits_pkey" PRIMARY KEY (subject, window_start);

alter table public."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public."categories" add constraint "categories_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL;

alter table public."products" add constraint "products_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

alter table public."products" add constraint "products_currency_code_fkey" FOREIGN KEY (currency_code) REFERENCES currencies(code);

alter table public."product_collections" add constraint "product_collections_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

alter table public."product_collections" add constraint "product_collections_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE;

alter table public."product_images" add constraint "product_images_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

alter table public."product_variants" add constraint "product_variants_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

alter table public."orders" add constraint "orders_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

alter table public."orders" add constraint "orders_currency_code_fkey" FOREIGN KEY (currency_code) REFERENCES currencies(code);

alter table public."order_items" add constraint "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

alter table public."order_items" add constraint "order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

alter table public."order_items" add constraint "order_items_variant_id_fkey" FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;

alter table public."reviews" add constraint "reviews_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

alter table public."analytics_events" add constraint "analytics_events_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

alter table public."analytics_events" add constraint "analytics_events_variant_id_fkey" FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;

alter table public."analytics_events" add constraint "analytics_events_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL;

alter table public."activity_logs" add constraint "activity_logs_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public."payment_events" add constraint "payment_events_payment_id_fkey" FOREIGN KEY (payment_id) REFERENCES payment_attempts(id);

alter table public."order_status_history" add constraint "order_status_history_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

alter table public."order_status_history" add constraint "order_status_history_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.admin_transition_order(p_order_id uuid, p_expected_status order_status, p_new_status order_status)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare current_status public.order_status;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Staff access required'; end if;
 select status into current_status from public.orders where id=p_order_id for update;
 if not found or current_status is distinct from p_expected_status then raise exception 'Order changed; refresh before retrying'; end if;
 perform public.admin_update_order_status(p_order_id,p_new_status);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(p_order_id uuid, p_new_status order_status)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Accès administrateur requis';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Commande introuvable';
  end if;

  if v_order.status = p_new_status then
    return;
  end if;

  if not (
    (v_order.status = 'pending' and p_new_status in ('confirmed', 'cancelled')) or
    (v_order.status = 'confirmed' and p_new_status in ('preparing', 'cancelled')) or
    (v_order.status = 'preparing' and p_new_status in ('ready', 'cancelled')) or
    (v_order.status = 'ready' and p_new_status in ('delivered', 'cancelled'))
  ) then
    raise exception 'Transition de statut non autorisée';
  end if;

  if p_new_status = 'confirmed' then
    for v_item in
      select oi.variant_id, oi.quantity, pv.stock_quantity, pv.sku
      from public.order_items oi
      join public.product_variants pv on pv.id = oi.variant_id
      where oi.order_id = p_order_id
      order by oi.variant_id
      for update of pv
    loop
      if v_item.stock_quantity < v_item.quantity then
        raise exception 'Stock insuffisant pour %', v_item.sku;
      end if;

      update public.product_variants
      set stock_quantity = stock_quantity - v_item.quantity
      where id = v_item.variant_id;
    end loop;
  elsif p_new_status = 'cancelled' and v_order.status in ('confirmed', 'preparing', 'ready') then
    update public.product_variants pv
    set stock_quantity = pv.stock_quantity + oi.quantity
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.variant_id = pv.id;
  end if;

  update public.orders
  set status = p_new_status
  where id = p_order_id;

  insert into public.order_status_history (order_id, old_status, new_status, changed_by, note)
  values (p_order_id, v_order.status, p_new_status, auth.uid(), null);
end;
$function$;

CREATE OR REPLACE FUNCTION public.apply_sandbox_payment(p_id uuid, p_provider_id bigint, p_amount bigint, p_status text, p_event text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare payment public.payment_attempts%rowtype;
begin
  select * into payment from public.payment_attempts where id=p_id for update;
  if not found or payment.provider_id is distinct from p_provider_id or payment.amount_xof<>p_amount then raise exception 'Payment mismatch'; end if;
  if p_status not in ('pending','paid','failed','cancelled','expired','refunded','partially_refunded') then raise exception 'Invalid state'; end if;
  -- Paid/refunded records cannot be reverted by a delayed pending/failed notification.
  if payment.status='refunded' then p_status:='refunded';
  elsif payment.status='partially_refunded' and p_status not in ('refunded','partially_refunded') then p_status:='partially_refunded';
  elsif payment.status='paid' and p_status not in ('refunded','partially_refunded') then p_status:='paid'; end if;
  insert into public.payment_events(payment_id,external_event,new_status) values(p_id,p_event,p_status) on conflict(external_event) do nothing;
  if not found then return; end if;
  update public.payment_attempts set status=p_status,updated_at=now() where id=p_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.audit_staff_operation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 insert into public.activity_logs(actor_id,action,entity_type,entity_id)
 values(auth.uid(),lower(TG_OP),TG_TABLE_NAME,nullif(to_jsonb(new)->>'id','')::uuid);
 return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.consume_order_request_budget(p_subject text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare window_at timestamptz := date_bin(interval '5 minutes',clock_timestamp(),timestamptz '2026-01-01 00:00:00+00');
  allowed integer;
begin
  if p_subject is null or p_subject !~ '^[a-f0-9]{64}$' then raise exception 'Invalid fingerprint'; end if;
  -- Global ceiling bounds DB work even if anonymous callers rotate claimed phone numbers.
  insert into public.order_request_limits(subject,window_start,attempts) values('global',window_at,1)
  on conflict(subject,window_start) do update set attempts=public.order_request_limits.attempts+1
    where public.order_request_limits.attempts<120 returning attempts into allowed;
  if allowed is null then return false; end if;
  allowed:=null;
  insert into public.order_request_limits(subject,window_start,attempts) values(p_subject,window_at,1)
  on conflict(subject,window_start) do update set attempts=public.order_request_limits.attempts+1
    where public.order_request_limits.attempts<5 returning attempts into allowed;
  delete from public.order_request_limits where window_start<window_at-interval '1 hour';
  return allowed is not null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_order_request_atomic(p_key uuid, p_hash text, p_name text, p_phone text, p_comment text, p_lines jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare existing public.orders%rowtype; customer uuid; new_order public.orders%rowtype; wanted record; variant record; items jsonb:='[]'; total numeric:=0;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
 select * into existing from public.orders where request_key=p_key for update;
 if found then
  if existing.request_hash<>p_hash then raise exception 'Idempotency conflict'; end if;
  return existing.order_number;
 end if;
 if char_length(btrim(p_name)) not between 2 and 80 or p_phone !~ '^[0-9]{8,15}$' or char_length(coalesce(p_comment,''))>500 then raise exception 'Invalid customer'; end if;
 if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 20 then raise exception 'Invalid basket'; end if;
 perform pg_advisory_xact_lock(hashtextextended('customer:'||p_phone,0));
 if (select count(*) from public.orders o join public.customers c on c.id=o.customer_id where c.whatsapp_phone=p_phone and o.source='website' and o.status='pending' and o.created_at>now()-interval '15 minutes')>=2 then raise exception 'Rate limit'; end if;
 for wanted in select (line->>'variantId')::uuid as id,sum((line->>'quantity')::int) as qty from jsonb_array_elements(p_lines) line group by 1 order by 1 loop
  if wanted.qty is null or wanted.qty not between 1 and 10 then raise exception 'Invalid quantity'; end if;
  select v.*,p.name_fr into variant from public.product_variants v join public.products p on p.id=v.product_id
    where v.id=wanted.id and v.is_active and p.is_active and p.deleted_at is null and p.currency_code='XOF' for update of v;
  if not found or variant.stock_quantity<wanted.qty or variant.price<=0 then raise exception 'Stock unavailable'; end if;
  total:=total+variant.price*wanted.qty;
  items:=items||jsonb_build_array(jsonb_build_object('product_id',variant.product_id,'variant_id',variant.id,'sku',variant.sku,'product_name',variant.name_fr,'color_name',variant.color_name_fr,'size_label',variant.size_label,'quantity',wanted.qty,'unit_price',variant.price,'line_total',variant.price*wanted.qty));
 end loop;
 -- Do not overwrite an existing customer's identity merely because a public request claims their phone.
 select id into customer from public.customers where whatsapp_phone=p_phone order by created_at limit 1;
 if customer is null then
  insert into public.customers(full_name,phone,whatsapp_phone) values(p_name,p_phone,p_phone) returning id into customer;
 end if;
 insert into public.orders(customer_id,status,currency_code,subtotal,discount_total,total,customer_note,source,request_key,request_hash)
 values(customer,'pending','XOF',total,0,total,nullif(p_comment,''),'website',p_key,p_hash) returning * into new_order;
 insert into public.order_items(order_id,product_id,variant_id,sku,product_name,color_name,size_label,quantity,unit_price,line_total)
 select new_order.id,(item->>'product_id')::uuid,(item->>'variant_id')::uuid,item->>'sku',item->>'product_name',item->>'color_name',item->>'size_label',(item->>'quantity')::int,(item->>'unit_price')::numeric,(item->>'line_total')::numeric from jsonb_array_elements(items) item;
 insert into public.order_status_history(order_id,new_status,note) values(new_order.id,'pending','Demande créée depuis le site. Aucun paiement confirmé.');
 return new_order.order_number;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_sandbox_payment(p_key uuid, p_hash text, p_customer jsonb, p_lines jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  previous public.payment_attempts%rowtype;
  variant record;
  wanted record;
  items jsonb := '[]';
  total bigint := 0;
  held bigint;
  new_payment public.payment_attempts%rowtype;
begin
  -- Serialize the idempotency key, including when the row does not exist yet.
  perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  select * into previous from public.payment_attempts where idempotency_key=p_key for update;
  if found then
    if previous.request_hash<>p_hash then raise exception 'Idempotency conflict'; end if;
    if previous.expires_at<=now() or previous.status<>'pending' then raise exception 'Payment closed'; end if;
    return to_jsonb(previous)||jsonb_build_object('creator',false);
  end if;
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 20 then raise exception 'Invalid lines'; end if;
  -- Stable lock order prevents deadlocks for baskets sharing multiple variants.
  for wanted in select (line->>'variantId')::uuid as id,sum((line->>'quantity')::int) as qty
    from jsonb_array_elements(p_lines) line group by 1 order by 1
  loop
    if wanted.qty is null or wanted.qty not between 1 and 10 then raise exception 'Invalid quantity'; end if;
    select v.id,v.sku,v.product_id,v.price,v.stock_quantity,p.name_fr into variant
      from public.product_variants v join public.products p on p.id=v.product_id
      where v.id=wanted.id and v.is_active and p.is_active and p.deleted_at is null and p.currency_code='XOF'
      for update of v;
    if not found or variant.price<=0 or trunc(variant.price)<>variant.price then raise exception 'Unavailable article'; end if;
    select coalesce(sum((line->>'quantity')::int),0) into held
      from public.payment_attempts a cross join lateral jsonb_array_elements(a.items) line
      where a.expires_at>now() and a.status in ('pending','paid') and line->>'variantId'=wanted.id::text;
    if variant.stock_quantity-held<wanted.qty then raise exception 'Insufficient stock'; end if;
    total:=total+variant.price::bigint*wanted.qty;
    items:=items||jsonb_build_array(jsonb_build_object('variantId',wanted.id,'quantity',wanted.qty,'unitPrice',variant.price,'name',variant.name_fr,'sku',variant.sku));
  end loop;
  insert into public.payment_attempts(idempotency_key,request_hash,customer,items,amount_xof)
    values(p_key,p_hash,p_customer,items,total) returning * into new_payment;
  return to_jsonb(new_payment)||jsonb_build_object('creator',true);
end;
$function$;

CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := 'MDP-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_owner_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin return new; end;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('super_admin', 'admin', 'employee')
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_manager()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and is_active and role in ('super_admin','admin'));
$function$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role = 'super_admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.slugify(input text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  select trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(input, ''))), '[^a-z0-9]+', '-', 'g'));
$function$;

CREATE OR REPLACE FUNCTION public.submit_christmas_request(p_name text, p_phone text, p_email text, p_places integer, p_fingerprint text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare bucket text; attempts int;
begin
 perform pg_advisory_xact_lock(hashtextextended('christmas-interest-request-limit',0));
 if not exists(select 1 from public.christmas_event_config where event_key='noel-2026' and requests_open) then raise exception 'Requests closed'; end if;
 if p_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'Invalid fingerprint'; end if;
 bucket:=floor(extract(epoch from now())/900)::bigint::text;
 delete from public.event_request_limits where expires_at<now();
 insert into public.event_request_limits values('global:'||bucket,1,now()+interval '30 minutes')
 on conflict(key) do update set requests=event_request_limits.requests+1 returning requests into attempts;
 if attempts>40 then raise exception 'Rate limit'; end if;
 insert into public.event_request_limits values(p_fingerprint||':'||bucket,1,now()+interval '30 minutes')
 on conflict(key) do update set requests=event_request_limits.requests+1 returning requests into attempts;
 if attempts>3 then raise exception 'Rate limit'; end if;
 insert into public.christmas_event_requests(event_key,full_name,phone,email,requested_places,consent_at,status)
 values('noel-2026',p_name,p_phone,nullif(p_email,''),p_places,now(),'requested');
end;
$function$;

create view public."product_catalog" with (security_invoker=true) as  SELECT p.id,
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
    c.slug AS category_slug,
    c.name_fr AS category_name_fr,
    c.name_en AS category_name_en,
    COALESCE(sum(v.stock_quantity), 0::bigint)::integer AS total_stock,
    min(v.price) AS min_variant_price,
    max(v.price) AS max_variant_price,
    pi.url AS primary_image_url,
    COALESCE(( SELECT array_agg(col.slug ORDER BY col.slug) AS array_agg
           FROM product_collections pc
             JOIN collections col ON col.id = pc.collection_id
          WHERE pc.product_id = p.id), ARRAY[]::text[]) AS collection_slugs,
    min(v.compare_at_price) FILTER (WHERE v.compare_at_price IS NOT NULL AND v.compare_at_price > v.price) AS min_variant_compare_at_price
   FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_variants v ON v.product_id = p.id AND v.is_active = true
     LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
  WHERE p.deleted_at IS NULL
  GROUP BY p.id, c.slug, c.name_fr, c.name_en, pi.url;

create view public."dashboard_summary" with (security_invoker=true) as  SELECT ( SELECT count(*) AS count
           FROM products) AS products_total,
    ( SELECT count(*) AS count
           FROM product_variants
          WHERE product_variants.stock_quantity = 0) AS variants_out_of_stock,
    ( SELECT count(*) AS count
           FROM product_variants
          WHERE product_variants.stock_quantity > 0 AND product_variants.stock_quantity <= product_variants.low_stock_threshold) AS variants_low_stock,
    ( SELECT count(*) AS count
           FROM orders) AS orders_total,
    ( SELECT count(*) AS count
           FROM orders
          WHERE orders.status = 'pending'::order_status) AS orders_pending;

create view public."admin_order_overview" with (security_invoker=true) as  SELECT o.id,
    o.order_number,
    o.status,
    o.source,
    o.currency_code,
    o.subtotal,
    o.discount_total,
    o.total,
    o.created_at,
    o.updated_at,
    c.full_name AS customer_name,
    c.phone AS customer_phone,
    c.whatsapp_phone AS customer_whatsapp_phone,
    count(oi.id) AS items_count
   FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     LEFT JOIN order_items oi ON oi.order_id = o.id
  GROUP BY o.id, c.full_name, c.phone, c.whatsapp_phone;

create view public."admin_product_overview" with (security_invoker=true) as  SELECT p.id,
    p.slug,
    p.name_fr,
    p.is_active,
    p.is_featured,
    p.is_new,
    p.base_price,
    p.currency_code,
    c.name_fr AS category_name_fr,
    count(v.id) AS variants_count,
    COALESCE(sum(v.stock_quantity), 0::bigint) AS total_stock,
    min(v.price) AS min_variant_price,
    max(v.price) AS max_variant_price,
    p.created_at,
    p.updated_at
   FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_variants v ON v.product_id = p.id
  GROUP BY p.id, c.name_fr;

CREATE INDEX idx_products_currency_code ON public.products USING btree (currency_code);

CREATE INDEX idx_analytics_events_variant_id ON public.analytics_events USING btree (variant_id);

CREATE INDEX idx_media_assets_created_at ON public.media_assets USING btree (created_at);

CREATE INDEX idx_orders_currency_code ON public.orders USING btree (currency_code);

CREATE UNIQUE INDEX christmas_event_unique_phone_idx ON public.christmas_event_requests USING btree (event_key, regexp_replace(phone, '[^0-9+]'::text, ''::text, 'g'::text)) WHERE (status = ANY (ARRAY['requested'::text, 'contacted'::text, 'confirmed'::text]));

CREATE INDEX idx_order_status_history_order_id ON public.order_status_history USING btree (order_id);

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);

CREATE INDEX idx_products_active_featured_sort ON public.products USING btree (is_active, is_featured, sort_order);

CREATE INDEX idx_products_deleted_at ON public.products USING btree (deleted_at);

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC);

CREATE UNIQUE INDEX uniq_variants_combo ON public.product_variants USING btree (product_id, color_name_fr, size_label);

CREATE INDEX idx_orders_status ON public.orders USING btree (status);

CREATE INDEX idx_order_items_variant_id ON public.order_items USING btree (variant_id);

CREATE INDEX idx_orders_customer_id ON public.orders USING btree (customer_id);

CREATE INDEX idx_variants_product ON public.product_variants USING btree (product_id);

CREATE INDEX idx_product_variants_active_stock ON public.product_variants USING btree (is_active, stock_quantity);

CREATE INDEX idx_customers_created_at ON public.customers USING btree (created_at);

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at DESC);

CREATE UNIQUE INDEX uniq_orders_order_number ON public.orders USING btree (order_number);

CREATE INDEX idx_products_created_at ON public.products USING btree (created_at);

CREATE UNIQUE INDEX idx_product_images_one_primary ON public.product_images USING btree (product_id) WHERE (is_primary = true);

CREATE INDEX idx_reviews_product_id ON public.reviews USING btree (product_id);

CREATE INDEX idx_products_active ON public.products USING btree (is_active) WHERE (deleted_at IS NULL);

CREATE INDEX idx_activity_logs_actor ON public.activity_logs USING btree (actor_id);

CREATE INDEX idx_product_collections_collection_id ON public.product_collections USING btree (collection_id);

CREATE INDEX christmas_event_requests_created_idx ON public.christmas_event_requests USING btree (created_at DESC);

CREATE INDEX idx_analytics_type_date ON public.analytics_events USING btree (event_type, created_at DESC);

CREATE INDEX idx_analytics_events_collection_id ON public.analytics_events USING btree (collection_id);

CREATE INDEX idx_products_search_fr ON public.products USING gin (to_tsvector('french'::regconfig, ((((((COALESCE(name_fr, ''::text) || ' '::text) || COALESCE(description_fr, ''::text)) || ' '::text) || COALESCE(seo_title_fr, ''::text)) || ' '::text) || COALESCE(seo_description_fr, ''::text))));

CREATE INDEX idx_variants_stock ON public.product_variants USING btree (stock_quantity);

CREATE INDEX idx_order_status_history_changed_by ON public.order_status_history USING btree (changed_by);

CREATE INDEX idx_orders_status_created_at ON public.orders USING btree (status, created_at);

CREATE INDEX idx_media_assets_tags ON public.media_assets USING gin (tags);

CREATE INDEX payment_pending_idx ON public.payment_attempts USING btree (status, updated_at);

CREATE UNIQUE INDEX uniq_media_assets_bucket_path ON public.media_assets USING btree (bucket, path);

CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);

CREATE INDEX idx_order_status_history_created_at ON public.order_status_history USING btree (created_at);

CREATE INDEX idx_analytics_product ON public.analytics_events USING btree (product_id);

CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);

CREATE INDEX idx_products_category ON public.products USING btree (category_id);

CREATE INDEX idx_media_assets_asset_type ON public.media_assets USING btree (asset_type);

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_collections_updated_at BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_generate_order_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION generate_order_number();

CREATE TRIGGER trg_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_banners_updated_at BEFORE UPDATE ON public.banners FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_homepage_sections_updated_at BEFORE UPDATE ON public.homepage_sections FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_faq_updated_at BEFORE UPDATE ON public.faq FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_testimonials_updated_at BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER media_assets_set_updated_at BEFORE UPDATE ON public.media_assets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER audit_product_changes AFTER INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION audit_staff_operation();

CREATE TRIGGER audit_stock_changes AFTER UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION audit_staff_operation();

CREATE TRIGGER audit_site_changes AFTER UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION audit_staff_operation();

CREATE TRIGGER audit_media_changes AFTER UPDATE ON public.media_assets FOR EACH ROW EXECUTE FUNCTION audit_staff_operation();

alter table public."activity_logs" enable row level security;

alter table public."analytics_events" enable row level security;

alter table public."banners" enable row level security;

alter table public."categories" enable row level security;

alter table public."christmas_event_config" enable row level security;

alter table public."christmas_event_requests" enable row level security;

alter table public."collections" enable row level security;

alter table public."coupons" enable row level security;

alter table public."currencies" enable row level security;

alter table public."customers" enable row level security;

alter table public."event_request_limits" enable row level security;

alter table public."faq" enable row level security;

alter table public."homepage_sections" enable row level security;

alter table public."languages" enable row level security;

alter table public."media_assets" enable row level security;

alter table public."order_items" enable row level security;

alter table public."order_request_limits" enable row level security;

alter table public."order_status_history" enable row level security;

alter table public."orders" enable row level security;

alter table public."payment_attempts" enable row level security;

alter table public."payment_events" enable row level security;

alter table public."product_collections" enable row level security;

alter table public."product_images" enable row level security;

alter table public."product_variants" enable row level security;

alter table public."products" enable row level security;

alter table public."profiles" enable row level security;

alter table public."reviews" enable row level security;

alter table public."settings" enable row level security;

alter table public."testimonials" enable row level security;

create policy "admin manage profiles" on public."profiles" as PERMISSIVE for ALL to "authenticated" using (( SELECT is_super_admin() AS is_super_admin)) with check (( SELECT is_super_admin() AS is_super_admin));

create policy "admin manage languages" on public."languages" as PERMISSIVE for ALL to "authenticated" using (is_admin()) with check (is_admin());

create policy "public read active languages" on public."languages" as PERMISSIVE for SELECT to public using ((is_active = true));

create policy "admin manage currencies" on public."currencies" as PERMISSIVE for ALL to "authenticated" using (is_admin()) with check (is_admin());

create policy "public read active currencies" on public."currencies" as PERMISSIVE for SELECT to public using ((is_active = true));

create policy "admin manage settings" on public."settings" as PERMISSIVE for ALL to "authenticated" using (( SELECT is_manager() AS is_manager)) with check (( SELECT is_manager() AS is_manager));

create policy "public read public settings" on public."settings" as PERMISSIVE for SELECT to public using ((key = ANY (ARRAY['site'::text, 'whatsapp'::text, 'theme'::text, 'social'::text, 'homepage'::text])));

create policy "admin manage categories" on public."categories" as PERMISSIVE for ALL to "authenticated" using (is_admin()) with check (is_admin());

create policy "public read active categories" on public."categories" as PERMISSIVE for SELECT to public using ((is_active = true));

create policy "admin manage collections" on public."collections" as PERMISSIVE for ALL to "authenticated" using (is_admin()) with check (is_admin());

create policy "public read active collections" on public."collections" as PERMISSIVE for SELECT to public using ((is_active = true));

create policy "admin manage product_collections" on public."product_collections" as PERMISSIVE for ALL to "authenticated" using (is_admin()) with check (is_admin());

create policy "public read product_collections" on public."product_collections" as PERMISSIVE for SELECT to public using (((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_collections.product_id) AND (p.is_active = true) AND (p.deleted_at IS NULL)))) AND (EXISTS ( SELECT 1
   FROM collections c
  WHERE ((c.id = product_collections.collection_id) AND (c.is_active = true))))));

create policy "admin manage product_images" on public."product_images" as PERMISSIVE for ALL to "authenticated" using (is_admin()) with check (is_admin());

create policy "public read product_images" on public."product_images" as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_images.product_id) AND (p.is_active = true) AND (p.deleted_at IS NULL)))));

create policy "admin manage customers" on public."customers" as PERMISSIVE for ALL to "authenticated" using (is_admin()) with check (is_admin());

create policy "admin manage coupons" on public."coupons" as PERMISSIVE for ALL to "authenticated" using (( SELECT is_admin() AS is_admin)) with check (( SELECT is_admin() AS is_admin));

create policy "admin manage banners" on public."banners" as PERMISSIVE for ALL to "authenticated" using (is_admin()) with check (is_admin());

create policy "public read active banners" on public."banners" as PERMISSIVE for SELECT to public using ((is_active = true));

create policy "admin manage homepage_sections" on public."homepage_sections" as PERMISSIVE for ALL to "authenticated" using (is_admin()) with check (is_admin());

create policy "public read active homepage sections" on public."homepage_sections" as PERMISSIVE for SELECT to public using ((is_active = true));

create policy "admin manage faq" on public."faq" as PERMISSIVE for ALL to "authenticated" using (is_admin()) with check (is_admin());

create policy "public read active faq" on public."faq" as PERMISSIVE for SELECT to public using ((is_active = true));

create policy "admin manage testimonials" on public."testimonials" as PERMISSIVE for ALL to "authenticated" using (is_admin()) with check (is_admin());

create policy "public read active testimonials" on public."testimonials" as PERMISSIVE for SELECT to public using ((is_active = true));

create policy "admin read analytics" on public."analytics_events" as PERMISSIVE for SELECT to public using (is_admin());

create policy "admin create activity logs" on public."activity_logs" as PERMISSIVE for INSERT to "authenticated" with check (( SELECT is_admin() AS is_admin));

create policy "admin read activity logs" on public."activity_logs" as PERMISSIVE for SELECT to "authenticated" using (( SELECT is_admin() AS is_admin));

create policy "admin manage products" on public."products" as PERMISSIVE for ALL to "authenticated" using (is_admin()) with check (is_admin());

create policy "public read active products" on public."products" as PERMISSIVE for SELECT to public using (((is_active = true) AND (deleted_at IS NULL)));

create policy "admin manage order_items" on public."order_items" as PERMISSIVE for ALL to "authenticated" using (is_admin()) with check (is_admin());

create policy "admin manage variants" on public."product_variants" as PERMISSIVE for ALL to "authenticated" using (is_admin()) with check (is_admin());

create policy "public read active variants" on public."product_variants" as PERMISSIVE for SELECT to public using (((is_active = true) AND (EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_variants.product_id) AND (p.is_active = true) AND (p.deleted_at IS NULL))))));

create policy "admin manage reviews" on public."reviews" as PERMISSIVE for ALL to "authenticated" using (is_admin()) with check (is_admin());

create policy "public read approved reviews" on public."reviews" as PERMISSIVE for SELECT to public using ((is_approved = true));

create policy "admin manage orders" on public."orders" as PERMISSIVE for ALL to "authenticated" using (is_admin()) with check (is_admin());

create policy "admin manage media assets" on public."media_assets" as PERMISSIVE for ALL to "authenticated" using (is_admin()) with check (is_admin());

create policy "public read active media assets" on public."media_assets" as PERMISSIVE for SELECT to "anon" using ((is_active = true));

create policy "admin create order status history" on public."order_status_history" as PERMISSIVE for INSERT to "authenticated" with check (is_admin());

create policy "admin read order status history" on public."order_status_history" as PERMISSIVE for SELECT to "authenticated" using (is_admin());

create policy "event guests request places" on public."christmas_event_requests" as PERMISSIVE for INSERT to "anon","authenticated" with check (((status = 'requested'::text) AND (staff_notes IS NULL) AND ((requested_places >= 1) AND (requested_places <= 8)) AND ((consent_at >= (now() - '00:05:00'::interval)) AND (consent_at <= now())) AND (EXISTS ( SELECT 1
   FROM christmas_event_config c
  WHERE ((c.event_key = christmas_event_requests.event_key) AND c.requests_open)))));

create policy "staff see event requests" on public."christmas_event_requests" as PERMISSIVE for SELECT to "authenticated" using (is_admin());

create policy "staff update event requests" on public."christmas_event_requests" as PERMISSIVE for UPDATE to "authenticated" using (is_admin()) with check (is_admin());

create policy "staff read sandbox payments" on public."payment_attempts" as PERMISSIVE for SELECT to "authenticated" using (( SELECT is_admin() AS is_admin));

create policy "public read christmas event" on public."christmas_event_config" as PERMISSIVE for SELECT to "anon","authenticated" using (true);

create policy "staff edit christmas event" on public."christmas_event_config" as PERMISSIVE for UPDATE to "authenticated" using (( SELECT is_manager() AS is_manager)) with check (( SELECT is_manager() AS is_manager));

create policy "service manages request budgets" on public."order_request_limits" as PERMISSIVE for ALL to "service_role" using (true) with check (true);

create policy "staff read sandbox payment events" on public."payment_events" as PERMISSIVE for SELECT to "authenticated" using (( SELECT is_admin() AS is_admin));

revoke all on all tables in schema public from public,anon,authenticated,service_role;

revoke all on all sequences in schema public from public,anon,authenticated,service_role;

revoke all on all functions in schema public from public,anon,authenticated,service_role;

grant INSERT on table public."product_catalog" to "anon";

grant SELECT on table public."product_catalog" to "anon";

grant UPDATE on table public."product_catalog" to "anon";

grant DELETE on table public."product_catalog" to "anon";

grant TRUNCATE on table public."product_catalog" to "anon";

grant REFERENCES on table public."product_catalog" to "anon";

grant TRIGGER on table public."product_catalog" to "anon";

grant MAINTAIN on table public."product_catalog" to "anon";

grant INSERT on table public."product_catalog" to "authenticated";

grant SELECT on table public."product_catalog" to "authenticated";

grant UPDATE on table public."product_catalog" to "authenticated";

grant DELETE on table public."product_catalog" to "authenticated";

grant TRUNCATE on table public."product_catalog" to "authenticated";

grant REFERENCES on table public."product_catalog" to "authenticated";

grant TRIGGER on table public."product_catalog" to "authenticated";

grant MAINTAIN on table public."product_catalog" to "authenticated";

grant INSERT on table public."product_catalog" to "service_role";

grant SELECT on table public."product_catalog" to "service_role";

grant UPDATE on table public."product_catalog" to "service_role";

grant DELETE on table public."product_catalog" to "service_role";

grant TRUNCATE on table public."product_catalog" to "service_role";

grant REFERENCES on table public."product_catalog" to "service_role";

grant TRIGGER on table public."product_catalog" to "service_role";

grant MAINTAIN on table public."product_catalog" to "service_role";

grant INSERT on table public."profiles" to "anon";

grant SELECT on table public."profiles" to "anon";

grant UPDATE on table public."profiles" to "anon";

grant DELETE on table public."profiles" to "anon";

grant TRUNCATE on table public."profiles" to "anon";

grant REFERENCES on table public."profiles" to "anon";

grant TRIGGER on table public."profiles" to "anon";

grant MAINTAIN on table public."profiles" to "anon";

grant INSERT on table public."profiles" to "authenticated";

grant SELECT on table public."profiles" to "authenticated";

grant UPDATE on table public."profiles" to "authenticated";

grant DELETE on table public."profiles" to "authenticated";

grant TRUNCATE on table public."profiles" to "authenticated";

grant REFERENCES on table public."profiles" to "authenticated";

grant TRIGGER on table public."profiles" to "authenticated";

grant MAINTAIN on table public."profiles" to "authenticated";

grant INSERT on table public."profiles" to "service_role";

grant SELECT on table public."profiles" to "service_role";

grant UPDATE on table public."profiles" to "service_role";

grant DELETE on table public."profiles" to "service_role";

grant TRUNCATE on table public."profiles" to "service_role";

grant REFERENCES on table public."profiles" to "service_role";

grant TRIGGER on table public."profiles" to "service_role";

grant MAINTAIN on table public."profiles" to "service_role";

grant INSERT on table public."languages" to "anon";

grant SELECT on table public."languages" to "anon";

grant UPDATE on table public."languages" to "anon";

grant DELETE on table public."languages" to "anon";

grant TRUNCATE on table public."languages" to "anon";

grant REFERENCES on table public."languages" to "anon";

grant TRIGGER on table public."languages" to "anon";

grant MAINTAIN on table public."languages" to "anon";

grant INSERT on table public."languages" to "authenticated";

grant SELECT on table public."languages" to "authenticated";

grant UPDATE on table public."languages" to "authenticated";

grant DELETE on table public."languages" to "authenticated";

grant TRUNCATE on table public."languages" to "authenticated";

grant REFERENCES on table public."languages" to "authenticated";

grant TRIGGER on table public."languages" to "authenticated";

grant MAINTAIN on table public."languages" to "authenticated";

grant INSERT on table public."languages" to "service_role";

grant SELECT on table public."languages" to "service_role";

grant UPDATE on table public."languages" to "service_role";

grant DELETE on table public."languages" to "service_role";

grant TRUNCATE on table public."languages" to "service_role";

grant REFERENCES on table public."languages" to "service_role";

grant TRIGGER on table public."languages" to "service_role";

grant MAINTAIN on table public."languages" to "service_role";

grant INSERT on table public."currencies" to "anon";

grant SELECT on table public."currencies" to "anon";

grant UPDATE on table public."currencies" to "anon";

grant DELETE on table public."currencies" to "anon";

grant TRUNCATE on table public."currencies" to "anon";

grant REFERENCES on table public."currencies" to "anon";

grant TRIGGER on table public."currencies" to "anon";

grant MAINTAIN on table public."currencies" to "anon";

grant INSERT on table public."currencies" to "authenticated";

grant SELECT on table public."currencies" to "authenticated";

grant UPDATE on table public."currencies" to "authenticated";

grant DELETE on table public."currencies" to "authenticated";

grant TRUNCATE on table public."currencies" to "authenticated";

grant REFERENCES on table public."currencies" to "authenticated";

grant TRIGGER on table public."currencies" to "authenticated";

grant MAINTAIN on table public."currencies" to "authenticated";

grant INSERT on table public."currencies" to "service_role";

grant SELECT on table public."currencies" to "service_role";

grant UPDATE on table public."currencies" to "service_role";

grant DELETE on table public."currencies" to "service_role";

grant TRUNCATE on table public."currencies" to "service_role";

grant REFERENCES on table public."currencies" to "service_role";

grant TRIGGER on table public."currencies" to "service_role";

grant MAINTAIN on table public."currencies" to "service_role";

grant INSERT on table public."settings" to "anon";

grant SELECT on table public."settings" to "anon";

grant UPDATE on table public."settings" to "anon";

grant DELETE on table public."settings" to "anon";

grant TRUNCATE on table public."settings" to "anon";

grant REFERENCES on table public."settings" to "anon";

grant TRIGGER on table public."settings" to "anon";

grant MAINTAIN on table public."settings" to "anon";

grant INSERT on table public."settings" to "authenticated";

grant SELECT on table public."settings" to "authenticated";

grant UPDATE on table public."settings" to "authenticated";

grant DELETE on table public."settings" to "authenticated";

grant TRUNCATE on table public."settings" to "authenticated";

grant REFERENCES on table public."settings" to "authenticated";

grant TRIGGER on table public."settings" to "authenticated";

grant MAINTAIN on table public."settings" to "authenticated";

grant INSERT on table public."settings" to "service_role";

grant SELECT on table public."settings" to "service_role";

grant UPDATE on table public."settings" to "service_role";

grant DELETE on table public."settings" to "service_role";

grant TRUNCATE on table public."settings" to "service_role";

grant REFERENCES on table public."settings" to "service_role";

grant TRIGGER on table public."settings" to "service_role";

grant MAINTAIN on table public."settings" to "service_role";

grant INSERT on table public."categories" to "anon";

grant SELECT on table public."categories" to "anon";

grant UPDATE on table public."categories" to "anon";

grant DELETE on table public."categories" to "anon";

grant TRUNCATE on table public."categories" to "anon";

grant REFERENCES on table public."categories" to "anon";

grant TRIGGER on table public."categories" to "anon";

grant MAINTAIN on table public."categories" to "anon";

grant INSERT on table public."categories" to "authenticated";

grant SELECT on table public."categories" to "authenticated";

grant UPDATE on table public."categories" to "authenticated";

grant DELETE on table public."categories" to "authenticated";

grant TRUNCATE on table public."categories" to "authenticated";

grant REFERENCES on table public."categories" to "authenticated";

grant TRIGGER on table public."categories" to "authenticated";

grant MAINTAIN on table public."categories" to "authenticated";

grant INSERT on table public."categories" to "service_role";

grant SELECT on table public."categories" to "service_role";

grant UPDATE on table public."categories" to "service_role";

grant DELETE on table public."categories" to "service_role";

grant TRUNCATE on table public."categories" to "service_role";

grant REFERENCES on table public."categories" to "service_role";

grant TRIGGER on table public."categories" to "service_role";

grant MAINTAIN on table public."categories" to "service_role";

grant INSERT on table public."collections" to "anon";

grant SELECT on table public."collections" to "anon";

grant UPDATE on table public."collections" to "anon";

grant DELETE on table public."collections" to "anon";

grant TRUNCATE on table public."collections" to "anon";

grant REFERENCES on table public."collections" to "anon";

grant TRIGGER on table public."collections" to "anon";

grant MAINTAIN on table public."collections" to "anon";

grant INSERT on table public."collections" to "authenticated";

grant SELECT on table public."collections" to "authenticated";

grant UPDATE on table public."collections" to "authenticated";

grant DELETE on table public."collections" to "authenticated";

grant TRUNCATE on table public."collections" to "authenticated";

grant REFERENCES on table public."collections" to "authenticated";

grant TRIGGER on table public."collections" to "authenticated";

grant MAINTAIN on table public."collections" to "authenticated";

grant INSERT on table public."collections" to "service_role";

grant SELECT on table public."collections" to "service_role";

grant UPDATE on table public."collections" to "service_role";

grant DELETE on table public."collections" to "service_role";

grant TRUNCATE on table public."collections" to "service_role";

grant REFERENCES on table public."collections" to "service_role";

grant TRIGGER on table public."collections" to "service_role";

grant MAINTAIN on table public."collections" to "service_role";

grant INSERT on table public."product_collections" to "anon";

grant SELECT on table public."product_collections" to "anon";

grant UPDATE on table public."product_collections" to "anon";

grant DELETE on table public."product_collections" to "anon";

grant TRUNCATE on table public."product_collections" to "anon";

grant REFERENCES on table public."product_collections" to "anon";

grant TRIGGER on table public."product_collections" to "anon";

grant MAINTAIN on table public."product_collections" to "anon";

grant INSERT on table public."product_collections" to "authenticated";

grant SELECT on table public."product_collections" to "authenticated";

grant UPDATE on table public."product_collections" to "authenticated";

grant DELETE on table public."product_collections" to "authenticated";

grant TRUNCATE on table public."product_collections" to "authenticated";

grant REFERENCES on table public."product_collections" to "authenticated";

grant TRIGGER on table public."product_collections" to "authenticated";

grant MAINTAIN on table public."product_collections" to "authenticated";

grant INSERT on table public."product_collections" to "service_role";

grant SELECT on table public."product_collections" to "service_role";

grant UPDATE on table public."product_collections" to "service_role";

grant DELETE on table public."product_collections" to "service_role";

grant TRUNCATE on table public."product_collections" to "service_role";

grant REFERENCES on table public."product_collections" to "service_role";

grant TRIGGER on table public."product_collections" to "service_role";

grant MAINTAIN on table public."product_collections" to "service_role";

grant INSERT on table public."product_images" to "anon";

grant SELECT on table public."product_images" to "anon";

grant UPDATE on table public."product_images" to "anon";

grant DELETE on table public."product_images" to "anon";

grant TRUNCATE on table public."product_images" to "anon";

grant REFERENCES on table public."product_images" to "anon";

grant TRIGGER on table public."product_images" to "anon";

grant MAINTAIN on table public."product_images" to "anon";

grant INSERT on table public."product_images" to "authenticated";

grant SELECT on table public."product_images" to "authenticated";

grant UPDATE on table public."product_images" to "authenticated";

grant DELETE on table public."product_images" to "authenticated";

grant TRUNCATE on table public."product_images" to "authenticated";

grant REFERENCES on table public."product_images" to "authenticated";

grant TRIGGER on table public."product_images" to "authenticated";

grant MAINTAIN on table public."product_images" to "authenticated";

grant INSERT on table public."product_images" to "service_role";

grant SELECT on table public."product_images" to "service_role";

grant UPDATE on table public."product_images" to "service_role";

grant DELETE on table public."product_images" to "service_role";

grant TRUNCATE on table public."product_images" to "service_role";

grant REFERENCES on table public."product_images" to "service_role";

grant TRIGGER on table public."product_images" to "service_role";

grant MAINTAIN on table public."product_images" to "service_role";

grant INSERT on table public."customers" to "anon";

grant SELECT on table public."customers" to "anon";

grant UPDATE on table public."customers" to "anon";

grant DELETE on table public."customers" to "anon";

grant TRUNCATE on table public."customers" to "anon";

grant REFERENCES on table public."customers" to "anon";

grant TRIGGER on table public."customers" to "anon";

grant MAINTAIN on table public."customers" to "anon";

grant INSERT on table public."customers" to "authenticated";

grant SELECT on table public."customers" to "authenticated";

grant UPDATE on table public."customers" to "authenticated";

grant DELETE on table public."customers" to "authenticated";

grant TRUNCATE on table public."customers" to "authenticated";

grant REFERENCES on table public."customers" to "authenticated";

grant TRIGGER on table public."customers" to "authenticated";

grant MAINTAIN on table public."customers" to "authenticated";

grant INSERT on table public."customers" to "service_role";

grant SELECT on table public."customers" to "service_role";

grant UPDATE on table public."customers" to "service_role";

grant DELETE on table public."customers" to "service_role";

grant TRUNCATE on table public."customers" to "service_role";

grant REFERENCES on table public."customers" to "service_role";

grant TRIGGER on table public."customers" to "service_role";

grant MAINTAIN on table public."customers" to "service_role";

grant INSERT on table public."coupons" to "anon";

grant SELECT on table public."coupons" to "anon";

grant UPDATE on table public."coupons" to "anon";

grant DELETE on table public."coupons" to "anon";

grant TRUNCATE on table public."coupons" to "anon";

grant REFERENCES on table public."coupons" to "anon";

grant TRIGGER on table public."coupons" to "anon";

grant MAINTAIN on table public."coupons" to "anon";

grant INSERT on table public."coupons" to "authenticated";

grant SELECT on table public."coupons" to "authenticated";

grant UPDATE on table public."coupons" to "authenticated";

grant DELETE on table public."coupons" to "authenticated";

grant TRUNCATE on table public."coupons" to "authenticated";

grant REFERENCES on table public."coupons" to "authenticated";

grant TRIGGER on table public."coupons" to "authenticated";

grant MAINTAIN on table public."coupons" to "authenticated";

grant INSERT on table public."coupons" to "service_role";

grant SELECT on table public."coupons" to "service_role";

grant UPDATE on table public."coupons" to "service_role";

grant DELETE on table public."coupons" to "service_role";

grant TRUNCATE on table public."coupons" to "service_role";

grant REFERENCES on table public."coupons" to "service_role";

grant TRIGGER on table public."coupons" to "service_role";

grant MAINTAIN on table public."coupons" to "service_role";

grant INSERT on table public."banners" to "anon";

grant SELECT on table public."banners" to "anon";

grant UPDATE on table public."banners" to "anon";

grant DELETE on table public."banners" to "anon";

grant TRUNCATE on table public."banners" to "anon";

grant REFERENCES on table public."banners" to "anon";

grant TRIGGER on table public."banners" to "anon";

grant MAINTAIN on table public."banners" to "anon";

grant INSERT on table public."banners" to "authenticated";

grant SELECT on table public."banners" to "authenticated";

grant UPDATE on table public."banners" to "authenticated";

grant DELETE on table public."banners" to "authenticated";

grant TRUNCATE on table public."banners" to "authenticated";

grant REFERENCES on table public."banners" to "authenticated";

grant TRIGGER on table public."banners" to "authenticated";

grant MAINTAIN on table public."banners" to "authenticated";

grant INSERT on table public."banners" to "service_role";

grant SELECT on table public."banners" to "service_role";

grant UPDATE on table public."banners" to "service_role";

grant DELETE on table public."banners" to "service_role";

grant TRUNCATE on table public."banners" to "service_role";

grant REFERENCES on table public."banners" to "service_role";

grant TRIGGER on table public."banners" to "service_role";

grant MAINTAIN on table public."banners" to "service_role";

grant INSERT on table public."homepage_sections" to "anon";

grant SELECT on table public."homepage_sections" to "anon";

grant UPDATE on table public."homepage_sections" to "anon";

grant DELETE on table public."homepage_sections" to "anon";

grant TRUNCATE on table public."homepage_sections" to "anon";

grant REFERENCES on table public."homepage_sections" to "anon";

grant TRIGGER on table public."homepage_sections" to "anon";

grant MAINTAIN on table public."homepage_sections" to "anon";

grant INSERT on table public."homepage_sections" to "authenticated";

grant SELECT on table public."homepage_sections" to "authenticated";

grant UPDATE on table public."homepage_sections" to "authenticated";

grant DELETE on table public."homepage_sections" to "authenticated";

grant TRUNCATE on table public."homepage_sections" to "authenticated";

grant REFERENCES on table public."homepage_sections" to "authenticated";

grant TRIGGER on table public."homepage_sections" to "authenticated";

grant MAINTAIN on table public."homepage_sections" to "authenticated";

grant INSERT on table public."homepage_sections" to "service_role";

grant SELECT on table public."homepage_sections" to "service_role";

grant UPDATE on table public."homepage_sections" to "service_role";

grant DELETE on table public."homepage_sections" to "service_role";

grant TRUNCATE on table public."homepage_sections" to "service_role";

grant REFERENCES on table public."homepage_sections" to "service_role";

grant TRIGGER on table public."homepage_sections" to "service_role";

grant MAINTAIN on table public."homepage_sections" to "service_role";

grant INSERT on table public."faq" to "anon";

grant SELECT on table public."faq" to "anon";

grant UPDATE on table public."faq" to "anon";

grant DELETE on table public."faq" to "anon";

grant TRUNCATE on table public."faq" to "anon";

grant REFERENCES on table public."faq" to "anon";

grant TRIGGER on table public."faq" to "anon";

grant MAINTAIN on table public."faq" to "anon";

grant INSERT on table public."faq" to "authenticated";

grant SELECT on table public."faq" to "authenticated";

grant UPDATE on table public."faq" to "authenticated";

grant DELETE on table public."faq" to "authenticated";

grant TRUNCATE on table public."faq" to "authenticated";

grant REFERENCES on table public."faq" to "authenticated";

grant TRIGGER on table public."faq" to "authenticated";

grant MAINTAIN on table public."faq" to "authenticated";

grant INSERT on table public."faq" to "service_role";

grant SELECT on table public."faq" to "service_role";

grant UPDATE on table public."faq" to "service_role";

grant DELETE on table public."faq" to "service_role";

grant TRUNCATE on table public."faq" to "service_role";

grant REFERENCES on table public."faq" to "service_role";

grant TRIGGER on table public."faq" to "service_role";

grant MAINTAIN on table public."faq" to "service_role";

grant INSERT on table public."testimonials" to "anon";

grant SELECT on table public."testimonials" to "anon";

grant UPDATE on table public."testimonials" to "anon";

grant DELETE on table public."testimonials" to "anon";

grant TRUNCATE on table public."testimonials" to "anon";

grant REFERENCES on table public."testimonials" to "anon";

grant TRIGGER on table public."testimonials" to "anon";

grant MAINTAIN on table public."testimonials" to "anon";

grant INSERT on table public."testimonials" to "authenticated";

grant SELECT on table public."testimonials" to "authenticated";

grant UPDATE on table public."testimonials" to "authenticated";

grant DELETE on table public."testimonials" to "authenticated";

grant TRUNCATE on table public."testimonials" to "authenticated";

grant REFERENCES on table public."testimonials" to "authenticated";

grant TRIGGER on table public."testimonials" to "authenticated";

grant MAINTAIN on table public."testimonials" to "authenticated";

grant INSERT on table public."testimonials" to "service_role";

grant SELECT on table public."testimonials" to "service_role";

grant UPDATE on table public."testimonials" to "service_role";

grant DELETE on table public."testimonials" to "service_role";

grant TRUNCATE on table public."testimonials" to "service_role";

grant REFERENCES on table public."testimonials" to "service_role";

grant TRIGGER on table public."testimonials" to "service_role";

grant MAINTAIN on table public."testimonials" to "service_role";

grant INSERT on table public."analytics_events" to "anon";

grant SELECT on table public."analytics_events" to "anon";

grant UPDATE on table public."analytics_events" to "anon";

grant DELETE on table public."analytics_events" to "anon";

grant TRUNCATE on table public."analytics_events" to "anon";

grant REFERENCES on table public."analytics_events" to "anon";

grant TRIGGER on table public."analytics_events" to "anon";

grant MAINTAIN on table public."analytics_events" to "anon";

grant INSERT on table public."analytics_events" to "authenticated";

grant SELECT on table public."analytics_events" to "authenticated";

grant UPDATE on table public."analytics_events" to "authenticated";

grant DELETE on table public."analytics_events" to "authenticated";

grant TRUNCATE on table public."analytics_events" to "authenticated";

grant REFERENCES on table public."analytics_events" to "authenticated";

grant TRIGGER on table public."analytics_events" to "authenticated";

grant MAINTAIN on table public."analytics_events" to "authenticated";

grant INSERT on table public."analytics_events" to "service_role";

grant SELECT on table public."analytics_events" to "service_role";

grant UPDATE on table public."analytics_events" to "service_role";

grant DELETE on table public."analytics_events" to "service_role";

grant TRUNCATE on table public."analytics_events" to "service_role";

grant REFERENCES on table public."analytics_events" to "service_role";

grant TRIGGER on table public."analytics_events" to "service_role";

grant MAINTAIN on table public."analytics_events" to "service_role";

grant INSERT on table public."activity_logs" to "anon";

grant SELECT on table public."activity_logs" to "anon";

grant UPDATE on table public."activity_logs" to "anon";

grant DELETE on table public."activity_logs" to "anon";

grant TRUNCATE on table public."activity_logs" to "anon";

grant REFERENCES on table public."activity_logs" to "anon";

grant TRIGGER on table public."activity_logs" to "anon";

grant MAINTAIN on table public."activity_logs" to "anon";

grant INSERT on table public."activity_logs" to "authenticated";

grant SELECT on table public."activity_logs" to "authenticated";

grant UPDATE on table public."activity_logs" to "authenticated";

grant DELETE on table public."activity_logs" to "authenticated";

grant TRUNCATE on table public."activity_logs" to "authenticated";

grant REFERENCES on table public."activity_logs" to "authenticated";

grant TRIGGER on table public."activity_logs" to "authenticated";

grant MAINTAIN on table public."activity_logs" to "authenticated";

grant INSERT on table public."activity_logs" to "service_role";

grant SELECT on table public."activity_logs" to "service_role";

grant UPDATE on table public."activity_logs" to "service_role";

grant DELETE on table public."activity_logs" to "service_role";

grant TRUNCATE on table public."activity_logs" to "service_role";

grant REFERENCES on table public."activity_logs" to "service_role";

grant TRIGGER on table public."activity_logs" to "service_role";

grant MAINTAIN on table public."activity_logs" to "service_role";

grant INSERT on table public."products" to "anon";

grant SELECT on table public."products" to "anon";

grant UPDATE on table public."products" to "anon";

grant DELETE on table public."products" to "anon";

grant TRUNCATE on table public."products" to "anon";

grant REFERENCES on table public."products" to "anon";

grant TRIGGER on table public."products" to "anon";

grant MAINTAIN on table public."products" to "anon";

grant INSERT on table public."products" to "authenticated";

grant SELECT on table public."products" to "authenticated";

grant UPDATE on table public."products" to "authenticated";

grant DELETE on table public."products" to "authenticated";

grant TRUNCATE on table public."products" to "authenticated";

grant REFERENCES on table public."products" to "authenticated";

grant TRIGGER on table public."products" to "authenticated";

grant MAINTAIN on table public."products" to "authenticated";

grant INSERT on table public."products" to "service_role";

grant SELECT on table public."products" to "service_role";

grant UPDATE on table public."products" to "service_role";

grant DELETE on table public."products" to "service_role";

grant TRUNCATE on table public."products" to "service_role";

grant REFERENCES on table public."products" to "service_role";

grant TRIGGER on table public."products" to "service_role";

grant MAINTAIN on table public."products" to "service_role";

grant INSERT on table public."order_items" to "anon";

grant SELECT on table public."order_items" to "anon";

grant UPDATE on table public."order_items" to "anon";

grant DELETE on table public."order_items" to "anon";

grant TRUNCATE on table public."order_items" to "anon";

grant REFERENCES on table public."order_items" to "anon";

grant TRIGGER on table public."order_items" to "anon";

grant MAINTAIN on table public."order_items" to "anon";

grant INSERT on table public."order_items" to "authenticated";

grant SELECT on table public."order_items" to "authenticated";

grant UPDATE on table public."order_items" to "authenticated";

grant DELETE on table public."order_items" to "authenticated";

grant TRUNCATE on table public."order_items" to "authenticated";

grant REFERENCES on table public."order_items" to "authenticated";

grant TRIGGER on table public."order_items" to "authenticated";

grant MAINTAIN on table public."order_items" to "authenticated";

grant INSERT on table public."order_items" to "service_role";

grant SELECT on table public."order_items" to "service_role";

grant UPDATE on table public."order_items" to "service_role";

grant DELETE on table public."order_items" to "service_role";

grant TRUNCATE on table public."order_items" to "service_role";

grant REFERENCES on table public."order_items" to "service_role";

grant TRIGGER on table public."order_items" to "service_role";

grant MAINTAIN on table public."order_items" to "service_role";

grant INSERT on table public."product_variants" to "anon";

grant SELECT on table public."product_variants" to "anon";

grant UPDATE on table public."product_variants" to "anon";

grant DELETE on table public."product_variants" to "anon";

grant TRUNCATE on table public."product_variants" to "anon";

grant REFERENCES on table public."product_variants" to "anon";

grant TRIGGER on table public."product_variants" to "anon";

grant MAINTAIN on table public."product_variants" to "anon";

grant INSERT on table public."product_variants" to "authenticated";

grant SELECT on table public."product_variants" to "authenticated";

grant UPDATE on table public."product_variants" to "authenticated";

grant DELETE on table public."product_variants" to "authenticated";

grant TRUNCATE on table public."product_variants" to "authenticated";

grant REFERENCES on table public."product_variants" to "authenticated";

grant TRIGGER on table public."product_variants" to "authenticated";

grant MAINTAIN on table public."product_variants" to "authenticated";

grant INSERT on table public."product_variants" to "service_role";

grant SELECT on table public."product_variants" to "service_role";

grant UPDATE on table public."product_variants" to "service_role";

grant DELETE on table public."product_variants" to "service_role";

grant TRUNCATE on table public."product_variants" to "service_role";

grant REFERENCES on table public."product_variants" to "service_role";

grant TRIGGER on table public."product_variants" to "service_role";

grant MAINTAIN on table public."product_variants" to "service_role";

grant INSERT on table public."reviews" to "anon";

grant SELECT on table public."reviews" to "anon";

grant UPDATE on table public."reviews" to "anon";

grant DELETE on table public."reviews" to "anon";

grant TRUNCATE on table public."reviews" to "anon";

grant REFERENCES on table public."reviews" to "anon";

grant TRIGGER on table public."reviews" to "anon";

grant MAINTAIN on table public."reviews" to "anon";

grant INSERT on table public."reviews" to "authenticated";

grant SELECT on table public."reviews" to "authenticated";

grant UPDATE on table public."reviews" to "authenticated";

grant DELETE on table public."reviews" to "authenticated";

grant TRUNCATE on table public."reviews" to "authenticated";

grant REFERENCES on table public."reviews" to "authenticated";

grant TRIGGER on table public."reviews" to "authenticated";

grant MAINTAIN on table public."reviews" to "authenticated";

grant INSERT on table public."reviews" to "service_role";

grant SELECT on table public."reviews" to "service_role";

grant UPDATE on table public."reviews" to "service_role";

grant DELETE on table public."reviews" to "service_role";

grant TRUNCATE on table public."reviews" to "service_role";

grant REFERENCES on table public."reviews" to "service_role";

grant TRIGGER on table public."reviews" to "service_role";

grant MAINTAIN on table public."reviews" to "service_role";

grant INSERT on table public."dashboard_summary" to "authenticated";

grant SELECT on table public."dashboard_summary" to "authenticated";

grant UPDATE on table public."dashboard_summary" to "authenticated";

grant DELETE on table public."dashboard_summary" to "authenticated";

grant TRUNCATE on table public."dashboard_summary" to "authenticated";

grant REFERENCES on table public."dashboard_summary" to "authenticated";

grant TRIGGER on table public."dashboard_summary" to "authenticated";

grant MAINTAIN on table public."dashboard_summary" to "authenticated";

grant INSERT on table public."dashboard_summary" to "service_role";

grant SELECT on table public."dashboard_summary" to "service_role";

grant UPDATE on table public."dashboard_summary" to "service_role";

grant DELETE on table public."dashboard_summary" to "service_role";

grant TRUNCATE on table public."dashboard_summary" to "service_role";

grant REFERENCES on table public."dashboard_summary" to "service_role";

grant TRIGGER on table public."dashboard_summary" to "service_role";

grant MAINTAIN on table public."dashboard_summary" to "service_role";

grant INSERT on table public."orders" to "anon";

grant SELECT on table public."orders" to "anon";

grant UPDATE on table public."orders" to "anon";

grant DELETE on table public."orders" to "anon";

grant TRUNCATE on table public."orders" to "anon";

grant REFERENCES on table public."orders" to "anon";

grant TRIGGER on table public."orders" to "anon";

grant MAINTAIN on table public."orders" to "anon";

grant INSERT on table public."orders" to "authenticated";

grant SELECT on table public."orders" to "authenticated";

grant UPDATE on table public."orders" to "authenticated";

grant DELETE on table public."orders" to "authenticated";

grant TRUNCATE on table public."orders" to "authenticated";

grant REFERENCES on table public."orders" to "authenticated";

grant TRIGGER on table public."orders" to "authenticated";

grant MAINTAIN on table public."orders" to "authenticated";

grant INSERT on table public."orders" to "service_role";

grant SELECT on table public."orders" to "service_role";

grant UPDATE on table public."orders" to "service_role";

grant DELETE on table public."orders" to "service_role";

grant TRUNCATE on table public."orders" to "service_role";

grant REFERENCES on table public."orders" to "service_role";

grant TRIGGER on table public."orders" to "service_role";

grant MAINTAIN on table public."orders" to "service_role";

grant INSERT on table public."admin_order_overview" to "authenticated";

grant SELECT on table public."admin_order_overview" to "authenticated";

grant UPDATE on table public."admin_order_overview" to "authenticated";

grant DELETE on table public."admin_order_overview" to "authenticated";

grant TRUNCATE on table public."admin_order_overview" to "authenticated";

grant REFERENCES on table public."admin_order_overview" to "authenticated";

grant TRIGGER on table public."admin_order_overview" to "authenticated";

grant MAINTAIN on table public."admin_order_overview" to "authenticated";

grant INSERT on table public."admin_order_overview" to "service_role";

grant SELECT on table public."admin_order_overview" to "service_role";

grant UPDATE on table public."admin_order_overview" to "service_role";

grant DELETE on table public."admin_order_overview" to "service_role";

grant TRUNCATE on table public."admin_order_overview" to "service_role";

grant REFERENCES on table public."admin_order_overview" to "service_role";

grant TRIGGER on table public."admin_order_overview" to "service_role";

grant MAINTAIN on table public."admin_order_overview" to "service_role";

grant INSERT on table public."admin_product_overview" to "authenticated";

grant SELECT on table public."admin_product_overview" to "authenticated";

grant UPDATE on table public."admin_product_overview" to "authenticated";

grant DELETE on table public."admin_product_overview" to "authenticated";

grant TRUNCATE on table public."admin_product_overview" to "authenticated";

grant REFERENCES on table public."admin_product_overview" to "authenticated";

grant TRIGGER on table public."admin_product_overview" to "authenticated";

grant MAINTAIN on table public."admin_product_overview" to "authenticated";

grant INSERT on table public."admin_product_overview" to "service_role";

grant SELECT on table public."admin_product_overview" to "service_role";

grant UPDATE on table public."admin_product_overview" to "service_role";

grant DELETE on table public."admin_product_overview" to "service_role";

grant TRUNCATE on table public."admin_product_overview" to "service_role";

grant REFERENCES on table public."admin_product_overview" to "service_role";

grant TRIGGER on table public."admin_product_overview" to "service_role";

grant MAINTAIN on table public."admin_product_overview" to "service_role";

grant INSERT on table public."media_assets" to "anon";

grant SELECT on table public."media_assets" to "anon";

grant UPDATE on table public."media_assets" to "anon";

grant DELETE on table public."media_assets" to "anon";

grant TRUNCATE on table public."media_assets" to "anon";

grant REFERENCES on table public."media_assets" to "anon";

grant TRIGGER on table public."media_assets" to "anon";

grant MAINTAIN on table public."media_assets" to "anon";

grant INSERT on table public."media_assets" to "authenticated";

grant SELECT on table public."media_assets" to "authenticated";

grant UPDATE on table public."media_assets" to "authenticated";

grant DELETE on table public."media_assets" to "authenticated";

grant TRUNCATE on table public."media_assets" to "authenticated";

grant REFERENCES on table public."media_assets" to "authenticated";

grant TRIGGER on table public."media_assets" to "authenticated";

grant MAINTAIN on table public."media_assets" to "authenticated";

grant INSERT on table public."media_assets" to "service_role";

grant SELECT on table public."media_assets" to "service_role";

grant UPDATE on table public."media_assets" to "service_role";

grant DELETE on table public."media_assets" to "service_role";

grant TRUNCATE on table public."media_assets" to "service_role";

grant REFERENCES on table public."media_assets" to "service_role";

grant TRIGGER on table public."media_assets" to "service_role";

grant MAINTAIN on table public."media_assets" to "service_role";

grant INSERT on table public."order_status_history" to "anon";

grant SELECT on table public."order_status_history" to "anon";

grant UPDATE on table public."order_status_history" to "anon";

grant DELETE on table public."order_status_history" to "anon";

grant TRUNCATE on table public."order_status_history" to "anon";

grant REFERENCES on table public."order_status_history" to "anon";

grant TRIGGER on table public."order_status_history" to "anon";

grant MAINTAIN on table public."order_status_history" to "anon";

grant INSERT on table public."order_status_history" to "authenticated";

grant SELECT on table public."order_status_history" to "authenticated";

grant UPDATE on table public."order_status_history" to "authenticated";

grant DELETE on table public."order_status_history" to "authenticated";

grant TRUNCATE on table public."order_status_history" to "authenticated";

grant REFERENCES on table public."order_status_history" to "authenticated";

grant TRIGGER on table public."order_status_history" to "authenticated";

grant MAINTAIN on table public."order_status_history" to "authenticated";

grant INSERT on table public."order_status_history" to "service_role";

grant SELECT on table public."order_status_history" to "service_role";

grant UPDATE on table public."order_status_history" to "service_role";

grant DELETE on table public."order_status_history" to "service_role";

grant TRUNCATE on table public."order_status_history" to "service_role";

grant REFERENCES on table public."order_status_history" to "service_role";

grant TRIGGER on table public."order_status_history" to "service_role";

grant MAINTAIN on table public."order_status_history" to "service_role";

grant SELECT on table public."christmas_event_requests" to "anon";

grant UPDATE on table public."christmas_event_requests" to "anon";

grant DELETE on table public."christmas_event_requests" to "anon";

grant TRUNCATE on table public."christmas_event_requests" to "anon";

grant REFERENCES on table public."christmas_event_requests" to "anon";

grant TRIGGER on table public."christmas_event_requests" to "anon";

grant MAINTAIN on table public."christmas_event_requests" to "anon";

grant SELECT on table public."christmas_event_requests" to "authenticated";

grant UPDATE on table public."christmas_event_requests" to "authenticated";

grant DELETE on table public."christmas_event_requests" to "authenticated";

grant TRUNCATE on table public."christmas_event_requests" to "authenticated";

grant REFERENCES on table public."christmas_event_requests" to "authenticated";

grant TRIGGER on table public."christmas_event_requests" to "authenticated";

grant MAINTAIN on table public."christmas_event_requests" to "authenticated";

grant INSERT on table public."christmas_event_requests" to "service_role";

grant SELECT on table public."christmas_event_requests" to "service_role";

grant UPDATE on table public."christmas_event_requests" to "service_role";

grant DELETE on table public."christmas_event_requests" to "service_role";

grant TRUNCATE on table public."christmas_event_requests" to "service_role";

grant REFERENCES on table public."christmas_event_requests" to "service_role";

grant TRIGGER on table public."christmas_event_requests" to "service_role";

grant MAINTAIN on table public."christmas_event_requests" to "service_role";

grant INSERT on table public."payment_attempts" to "service_role";

grant SELECT on table public."payment_attempts" to "service_role";

grant UPDATE on table public."payment_attempts" to "service_role";

grant DELETE on table public."payment_attempts" to "service_role";

grant TRUNCATE on table public."payment_attempts" to "service_role";

grant REFERENCES on table public."payment_attempts" to "service_role";

grant TRIGGER on table public."payment_attempts" to "service_role";

grant MAINTAIN on table public."payment_attempts" to "service_role";

grant SELECT on table public."payment_attempts" to "authenticated";

grant INSERT on table public."christmas_event_config" to "anon";

grant SELECT on table public."christmas_event_config" to "anon";

grant UPDATE on table public."christmas_event_config" to "anon";

grant DELETE on table public."christmas_event_config" to "anon";

grant TRUNCATE on table public."christmas_event_config" to "anon";

grant REFERENCES on table public."christmas_event_config" to "anon";

grant TRIGGER on table public."christmas_event_config" to "anon";

grant MAINTAIN on table public."christmas_event_config" to "anon";

grant INSERT on table public."christmas_event_config" to "authenticated";

grant SELECT on table public."christmas_event_config" to "authenticated";

grant UPDATE on table public."christmas_event_config" to "authenticated";

grant DELETE on table public."christmas_event_config" to "authenticated";

grant TRUNCATE on table public."christmas_event_config" to "authenticated";

grant REFERENCES on table public."christmas_event_config" to "authenticated";

grant TRIGGER on table public."christmas_event_config" to "authenticated";

grant MAINTAIN on table public."christmas_event_config" to "authenticated";

grant INSERT on table public."christmas_event_config" to "service_role";

grant SELECT on table public."christmas_event_config" to "service_role";

grant UPDATE on table public."christmas_event_config" to "service_role";

grant DELETE on table public."christmas_event_config" to "service_role";

grant TRUNCATE on table public."christmas_event_config" to "service_role";

grant REFERENCES on table public."christmas_event_config" to "service_role";

grant TRIGGER on table public."christmas_event_config" to "service_role";

grant MAINTAIN on table public."christmas_event_config" to "service_role";

grant INSERT on table public."order_request_limits" to "service_role";

grant SELECT on table public."order_request_limits" to "service_role";

grant UPDATE on table public."order_request_limits" to "service_role";

grant DELETE on table public."order_request_limits" to "service_role";

grant TRUNCATE on table public."order_request_limits" to "service_role";

grant REFERENCES on table public."order_request_limits" to "service_role";

grant TRIGGER on table public."order_request_limits" to "service_role";

grant MAINTAIN on table public."order_request_limits" to "service_role";

grant INSERT on table public."event_request_limits" to "service_role";

grant SELECT on table public."event_request_limits" to "service_role";

grant UPDATE on table public."event_request_limits" to "service_role";

grant DELETE on table public."event_request_limits" to "service_role";

grant TRUNCATE on table public."event_request_limits" to "service_role";

grant REFERENCES on table public."event_request_limits" to "service_role";

grant TRIGGER on table public."event_request_limits" to "service_role";

grant MAINTAIN on table public."event_request_limits" to "service_role";

grant INSERT on table public."payment_events" to "service_role";

grant SELECT on table public."payment_events" to "service_role";

grant UPDATE on table public."payment_events" to "service_role";

grant DELETE on table public."payment_events" to "service_role";

grant TRUNCATE on table public."payment_events" to "service_role";

grant REFERENCES on table public."payment_events" to "service_role";

grant TRIGGER on table public."payment_events" to "service_role";

grant MAINTAIN on table public."payment_events" to "service_role";

grant SELECT on table public."payment_events" to "authenticated";

grant SELECT on sequence public."payment_events_id_seq" to "anon";

grant UPDATE on sequence public."payment_events_id_seq" to "anon";

grant USAGE on sequence public."payment_events_id_seq" to "anon";

grant SELECT on sequence public."payment_events_id_seq" to "authenticated";

grant UPDATE on sequence public."payment_events_id_seq" to "authenticated";

grant USAGE on sequence public."payment_events_id_seq" to "authenticated";

grant SELECT on sequence public."payment_events_id_seq" to "service_role";

grant UPDATE on sequence public."payment_events_id_seq" to "service_role";

grant USAGE on sequence public."payment_events_id_seq" to "service_role";

grant execute on function admin_transition_order(uuid,order_status,order_status) to "authenticated";

grant execute on function admin_transition_order(uuid,order_status,order_status) to "service_role";

grant execute on function admin_update_order_status(uuid,order_status) to "service_role";

grant execute on function apply_sandbox_payment(uuid,bigint,bigint,text,text) to "service_role";

grant execute on function audit_staff_operation() to "service_role";

grant execute on function consume_order_request_budget(text) to "service_role";

grant execute on function create_order_request_atomic(uuid,text,text,text,text,jsonb) to "service_role";

grant execute on function create_sandbox_payment(uuid,text,jsonb,jsonb) to "service_role";

grant execute on function generate_order_number() to PUBLIC;

grant execute on function generate_order_number() to "anon";

grant execute on function generate_order_number() to "authenticated";

grant execute on function generate_order_number() to "service_role";

grant execute on function handle_owner_signup() to "service_role";

grant execute on function is_admin() to "authenticated";

grant execute on function is_admin() to "service_role";

grant execute on function is_manager() to "authenticated";

grant execute on function is_manager() to "service_role";

grant execute on function is_super_admin() to "authenticated";

grant execute on function is_super_admin() to "service_role";

grant execute on function rls_auto_enable() to "service_role";

grant execute on function set_updated_at() to PUBLIC;

grant execute on function set_updated_at() to "anon";

grant execute on function set_updated_at() to "authenticated";

grant execute on function set_updated_at() to "service_role";

grant execute on function slugify(text) to PUBLIC;

grant execute on function slugify(text) to "anon";

grant execute on function slugify(text) to "authenticated";

grant execute on function slugify(text) to "service_role";

grant execute on function submit_christmas_request(text,text,text,integer,text) to "service_role";

grant usage on schema public to anon,authenticated,service_role;

set check_function_bodies=on;
