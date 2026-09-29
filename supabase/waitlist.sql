-- Run in Supabase SQL Editor (Dashboard → SQL → New query)
-- Stores marketing waitlist signups from tappay web.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 2),
  email text not null check (position('@' in email) > 1),
  created_at timestamptz not null default now(),
  source text not null default 'web',
  constraint waitlist_email_unique unique (email)
);

create index if not exists waitlist_created_at_idx on public.waitlist (created_at desc);

alter table public.waitlist enable row level security;

-- Allow anonymous signups from the public site (insert only).
drop policy if exists "waitlist_anon_insert" on public.waitlist;
create policy "waitlist_anon_insert"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (true);

-- No public reads (protect user emails). Service role / dashboard only.
drop policy if exists "waitlist_no_public_select" on public.waitlist;
create policy "waitlist_no_public_select"
  on public.waitlist
  for select
  to anon, authenticated
  using (false);
