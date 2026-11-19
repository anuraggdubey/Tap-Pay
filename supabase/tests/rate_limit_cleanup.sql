\set ON_ERROR_STOP on
-- Isolated database only; the hardening suite sets up stub roles and migrations.
\ir anon_write_hardening.sql
\ir ../migrations/003_waitlist_rate_limit_cleanup.sql
\ir ../migrations/003_waitlist_rate_limit_cleanup.sql

begin;
truncate public.waitlist_rate_limits;
insert into public.waitlist_rate_limits(ip_hash, window_start)
values
  (repeat('a',64), to_timestamp(floor(extract(epoch from now()) / 600) * 600) - interval '10 minutes'),
  (repeat('b',64), now() - interval '2 days'),
  (repeat('c',64), to_timestamp(floor(extract(epoch from now()) / 600) * 600)),
  (repeat('d',64), now() + interval '10 minutes');

set role anon;
select pg_temp.expect_error('select public.purge_waitlist_rate_limits()', '42501');
reset role;
set role authenticated;
select pg_temp.expect_error('select public.purge_waitlist_rate_limits()', '42501');
reset role;
set role service_role;
do $$
begin
  if public.purge_waitlist_rate_limits() <> 2 then
    raise exception 'Expected exactly two expired windows to be purged';
  end if;
  if public.purge_waitlist_rate_limits() <> 0 then
    raise exception 'Repeated purge must retain active and future windows';
  end if;
end $$;
reset role;
do $$
begin
  if (select count(*) from public.waitlist_rate_limits) <> 2
     or exists (select 1 from public.waitlist_rate_limits where ip_hash in (repeat('a',64), repeat('b',64))) then
    raise exception 'Purge removed the wrong windows';
  end if;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if (select count(*) from cron.job where jobname = 'waitlist-rate-limit-cleanup'
        and schedule = '7 * * * *' and command = 'select public.purge_waitlist_rate_limits();') <> 1 then
      raise exception 'Expected one named hourly cleanup job after migration rerun';
    end if;
  end if;
end $$;
commit;
\echo RATE_LIMIT_CLEANUP_TESTS_PASSED
