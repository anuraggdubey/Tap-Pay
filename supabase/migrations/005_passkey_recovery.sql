-- Passkey recovery blobs (see docs/PASSKEY_RECOVERY.md).
-- The table holds ONLY ciphertext + nonce + credential id + wallet address. The AES key exists
-- only while the user's passkey answers a WebAuthn PRF request, so a breach of this table
-- exposes no keys. All access goes through the `passkey-recovery` Edge Function (service role);
-- anon/authenticated have no access at all.
-- Idempotent: safe to run more than once.

create table if not exists public.passkey_recovery_blobs (
  credential_id text primary key
    check (credential_id ~ '^[A-Za-z0-9_-]+$' and length(credential_id) between 16 and 512),
  wallet_address text not null unique check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  ciphertext text not null
    check (ciphertext ~ '^[A-Za-z0-9_-]+$' and length(ciphertext) between 16 and 4096),
  nonce text not null check (nonce ~ '^[A-Za-z0-9_-]{16}$'),
  version smallint not null default 1 check (version = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.passkey_recovery_blobs enable row level security;
revoke all on public.passkey_recovery_blobs from public, anon, authenticated;
grant select, insert, update, delete on public.passkey_recovery_blobs to service_role;

-- Fixed-window rate limiter for the Edge Function (per hashed client / wallet).
create table if not exists public.passkey_recovery_rate_limits (
  bucket text not null check (bucket ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  request_count bigint not null default 1 check (request_count > 0),
  primary key (bucket, window_start)
);
alter table public.passkey_recovery_rate_limits enable row level security;
revoke all on public.passkey_recovery_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.passkey_recovery_rate_limits to service_role;

create or replace function public.consume_passkey_recovery_rate_limit(p_bucket text, p_window_seconds integer)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_window timestamptz;
  hits bigint;
begin
  if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid window';
  end if;
  current_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.passkey_recovery_rate_limits (bucket, window_start, request_count)
  values (p_bucket, current_window, 1)
  on conflict (bucket, window_start)
  do update set request_count = public.passkey_recovery_rate_limits.request_count + 1
  returning request_count into hits;
  return hits;
end;
$$;

revoke all on function public.consume_passkey_recovery_rate_limit(text, integer) from public, anon, authenticated;
grant execute on function public.consume_passkey_recovery_rate_limit(text, integer) to service_role;

create or replace function public.purge_passkey_recovery_rate_limits()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count bigint;
begin
  delete from public.passkey_recovery_rate_limits where window_start < now() - interval '1 day';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_passkey_recovery_rate_limits() from public, anon, authenticated;
grant execute on function public.purge_passkey_recovery_rate_limits() to service_role;
