-- Rate limiting for the register-username Edge Function (anti username squatting).
-- Wallets are free to generate, so a signature alone does not limit abuse. The function counts
-- verified requests per hashed client address in a fixed window and refuses callers over the
-- limit. Service role only. Idempotent: safe to run more than once.

create table if not exists public.username_rate_limits (
  bucket text not null check (bucket ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  request_count bigint not null default 1 check (request_count > 0),
  primary key (bucket, window_start)
);
alter table public.username_rate_limits enable row level security;
revoke all on public.username_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.username_rate_limits to service_role;

create or replace function public.consume_username_rate_limit(p_bucket text, p_window_seconds integer)
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
  insert into public.username_rate_limits (bucket, window_start, request_count)
  values (p_bucket, current_window, 1)
  on conflict (bucket, window_start)
  do update set request_count = public.username_rate_limits.request_count + 1
  returning request_count into hits;
  return hits;
end;
$$;

revoke all on function public.consume_username_rate_limit(text, integer) from public, anon, authenticated;
grant execute on function public.consume_username_rate_limit(text, integer) to service_role;

create or replace function public.purge_username_rate_limits()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count bigint;
begin
  delete from public.username_rate_limits where window_start < now() - interval '1 day';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_username_rate_limits() from public, anon, authenticated;
grant execute on function public.purge_username_rate_limits() to service_role;
