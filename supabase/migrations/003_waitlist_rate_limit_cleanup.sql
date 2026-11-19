create or replace function public.purge_waitlist_rate_limits()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count bigint;
begin
  delete from public.waitlist_rate_limits
  where window_start < to_timestamp(floor(extract(epoch from now()) / 600) * 600);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_waitlist_rate_limits() from public, anon, authenticated;
grant execute on function public.purge_waitlist_rate_limits() to service_role;

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'Enable pg_cron and re-run migration 003 to schedule cleanup, or call public.purge_waitlist_rate_limits() manually.';
    return;
  end if;
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'Enable/configure pg_cron and re-run migration 003 to schedule cleanup, or call public.purge_waitlist_rate_limits() manually.';
    return;
  end;
  perform cron.schedule('waitlist-rate-limit-cleanup', '7 * * * *',
    'select public.purge_waitlist_rate_limits();');
end $$;
