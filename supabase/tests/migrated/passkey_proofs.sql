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
  if public.consume_passkey_proof(repeat('a', 64)) is not true then
    raise exception 'first use of a passkey proof must be accepted';
  end if;
  if public.consume_passkey_proof(repeat('a', 64)) is not false then
    raise exception 'a replayed passkey proof must be rejected';
  end if;
  if public.consume_passkey_proof(repeat('b', 64)) is not true then
    raise exception 'a different passkey proof must be accepted';
  end if;
end $$;

-- Malformed hashes are rejected by the table check.
do $$
begin
  begin
    perform public.consume_passkey_proof('not-a-hash');
    raise exception 'Expected check violation';
  exception when check_violation then
    null;
  end;
end $$;

-- Old proofs are purged, recent ones kept.
update public.passkey_proofs_used set used_at = now() - interval '2 hours' where proof_hash = repeat('b', 64);
do $$
begin
  if public.purge_passkey_proofs() <> 1 then
    raise exception 'purge must remove exactly the expired proof';
  end if;
  if public.consume_passkey_proof(repeat('a', 64)) is not false then
    raise exception 'a recent proof must survive the purge';
  end if;
end $$;
reset role;

set role anon;
select pg_temp.expect_denied($q$select public.consume_passkey_proof(repeat('c', 64))$q$);
select pg_temp.expect_denied('select * from public.passkey_proofs_used');
select pg_temp.expect_denied('select public.purge_passkey_proofs()');
reset role;

set role authenticated;
select pg_temp.expect_denied($q$select public.consume_passkey_proof(repeat('c', 64))$q$);
select pg_temp.expect_denied('delete from public.passkey_proofs_used');
reset role;
rollback;
