\set ON_ERROR_STOP on
-- Isolated Postgres 16 database only; run as a superuser.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
-- Model Supabase's broad initial table grants, then verify the migration revokes them.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;

create function pg_temp.expect_error(command text, expected_state text) returns void
language plpgsql as $$
begin
  begin
    execute command;
  exception when others then
    if sqlstate = expected_state then
      raise notice 'EXPECTED %: %', sqlstate, sqlerrm;
      return;
    end if;
    raise;
  end;
  raise exception 'Expected SQLSTATE % for %', expected_state, command;
end $$;

\echo FRESH_WAITLIST_SETUP
\ir ../waitlist.sql
set role anon;
select pg_temp.expect_error($q$insert into public.waitlist(name,email) values ('Ada','ada@example.com')$q$, '42501');
select pg_temp.expect_error($q$select public.consume_waitlist_rate_limit(repeat('a',64))$q$, '42501');
reset role;
select pg_temp.expect_error($q$insert into public.waitlist(name,email) values ('a','ada@example.com')$q$, '23514');
select pg_temp.expect_error($q$insert into public.waitlist(name,email) values ('Ada','a@b')$q$, '23514');
set role service_role;
select public.consume_waitlist_rate_limit(repeat('a',64)) as fresh_count;
insert into public.waitlist(name,email) values ('Ada','ada@example.com');
reset role;

\echo APPLY_001_002_AND_REAPPLY_002
\ir ../migrations/001_usernames_mainnet_only.sql
\ir ../migrations/002_harden_anon_writes.sql
\ir ../migrations/002_harden_anon_writes.sql

set role anon;
select pg_temp.expect_error($q$insert into public.waitlist(name,email) values ('Bob','bob@example.com')$q$, '42501');
select pg_temp.expect_error($q$select public.consume_waitlist_rate_limit(repeat('b',64))$q$, '42501');
select pg_temp.expect_error($q$select * from public.waitlist_rate_limits$q$, '42501');
insert into public.usernames(username,normalized_username,wallet_address,chain_id)
values ('a01','aol','0x1111111111111111111111111111111111111111',143);
\echo VALID_ANON_USERNAME_ACCEPTED
select pg_temp.expect_error($q$insert into public.usernames(username,normalized_username,wallet_address) values ('ab','ab','0x2222222222222222222222222222222222222222')$q$, '23514');
select pg_temp.expect_error($q$insert into public.usernames(username,normalized_username,wallet_address) values ('UPPER','upper','0x2222222222222222222222222222222222222222')$q$, '23514');
select pg_temp.expect_error($q$insert into public.usernames(username,normalized_username,wallet_address) values (repeat('a',21),repeat('a',21),'0x2222222222222222222222222222222222222222')$q$, '23514');
select pg_temp.expect_error($q$insert into public.usernames(username,normalized_username,wallet_address) values ('alice','alice','0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')$q$, '23514');
select pg_temp.expect_error($q$insert into public.usernames(username,normalized_username,wallet_address) values ('alice','alice','bad-address')$q$, '23514');
select pg_temp.expect_error($q$insert into public.usernames(username,normalized_username,wallet_address) values ('bob01','bob01','0x2222222222222222222222222222222222222222')$q$, '23514');
reset role;
set role authenticated;
select pg_temp.expect_error($q$insert into public.waitlist(name,email) values ('Bob','bob@example.com')$q$, '42501');
select pg_temp.expect_error($q$select public.consume_waitlist_rate_limit(repeat('b',64))$q$, '42501');
reset role;

select pg_temp.expect_error($q$insert into public.waitlist(name,email) values (repeat('a',101),'a@example.com')$q$, '23514');
select pg_temp.expect_error($q$insert into public.waitlist(name,email) values ('Ada',' ADA@example.com ')$q$, '23514');
select pg_temp.expect_error($q$insert into public.waitlist(name,email) values ('Ada','a b@example.com')$q$, '23514');
select pg_temp.expect_error($q$insert into public.waitlist(name,email) values ('Ada',repeat('a',250)||'@b.co')$q$, '23514');
set role service_role;
select public.consume_waitlist_rate_limit(repeat('b',64)) as count_1;
select public.consume_waitlist_rate_limit(repeat('b',64)) as count_2;
select public.consume_waitlist_rate_limit(repeat('b',64)) as count_3;
reset role;
do $$
begin
  if (select request_count from public.waitlist_rate_limits where ip_hash = repeat('b',64)) <> 3 then
    raise exception 'Rate limit increments were not atomic';
  end if;
end $$;

\echo LEGACY_ROWS_DO_NOT_BLOCK_MIGRATION
alter table public.waitlist drop constraint waitlist_name_length_chk;
alter table public.waitlist drop constraint waitlist_email_format_chk;
alter table public.usernames drop constraint usernames_username_format_chk;
alter table public.usernames drop constraint usernames_wallet_format_chk;
alter table public.usernames drop constraint usernames_normalized_consistency_chk;
insert into public.waitlist(name,email) values ('x','legacy-invalid');
insert into public.usernames(username,normalized_username,wallet_address) values ('X','wrong','legacy-invalid');
grant insert on public.waitlist to anon, authenticated;
create policy waitlist_anon_insert on public.waitlist for insert to anon, authenticated with check (true);
\ir ../migrations/002_harden_anon_writes.sql
select pg_temp.expect_error('alter table public.waitlist validate constraint waitlist_name_length_chk', '23514');
select pg_temp.expect_error('alter table public.usernames validate constraint usernames_username_format_chk', '23514');
set role anon;
select pg_temp.expect_error($q$insert into public.waitlist(name,email) values ('Bob','bob@example.com')$q$, '42501');
reset role;
do $$
begin
  if (select count(*) from pg_constraint
      where conname in ('waitlist_name_length_chk','waitlist_email_format_chk',
      'usernames_username_format_chk','usernames_wallet_format_chk',
      'usernames_normalized_consistency_chk') and not convalidated) <> 5 then
    raise exception 'Expected five NOT VALID constraints';
  end if;
end $$;
\echo SQL_HARDENING_TESTS_PASSED
