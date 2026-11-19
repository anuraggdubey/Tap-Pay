-- Run in Supabase SQL Editor (Dashboard → SQL → New query)
-- Stores marketing waitlist signups from tappay web.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  source text not null default 'web',
  constraint waitlist_email_unique unique (email)
);

create index if not exists waitlist_created_at_idx on public.waitlist (created_at desc);

alter table public.waitlist enable row level security;

-- Public clients must use the CAPTCHA-protected Edge Function.
drop policy if exists "waitlist_anon_insert" on public.waitlist;
revoke insert on public.waitlist from public, anon, authenticated;
grant insert on public.waitlist to service_role;

-- No public reads (protect user emails). Service role / dashboard only.
drop policy if exists "waitlist_no_public_select" on public.waitlist;
create policy "waitlist_no_public_select"
  on public.waitlist
  for select
  to anon, authenticated
  using (false);

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.waitlist'::regclass and conname = 'waitlist_name_length_chk') then
    alter table public.waitlist add constraint waitlist_name_length_chk
      check (char_length(trim(name)) between 2 and 100) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.waitlist'::regclass and conname = 'waitlist_email_format_chk') then
    alter table public.waitlist add constraint waitlist_email_format_chk
      check (char_length(email) <= 254 and email = lower(trim(email)) and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$') not valid;
  end if;
end $$;

create table if not exists public.waitlist_rate_limits (
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  request_count bigint not null default 1 check (request_count > 0),
  primary key (ip_hash, window_start)
);
alter table public.waitlist_rate_limits enable row level security;
revoke all on public.waitlist_rate_limits from public, anon, authenticated;

create or replace function public.consume_waitlist_rate_limit(p_ip_hash text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_window timestamptz := to_timestamp(floor(extract(epoch from now()) / 600) * 600);
  hits bigint;
begin
  insert into public.waitlist_rate_limits (ip_hash, window_start, request_count)
  values (p_ip_hash, current_window, 1)
  on conflict (ip_hash, window_start)
  do update set request_count = public.waitlist_rate_limits.request_count + 1
  returning request_count into hits;
  return hits;
end;
$$;

revoke all on function public.consume_waitlist_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_waitlist_rate_limit(text) to service_role;
