\set ON_ERROR_STOP on
begin;
create function pg_temp.expect_denied(command text) returns void
language plpgsql as $$
begin
  begin
    execute command;
  exception when insufficient_privilege then
    return;
  end;
  raise exception 'Expected permission denied for %', command;
end $$;

set role service_role;
do $$
begin
  if public.consume_username_rate_limit(repeat('a', 64), 3600) <> 1 then
    raise exception 'first request must count as 1';
  end if;
  if public.consume_username_rate_limit(repeat('a', 64), 3600) <> 2 then
    raise exception 'second request must count as 2';
  end if;
  if public.consume_username_rate_limit(repeat('b', 64), 3600) <> 1 then
    raise exception 'buckets must be independent';
  end if;
  begin
    perform public.consume_username_rate_limit(repeat('c', 64), 0);
    raise exception 'window of 0 must be rejected';
  exception when others then
    if sqlerrm = 'window of 0 must be rejected' then raise; end if;
  end;
end $$;
select public.purge_username_rate_limits();
reset role;

set role anon;
select pg_temp.expect_denied($q$select public.consume_username_rate_limit(repeat('d', 64), 3600)$q$);
select pg_temp.expect_denied('select * from public.username_rate_limits');
select pg_temp.expect_denied('select public.purge_username_rate_limits()');
reset role;

set role authenticated;
select pg_temp.expect_denied($q$select public.consume_username_rate_limit(repeat('d', 64), 3600)$q$);
select pg_temp.expect_denied('delete from public.username_rate_limits');
reset role;
rollback;
