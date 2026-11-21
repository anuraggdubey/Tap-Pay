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
insert into public.usernames(username, normalized_username, wallet_address)
values ('alice', 'alice', '0x1111111111111111111111111111111111111111');
insert into public.waitlist(name, email) values ('Alice', 'alice@example.com');
select public.consume_waitlist_rate_limit(repeat('a', 64));
select public.purge_waitlist_rate_limits();
reset role;

set role anon;
select pg_temp.expect_denied($q$insert into public.usernames(username,normalized_username,wallet_address)
  values ('bob','bob','0x2222222222222222222222222222222222222222')$q$);
select pg_temp.expect_denied('update public.usernames set username = ''bob''');
select pg_temp.expect_denied('select * from public.usernames');
select pg_temp.expect_denied('select username, wallet_address from public.usernames');
select pg_temp.expect_denied('select count(*) from public.usernames');
select pg_temp.expect_denied('delete from public.usernames');
select pg_temp.expect_denied($q$insert into public.waitlist(name,email) values ('Bob','bob@example.com')$q$);
select pg_temp.expect_denied('select * from public.waitlist_rate_limits');
select pg_temp.expect_denied($q$select public.consume_waitlist_rate_limit(repeat('b',64))$q$);
select pg_temp.expect_denied('select public.purge_waitlist_rate_limits()');
do $$
begin
  if public.resolve_username('alice') is distinct from '0x1111111111111111111111111111111111111111' then raise exception 'Public username resolution failed'; end if;
  if public.resolve_username('A1ice') is distinct from '0x1111111111111111111111111111111111111111' then raise exception 'Look-alike normalization failed'; end if;
  if public.reverse_resolve_address('0x1111111111111111111111111111111111111111') is distinct from 'alice' then raise exception 'Public reverse resolution failed'; end if;
  if public.resolve_username('nobody') is not null then raise exception 'Unknown username must resolve to null'; end if;
  if (select count(*) from public.waitlist) <> 0 then raise exception 'Waitlist data exposed'; end if;
end $$;
reset role;

set role authenticated;
select pg_temp.expect_denied($q$insert into public.usernames(username,normalized_username,wallet_address)
  values ('bob','bob','0x2222222222222222222222222222222222222222')$q$);
select pg_temp.expect_denied('update public.usernames set username = ''bob''');
select pg_temp.expect_denied('delete from public.usernames');
select pg_temp.expect_denied($q$insert into public.waitlist(name,email) values ('Bob','bob@example.com')$q$);
select pg_temp.expect_denied('select * from public.waitlist_rate_limits');
select pg_temp.expect_denied($q$select public.consume_waitlist_rate_limit(repeat('b',64))$q$);
select pg_temp.expect_denied('select public.purge_waitlist_rate_limits()');
select pg_temp.expect_denied('select * from public.usernames');
select pg_temp.expect_denied('select count(*) from public.usernames');
do $$
begin
  if public.resolve_username('alice') is distinct from '0x1111111111111111111111111111111111111111' then raise exception 'Public username resolution failed'; end if;
  if public.reverse_resolve_address('0x1111111111111111111111111111111111111111') is distinct from 'alice' then raise exception 'Public reverse resolution failed'; end if;
  if (select count(*) from public.waitlist) <> 0 then raise exception 'Waitlist data exposed'; end if;
end $$;
reset role;
rollback;
\echo MIGRATED_PERMISSION_TESTS_PASSED
