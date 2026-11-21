-- Single-use username ownership proofs (fixes replay within the freshness window).
-- The register-username Edge Function hashes each verified proof (message + signature) and
-- records it here; a proof that was already consumed is rejected. Only the service role can use
-- this. Idempotent: safe to run more than once.

create table if not exists public.username_proofs_used (
  proof_hash text primary key check (proof_hash ~ '^[0-9a-f]{64}$'),
  used_at timestamptz not null default now()
);
alter table public.username_proofs_used enable row level security;
revoke all on public.username_proofs_used from public, anon, authenticated;
grant select, insert, update, delete on public.username_proofs_used to service_role;

-- Returns true the first time a proof hash is seen, false on every replay.
create or replace function public.consume_username_proof(p_proof_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  insert into public.username_proofs_used (proof_hash)
  values (p_proof_hash)
  on conflict (proof_hash) do nothing;
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.consume_username_proof(text) from public, anon, authenticated;
grant execute on function public.consume_username_proof(text) to service_role;

-- Proofs older than the freshness window can never be replayed again, so they can be purged.
create or replace function public.purge_username_proofs()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count bigint;
begin
  delete from public.username_proofs_used where used_at < now() - interval '1 hour';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_username_proofs() from public, anon, authenticated;
grant execute on function public.purge_username_proofs() to service_role;
