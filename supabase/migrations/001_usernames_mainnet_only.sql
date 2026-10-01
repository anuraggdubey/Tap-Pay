-- TapPay: mainnet-only username registry (chain_id 143)
-- SAFE TO RE-RUN — uses IF NOT EXISTS / IF EXISTS / ADD COLUMN IF NOT EXISTS
-- Run once in Supabase Dashboard → SQL → New query (do NOT recreate project).
--
-- Existing @username rows are kept; chain_id is set to 143 so the same handles
-- work on Monad Mainnet without users re-registering.

-- ── Table (create only if missing) ─────────────────────────────────────────
create table if not exists public.usernames (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  normalized_username text not null,
  wallet_address text not null,
  created_at timestamptz not null default now()
);

-- ── Mainnet chain column (additive) ─────────────────────────────────────────
alter table public.usernames
  add column if not exists chain_id integer;

-- Move legacy / testnet-tagged rows to mainnet (same wallet address, same handle)
update public.usernames
set chain_id = 143
where chain_id is null
   or chain_id = 10143;

alter table public.usernames
  alter column chain_id set default 143;

update public.usernames
set chain_id = 143
where chain_id is null;

alter table public.usernames
  alter column chain_id set not null;

-- ── Uniques (skip if your project already has these constraints) ────────────
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'usernames_username_unique'
  ) then
    alter table public.usernames add constraint usernames_username_unique unique (username);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'usernames_normalized_unique'
  ) then
    alter table public.usernames add constraint usernames_normalized_unique unique (normalized_username);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'usernames_wallet_unique'
  ) then
    alter table public.usernames add constraint usernames_wallet_unique unique (wallet_address);
  end if;
exception
  when duplicate_object then null;
end $$;

create index if not exists usernames_wallet_address_lower_idx
  on public.usernames (lower(wallet_address));

create index if not exists usernames_normalized_idx
  on public.usernames (normalized_username);

create index if not exists usernames_chain_id_idx
  on public.usernames (chain_id);

-- ── RLS: only resolve / register mainnet (143) rows ─────────────────────────
alter table public.usernames enable row level security;

drop policy if exists "usernames_public_read_mainnet" on public.usernames;
create policy "usernames_public_read_mainnet"
  on public.usernames
  for select
  to anon, authenticated
  using (chain_id = 143);

drop policy if exists "usernames_anon_insert_mainnet" on public.usernames;
create policy "usernames_anon_insert_mainnet"
  on public.usernames
  for insert
  to anon, authenticated
  with check (chain_id = 143);

-- Optional: block accidental testnet inserts at DB level
alter table public.usernames drop constraint if exists usernames_chain_id_mainnet_chk;
alter table public.usernames
  add constraint usernames_chain_id_mainnet_chk check (chain_id = 143);
