-- Seasonal Christmas event: interest requests only, NOT paid tickets.
-- No event date, venue, ticket price or capacity has been confirmed.
create table if not exists public.christmas_event_requests (
  id uuid primary key default gen_random_uuid(),
  event_key text not null default 'noel-2026' check (event_key = 'noel-2026'),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  phone text not null check (char_length(btrim(phone)) between 7 and 25),
  email text check (email is null or (char_length(email) <= 254 and email ~* '^[^@ ]+@[^@ ]+\.[^@ ]+$')),
  requested_places smallint not null check (requested_places between 1 and 8),
  consent_at timestamptz not null,
  status text not null default 'requested' check(status in ('requested','contacted','confirmed','cancelled')),
  staff_notes text check (staff_notes is null or char_length(staff_notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists christmas_event_requests_created_idx on public.christmas_event_requests(created_at desc);
create unique index if not exists christmas_event_unique_phone_idx on public.christmas_event_requests(event_key, regexp_replace(phone,'[^0-9+]','','g'))
  where status in ('requested','contacted','confirmed');

alter table public.christmas_event_requests enable row level security;
drop policy if exists "event guests request places" on public.christmas_event_requests;
create policy "event guests request places" on public.christmas_event_requests
  for insert to anon, authenticated with check(
    status = 'requested' and staff_notes is null
    and requested_places between 1 and 8 and consent_at <= now()
  );
drop policy if exists "staff see event requests" on public.christmas_event_requests;
create policy "staff see event requests" on public.christmas_event_requests
  for select to authenticated using (public.is_admin());
drop policy if exists "staff update event requests" on public.christmas_event_requests;
create policy "staff update event requests" on public.christmas_event_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.christmas_event_requests from public;
grant insert on public.christmas_event_requests to anon, authenticated;
grant select, update on public.christmas_event_requests to authenticated;
-- Staff can delete neither requests nor audit entries using the website.

create table if not exists public.christmas_event_config (
  event_key text primary key default 'noel-2026' check(event_key='noel-2026'),
  display_title text not null default 'La fête de Noël',
  event_day date,
  event_time time,
  venue_name text,
  venue_address text,
  ticket_price_xof integer check(ticket_price_xof is null or ticket_price_xof >= 0),
  capacity integer check(capacity is null or capacity >= 1),
  information_note text,
  requests_open boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.christmas_event_config(event_key, information_note)
values('noel-2026','Date, lieu, horaires et tarif à confirmer avec l’organisatrice.')
on conflict(event_key) do nothing;
alter table public.christmas_event_config enable row level security;
drop policy if exists "public read christmas event" on public.christmas_event_config;
create policy "public read christmas event" on public.christmas_event_config for select to anon,authenticated using(true);
drop policy if exists "staff edit christmas event" on public.christmas_event_config;
create policy "staff edit christmas event" on public.christmas_event_config for update to authenticated using(public.is_admin()) with check(public.is_admin());
grant select on public.christmas_event_config to anon,authenticated;
grant update on public.christmas_event_config to authenticated;
