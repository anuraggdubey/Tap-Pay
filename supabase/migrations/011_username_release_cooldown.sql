-- Released usernames cannot be taken over right away (handle takeover / payment redirection).
-- Payments are sent by @handle, so whoever registers a handle right after it is released would
-- receive every payment meant for the previous owner. This migration:
--  1. records every released handle with its previous wallet (trigger on delete);
--  2. refuses to give a handle released less than 60 days ago to any other wallet (trigger on
--     insert/update), so the rule holds for every write path, not only the Edge Function;
--  3. adds resolve_username_details(), which also returns when the handle was registered so the
--     app can warn about new or changed handles. resolve_username() is unchanged for older builds.
-- Idempotent: safe to run more than once.

create table if not exists public.released_usernames (
  normalized_username text primary key,
  previous_wallet text not null check (previous_wallet ~ '^0x[0-9a-f]{40}$'),
  released_at timestamptz not null default now()
);
alter table public.released_usernames enable row level security;
revoke all on public.released_usernames from public, anon, authenticated;
grant select, insert, update, delete on public.released_usernames to service_role;

-- 1. Remember who released a handle, and when.
create or replace function public.record_released_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.released_usernames (normalized_username, previous_wallet, released_at)
  values (old.normalized_username, lower(old.wallet_address), now())
  on conflict (normalized_username)
  do update set previous_wallet = excluded.previous_wallet, released_at = excluded.released_at;
  return old;
end;
$$;
revoke all on function public.record_released_username() from public, anon, authenticated;

drop trigger if exists usernames_record_release on public.usernames;
create trigger usernames_record_release
  after delete on public.usernames
  for each row execute function public.record_released_username();

-- 2. Cooldown: only the previous wallet may take a recently released handle back.
create or replace function public.enforce_username_release_cooldown()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  released record;
begin
  select previous_wallet, released_at
  into released
  from public.released_usernames
  where normalized_username = new.normalized_username;

  if found
     and released.released_at > now() - interval '60 days'
     and released.previous_wallet <> lower(new.wallet_address) then
    raise exception using
      errcode = 'P0001',
      message = 'username_cooldown',
      hint = 'This username was released recently and is reserved for its previous owner.';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_username_release_cooldown() from public, anon, authenticated;

drop trigger if exists usernames_release_cooldown on public.usernames;
create trigger usernames_release_cooldown
  before insert or update of normalized_username, wallet_address on public.usernames
  for each row execute function public.enforce_username_release_cooldown();

-- 3. Exact lookup with the registration time (same normalization as resolve_username).
create or replace function public.resolve_username_details(p_username text)
returns table (wallet_address text, registered_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select u.wallet_address, u.created_at
  from public.usernames u
  where u.chain_id = 143
    and u.normalized_username = lower(replace(replace(p_username, '0', 'o'), '1', 'l'))
  limit 1;
$$;

revoke all on function public.resolve_username_details(text) from public;
grant execute on function public.resolve_username_details(text) to anon, authenticated, service_role;
