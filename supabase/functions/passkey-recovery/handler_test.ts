import {Config, createHandler} from './handler.ts';
import {validatePasskeyRequest} from './validation.ts';

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
const OTHER = '0x2222222222222222222222222222222222222222';
const CRED = 'A'.repeat(22);
const issuedAt = new Date().toISOString();
const CIPHERTEXT = 'B'.repeat(48);
const NONCE = 'C'.repeat(16);

async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join('');
}

async function putBody(overrides: Record<string, unknown> = {}) {
  return {
    action: 'put',
    credentialId: CRED,
    walletAddress: WALLET,
    digest: await sha256Hex(`${CIPHERTEXT}.${NONCE}`),
    issuedAt,
    signature: '0x' + '1'.repeat(130),
    blob: {ciphertext: CIPHERTEXT, nonce: NONCE, version: 1},
    ...overrides,
  };
}
const deleteBody = (overrides: Record<string, unknown> = {}) => ({
  action: 'delete',
  credentialId: CRED,
  walletAddress: WALLET,
  digest: '-',
  issuedAt,
  signature: '0x' + '1'.repeat(130),
  ...overrides,
});
const getBody = (overrides: Record<string, unknown> = {}) => ({action: 'get', credentialId: CRED, ...overrides});

function request(b: unknown, origin?: string, extra: Record<string, string> = {}) {
  const headers: Record<string, string> = {'content-type': 'application/json', ...extra};
  if (origin) {
    headers.origin = origin;
  }
  return new Request('https://edge.example.com/passkey-recovery', {
    method: 'POST',
    headers,
    body: JSON.stringify(b),
  });
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), {status});

type Call = {url: string; init?: RequestInit};
/** Routes REST calls; `rows` is the existing blob lookup result, `hits` the rate limiter count. */
function stub(options: {hits?: number; rows?: unknown[]; failAt?: string} = {}) {
  const calls: Call[] = [];
  const fetcher = ((url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    calls.push({url: u, init});
    if (options.failAt && u.includes(options.failAt)) {
      return Promise.resolve(json({}, 500));
    }
    if (u.includes('rpc/consume_passkey_recovery_rate_limit')) {
      return Promise.resolve(json(options.hits ?? 1));
    }
    if (init?.method === 'GET') {
      return Promise.resolve(json(options.rows ?? []));
    }
    return Promise.resolve(new Response(null, {status: 204}));
  }) as typeof fetch;
  return {calls, fetcher};
}
const verifyAs = (address: string | null) => () => address;
const quiet = () => {};

Deno.test('rejects unconfigured, wrong method, bad content type, unknown origin', async () => {
  assert((await createHandler(null, verifyAs(WALLET), stub().fetcher, quiet)(request(getBody()))).status === 503);
  const h = createHandler(config, verifyAs(WALLET), stub().fetcher, quiet);
  assert((await h(new Request('https://x.example.com', {method: 'GET'}))).status === 405);
  assert(
    (await h(new Request('https://x.example.com', {method: 'POST', headers: {'content-type': 'text/plain'}, body: '{}'}))).status === 400,
  );
  assert((await h(request(getBody(), 'https://evil.example.com'))).status === 403);
  const ok = await h(request(getBody(), 'https://example.com'));
  assert(ok.headers.get('Access-Control-Allow-Origin') === 'https://example.com');
});

Deno.test('validation rejects malformed requests', async () => {
  assert(validatePasskeyRequest(null) === null);
  assert(validatePasskeyRequest({action: 'get', credentialId: 'short'}) === null);
  assert(validatePasskeyRequest({action: 'nope', credentialId: CRED}) === null);
  assert(validatePasskeyRequest(await putBody({walletAddress: 'nope'})) === null);
  assert(validatePasskeyRequest(await putBody({signature: '0x12'})) === null);
  assert(validatePasskeyRequest(await putBody({blob: {ciphertext: 'x', nonce: NONCE, version: 1}})) === null);
  assert(validatePasskeyRequest(await putBody({blob: {ciphertext: CIPHERTEXT, nonce: NONCE, version: 2}})) === null);
  assert(validatePasskeyRequest(await putBody({issuedAt: new Date(Date.now() - 3600_000).toISOString()})) === null);
  assert(validatePasskeyRequest(deleteBody({digest: 'abc'})) === null);
  assert(validatePasskeyRequest(await putBody()) !== null);
  assert(validatePasskeyRequest(deleteBody()) !== null);
  assert(validatePasskeyRequest(getBody()) !== null);
});

Deno.test('get returns the blob and is rate limited', async () => {
  const row = {ciphertext: CIPHERTEXT, nonce: NONCE, version: 1, wallet_address: WALLET, updated_at: issuedAt};
  const s = stub({rows: [row]});
  const res = await createHandler(config, verifyAs(null), s.fetcher, quiet)(request(getBody()));
  assert(res.status === 200);
  const body = await res.json();
  assert(body.ciphertext === CIPHERTEXT && body.walletAddress === WALLET && body.version === 1);
  assert(s.calls.some(c => c.url.includes(`credential_id=eq.${CRED}`)));

  const limited = await createHandler(config, verifyAs(null), stub({hits: 31, rows: [row]}).fetcher, quiet)(request(getBody()));
  assert(limited.status === 429);
});

Deno.test('get for an unknown credential is a generic 404', async () => {
  const res = await createHandler(config, verifyAs(null), stub({rows: []}).fetcher, quiet)(request(getBody()));
  assert(res.status === 404);
  const body = await res.json();
  assert(typeof body.error === 'string' && !('walletAddress' in body));
});

Deno.test('put requires a matching wallet signature and a matching digest', async () => {
  const s1 = stub();
  assert((await createHandler(config, verifyAs(OTHER), s1.fetcher, quiet)(request(await putBody()))).status === 401);
  assert((await createHandler(config, verifyAs(null), s1.fetcher, quiet)(request(await putBody()))).status === 401);
  assert(s1.calls.length === 0);

  const s2 = stub();
  const bad = await createHandler(config, verifyAs(WALLET), s2.fetcher, quiet)(
    request(await putBody({digest: '0'.repeat(64)})),
  );
  assert(bad.status === 400);
  assert(!s2.calls.some(c => c.init?.method === 'POST' && c.url.includes('passkey_recovery_blobs')));
});

Deno.test('put stores ciphertext only and replaces the wallet previous blob', async () => {
  const s = stub({rows: []});
  const res = await createHandler(config, verifyAs(WALLET), s.fetcher, quiet)(request(await putBody()));
  assert(res.status === 200);
  const clear = s.calls.find(c => c.init?.method === 'DELETE');
  assert(clear && clear.url.includes(`wallet_address=eq.${WALLET}`) && clear.url.includes(`credential_id=neq.${CRED}`));
  const write = s.calls.find(c => c.init?.method === 'POST' && c.url.includes('on_conflict=credential_id'));
  assert(write);
  const stored = JSON.parse(String(write.init?.body));
  assert(stored.ciphertext === CIPHERTEXT && stored.nonce === NONCE && stored.wallet_address === WALLET);
  assert(!('signature' in stored) && !('digest' in stored));
});

Deno.test('put refuses to overwrite a blob owned by another wallet', async () => {
  const s = stub({rows: [{wallet_address: OTHER}]});
  const res = await createHandler(config, verifyAs(WALLET), s.fetcher, quiet)(request(await putBody()));
  assert(res.status === 409);
  assert(!s.calls.some(c => c.init?.method === 'POST' && c.url.includes('passkey_recovery_blobs')));
  assert(!s.calls.some(c => c.init?.method === 'DELETE'));
});

Deno.test('delete only removes the signing wallet blob', async () => {
  assert((await createHandler(config, verifyAs(OTHER), stub().fetcher, quiet)(request(deleteBody()))).status === 401);
  const s = stub();
  const res = await createHandler(config, verifyAs(WALLET), s.fetcher, quiet)(request(deleteBody()));
  assert(res.status === 200);
  const del = s.calls.find(c => c.init?.method === 'DELETE');
  assert(del && del.url.includes(`credential_id=eq.${CRED}`) && del.url.includes(`wallet_address=eq.${WALLET}`));
});

Deno.test('writes are rate limited per wallet', async () => {
  const res = await createHandler(config, verifyAs(WALLET), stub({hits: 21}).fetcher, quiet)(request(await putBody()));
  assert(res.status === 429);
});

Deno.test('upstream failures return a generic 503 and never leak details', async () => {
  const s = stub({failAt: 'rpc/consume_passkey_recovery_rate_limit'});
  const res = await createHandler(config, verifyAs(WALLET), s.fetcher, quiet)(request(getBody()));
  assert(res.status === 503);
  const text = await res.text();
  assert(!text.includes('rate limiter'));
});
