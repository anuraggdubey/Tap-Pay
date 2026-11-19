import {hashIp, validateSignup} from './validation.ts';

function assert(value: unknown): asserts value {
  if (!value) {
    throw new Error('assertion failed');
  }
}

Deno.test('normalizes valid signup and accepts boundaries', () => {
  const result = validateSignup({name: '  Ada  ', email: ' ADA@EXAMPLE.COM ', token: 'token'});
  assert(result?.name === 'Ada' && result.email === 'ada@example.com');
  for (const name of ['ab', 'a'.repeat(100), '😀'.repeat(100)]) {
    assert(validateSignup({name, email: 'a@b.co', token: 'token'}));
  }
  assert(validateSignup({name: 'Ada', email: `${'a'.repeat(249)}@b.co`, token: 'token'}));
});

Deno.test('rejects empty, malformed and oversized fields', () => {
  for (const value of [null, [], {}, '', {name: 42, email: 'a@b.co', token: 'token'}]) {
    assert(validateSignup(value) === null);
  }
  for (const name of ['', ' ', 'a', 'a'.repeat(101)]) {
    assert(validateSignup({name, email: 'a@b.co', token: 'token'}) === null);
  }
  for (const email of ['', 'a@b', 'a@@b.co', 'a b@c.co', `${'a'.repeat(250)}@b.co`]) {
    assert(validateSignup({name: 'Ada', email, token: 'token'}) === null);
  }
  for (const token of ['', ' ', 'a'.repeat(2049)]) {
    assert(validateSignup({name: 'Ada', email: 'a@b.co', token}) === null);
  }
});

Deno.test('IP hashes are deterministic, salted and contain no raw IP', async () => {
  const hash = await hashIp('192.0.2.1', 'salt-a');
  assert(/^[0-9a-f]{64}$/.test(hash));
  assert(hash === await hashIp('192.0.2.1', 'salt-a'));
  assert(hash !== await hashIp('192.0.2.1', 'salt-b'));
  assert(hash !== await hashIp('192.0.2.2', 'salt-a'));
});
