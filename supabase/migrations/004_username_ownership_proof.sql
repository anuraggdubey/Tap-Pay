-- Username writes must go through the register-username Edge Function, which verifies a wallet
-- signature. Direct anon/authenticated inserts are revoked so nobody can bind a username to a
-- wallet they do not control. Public SELECT (resolve / reverse-resolve) is unchanged.
-- Idempotent: safe to run more than once.

alter table public.usernames enable row level security;

-- Remove the open anon insert policy added in 001.
drop policy if exists "usernames_anon_insert_mainnet" on public.usernames;

-- Revoke table-level insert/update/delete from the public roles; only service_role writes.
revoke insert, update, delete on public.usernames from public, anon, authenticated;
grant insert, update, delete on public.usernames to service_role;

-- Keep public read of mainnet rows (unchanged, re-asserted for clarity).
drop policy if exists "usernames_public_read_mainnet" on public.usernames;
create policy "usernames_public_read_mainnet"
  on public.usernames
  for select
  to anon, authenticated
  using (chain_id = 143);
