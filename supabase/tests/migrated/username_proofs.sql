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
  if public.consume_username_proof(repeat('a', 64)) is not true then
    raise exception 'first use of a proof must be accepted';
  end if;
  if public.consume_username_proof(repeat('a', 64)) is not false then
    raise exception 'a replayed proof must be rejected';
  end if;
  if public.consume_username_proof(repeat('b', 64)) is not true then
    raise exception 'a different proof must be accepted';
  end if;
end $$;
select public.purge_username_proofs();
reset role;

set role anon;
select pg_temp.expect_denied($q$select public.consume_username_proof(repeat('c', 64))$q$);
select pg_temp.expect_denied('select * from public.username_proofs_used');
select pg_temp.expect_denied('select public.purge_username_proofs()');
reset role;

set role authenticated;
select pg_temp.expect_denied($q$select public.consume_username_proof(repeat('c', 64))$q$);
select pg_temp.expect_denied('delete from public.username_proofs_used');
reset role;
rollback;
