-- Keep extension objects out of the exposed public schema.
create schema if not exists extensions;
alter extension unaccent set schema extensions;

create or replace function public.slugify(input text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(input, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

grant usage on schema extensions to anon, authenticated;
