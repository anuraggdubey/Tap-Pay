-- Stop bulk enumeration of the usernames table (handle <-> wallet scrape).
-- Public clients can no longer SELECT from public.usernames. Resolution and reverse resolution
-- go through two SECURITY DEFINER functions that return a single value for an exact lookup, so
-- the whole directory cannot be downloaded with one request. Writes still go only through the
-- signed `register-username` Edge Function (service role).
-- Idempotent: safe to run more than once.
--
-- Deploy order: apply this migration together with (or right after) the app release that uses
-- the RPCs. Older app builds read the table directly and will fail to resolve usernames.

-- Exact lookup: username -> wallet address (mainnet, normalized like registration: 0->o, 1->l).
create or replace function public.resolve_username(p_username text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select wallet_address
  from public.usernames
  where chain_id = 143
    and normalized_username = lower(replace(replace(p_username, '0', 'o'), '1', 'l'))
  limit 1;
$$;

-- Exact lookup: wallet address -> username.
create or replace function public.reverse_resolve_address(p_address text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select username
  from public.usernames
  where chain_id = 143
    and wallet_address = lower(p_address)
  limit 1;
$$;

revoke all on function public.resolve_username(text) from public;
revoke all on function public.reverse_resolve_address(text) from public;
grant execute on function public.resolve_username(text) to anon, authenticated, service_role;
grant execute on function public.reverse_resolve_address(text) to anon, authenticated, service_role;

-- Remove blanket reads.
drop policy if exists "usernames_public_read_mainnet" on public.usernames;
revoke select on public.usernames from public, anon, authenticated;
grant select on public.usernames to service_role;
