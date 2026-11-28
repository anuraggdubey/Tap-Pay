import {Config, createHandler} from './handler.ts';
import {buildUsernameAuthMessage} from './message.ts';

function assert(value: unknown): asserts value {
  if (!value) {
    throw new Error('assertion failed');
  }
}

const config: Config = {
  origins: ['https://example.com'],
  supabaseUrl: 'https://db.example.com',
  serviceKey: 'service-key',
};
const WALLET = '0x1111111111111111111111111111111111111111';
const issuedAt = new Date().toISOString();

function body(overrides: Record<string, unknown> = {}) {
  return {
    action: 'register',
    username: 'alice',
    walletAddress: WALLET,
    chainId: 143,
    issuedAt,
    signature: '0x' + '1'.repeat(130),
    ...overrides,
  };
}
function request(b: unknown = body(), origin?: string) {
  const headers: Record<string, string> = {'content-type': 'application/json'};
  if (origin) {
    headers.origin = origin;
  }
  return new Request('https://edge.example.com/register-username', {
    method: 'POST',
    headers,
    body: JSON.stringify(b),
  });
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), {status});

// verify that returns the claimed wallet (valid signature) unless told otherwise.
const goodVerify = () => WALLET;
const badVerify = () => '0x2222222222222222222222222222222222222222';

function setup(responses: Response[], verify = goodVerify) {
  const calls: {url: string; init?: RequestInit}[] = [];
  const fetcher: typeof fetch = (input, init) => {
    calls.push({url: String(input), init});
    const r = responses.shift();
    if (!r) {
      throw new Error('unexpected fetch');
    }
    return Promise.resolve(r);
  };
  return {handler: createHandler(config, verify, fetcher, () => {}), calls};
}

Deno.test('registers when the signature matches the wallet', async () => {
  const {handler, calls} = setup([json(1), json(true), json([]), new Response(null, {status: 201})]);
  const res = await handler(request());
  assert(res.status === 200 && (await res.json()).ok === true);
  // Inserted row carries the recovered wallet and normalized username.
  const inserted = JSON.parse(String(calls[3].init?.body));
  assert(inserted.wallet_address === WALLET && inserted.username === 'alice');
});

Deno.test('rejects a signature that recovers a different wallet', async () => {
  const {handler, calls} = setup([], badVerify);
  const res = await handler(request());
  assert(res.status === 401);
  assert(calls.length === 0); // never touches the database
});

Deno.test('rejects a forged wallet (signature for a different address)', async () => {
  // Attacker claims the victim's wallet but can only sign as their own.
  const {handler, calls} = setup([], () => WALLET);
  const res = await handler(request(body({walletAddress: '0x3333333333333333333333333333333333333333'})));
  assert(res.status === 401 && calls.length === 0);
});

Deno.test('refuses when the wallet already has a username', async () => {
  const {handler} = setup([json(1), json(true), json([{username: 'bob'}])]);
  const res = await handler(request());
  assert(res.status === 409 && (await res.json()).reason === 'wallet_taken');
});

Deno.test('maps a unique-violation to taken', async () => {
  const {handler} = setup([json(1), json(true), json([]), json({code: '23505', message: 'username unique'}, 409)]);
  const res = await handler(request());
  assert(res.status === 409 && (await res.json()).reason === 'taken');
});

Deno.test('release deletes only the signed username owned by the signer', async () => {
  const {handler, calls} = setup([json(1), json(true), json([{username: 'alice'}])]);
  const res = await handler(request(body({action: 'release'})));
  assert(res.status === 200);
  assert(calls[2].init?.method === 'DELETE');
  assert(calls[2].url.includes(`wallet_address=eq.${WALLET}`));
  // Scoped to the username in the signed proof, not just the wallet.
  assert(calls[2].url.includes('normalized_username=eq.alice'));
});

Deno.test('release normalizes look-alike characters like registration does', async () => {
  const {handler, calls} = setup([json(1), json(true), json([{username: 'al1c3'}])]);
  const res = await handler(request(body({action: 'release', username: 'al1c3'})));
  assert(res.status === 200);
  // 1 -> l, matching normalizeUsername() used at registration.
  assert(calls[2].url.includes('normalized_username=eq.allc3'));
});

Deno.test('release succeeds only when a row was actually deleted', async () => {
  // A proof for a username the wallet does not hold deletes nothing and reports not found.
  const {handler} = setup([json(1), json(true), json([])]);
  const res = await handler(request(body({action: 'release', username: 'bob'})));
  assert(res.status === 404 && (await res.json()).reason === 'not_found');
});

Deno.test('rejects malformed, stale and wrong-chain requests without db or verify', async () => {
  const stale = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  for (const b of [{}, body({username: 'AB'}), body({username: 'has space'}), body({chainId: 1}),
    body({issuedAt: stale}), body({signature: '0xshort'})]) {
    const {handler, calls} = setup([]);
    assert((await handler(request(b))).status === 400 || (await handler(request(b))).status === 400);
    assert(calls.length === 0);
  }
});

Deno.test('browser origins are restricted; CORS preflight works', async () => {
  const {handler} = setup([]);
  assert((await handler(request(body(), 'https://evil.example'))).status === 403);
  const preflight = await handler(new Request('https://edge.example.com/register-username', {
    method: 'OPTIONS', headers: {origin: 'https://example.com'},
  }));
  assert(preflight.status === 204);
  assert(preflight.headers.get('Access-Control-Allow-Origin') === 'https://example.com');
});

Deno.test('message is stable and deterministic', () => {
  const msg = buildUsernameAuthMessage({
    action: 'register', username: 'Alice', walletAddress: WALLET.toUpperCase(),
    chainId: 143, issuedAt: '2026-01-01T00:00:00.000Z',
  });
  assert(msg === [
    'TapPay username ownership proof',
    'action: register',
    'username: alice',
    `wallet: ${WALLET}`,
    'chain: 143',
    'issued: 2026-01-01T00:00:00.000Z',
  ].join('\n'));
});

Deno.test('a replayed proof is rejected before any database change', async () => {
  // The single-use check reports the proof was already consumed.
  const {handler, calls} = setup([json(1), json(false)]);
  const res = await handler(request(body({action: 'release'})));
  assert(res.status === 409 && (await res.json()).reason === 'replayed');
  assert(calls.length === 2 && calls[1].url.includes('rpc/consume_username_proof'));
});

Deno.test('the same signed request cannot be used twice', async () => {
  const used = new Set<string>();
  const calls: string[] = [];
  const fetcher: typeof fetch = (input, init) => {
    const url = String(input);
    calls.push(url);
    if (url.includes('rpc/consume_username_rate_limit')) {
      return Promise.resolve(json(1));
    }
    if (url.includes('rpc/consume_username_proof')) {
      const hash = JSON.parse(String(init?.body)).p_proof_hash;
      const first = !used.has(hash);
      used.add(hash);
      return Promise.resolve(json(first));
    }
    if (init?.method === 'DELETE') {
      return Promise.resolve(json([{username: 'alice'}]));
    }
    return Promise.resolve(json([]));
  };
  const handler = createHandler(config, goodVerify, fetcher, () => {});
  const b = body({action: 'release'});
  assert((await handler(request(b))).status === 200);
  assert((await handler(request(b))).status === 409);
  assert(calls.filter(u => u.includes('normalized_username')).length === 1);
});

Deno.test('fails closed when the replay check is unavailable', async () => {
  const {handler, calls} = setup([json(1), new Response(null, {status: 500})]);
  const res = await handler(request());
  assert(res.status === 503);
  assert(calls.length === 2);
});

Deno.test('over the registration limit is refused before any proof or table access', async () => {
  const {handler, calls} = setup([json(11)]);
  const res = await handler(request());
  assert(res.status === 429 && (await res.json()).reason === 'rate_limited');
  assert(calls.length === 1 && calls[0].url.includes('rpc/consume_username_rate_limit'));
});

Deno.test('the limit boundary: the 10th registration is allowed, the 11th is not', async () => {
  const ok = setup([json(10), json(true), json([]), new Response(null, {status: 201})]);
  assert((await ok.handler(request())).status === 200);
  const over = setup([json(11)]);
  assert((await over.handler(request())).status === 429);
});

Deno.test('releases use a separate, higher limit', async () => {
  const {handler} = setup([json(15), json(true), json([{username: 'alice'}])]);
  assert((await handler(request(body({action: 'release'})))).status === 200);
  const over = setup([json(21)]);
  assert((await over.handler(request(body({action: 'release'})))).status === 429);
});

Deno.test('fails closed when the rate limiter is unavailable', async () => {
  const {handler, calls} = setup([new Response(null, {status: 500})]);
  assert((await handler(request())).status === 503);
  assert(calls.length === 1);
});

Deno.test('buckets are per client address and ignore spoofed left-most X-Forwarded-For (#132)', async () => {
  const bucketFor = async (forwarded: string) => {
    const {handler, calls} = setup([json(99)]);
    const req = new Request('https://edge.example.com/register-username', {
      method: 'POST',
      headers: {'content-type': 'application/json', 'x-forwarded-for': forwarded},
      body: JSON.stringify(body()),
    });
    await handler(req);
    return JSON.parse(String(calls[0].init?.body)).p_bucket as string;
  };
  const a = await bucketFor('1.1.1.1, 203.0.113.7');
  const spoofedA = await bucketFor('9.9.9.9, 203.0.113.7');
  const b = await bucketFor('1.1.1.1, 203.0.113.8');
  assert(/^[0-9a-f]{64}$/.test(a) && a === spoofedA && a !== b);
  assert(!a.includes('203'));
});

Deno.test('reserved and look-alike reserved names cannot be registered', async () => {
  for (const name of ['admin', 'tappay', 'tappayteam', 'supp0rt', 'wa11et', 'monad']) {
    const {handler, calls} = setup([]);
    const res = await handler(request(body({username: name})));
    assert(res.status === 400 && (await res.json()).reason === 'reserved');
    assert(calls.length === 0);
  }
});

Deno.test('reserved names do not block releasing', async () => {
  const {handler} = setup([json(1), json(true), json([{username: 'admin'}])]);
  assert((await handler(request(body({action: 'release', username: 'admin'})))).status === 200);
});
