import {Config, createHandler} from './handler.ts';

function assert(value: unknown): asserts value {
  if (!value) {
    throw new Error('assertion failed');
  }
}

const config: Config = {
  origins: ['https://example.com'], supabaseUrl: 'https://db.example.com',
  serviceKey: 'test-service-key', ipSalt: 'test-only-salt-with-at-least-32-characters', limit: 20,
};
const TOKEN = 'A'.repeat(43);
function request(body: unknown = {token: TOKEN}, origin = config.origins[0], method = 'POST') {
  return new Request('https://edge.example.com/waitlist-confirm', {
    method, headers: {origin, 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.9'},
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status});
async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join('');
}

function setup(responses: Response[]) {
  const calls: {url: string; init?: RequestInit}[] = [];
  const logs: string[] = [];
  const fetcher: typeof fetch = (input, init) => {
    calls.push({url: String(input), init});
    const response = responses.shift();
    if (!response) {
      throw new Error('unexpected fetch');
    }
    return Promise.resolve(response);
  };
  return {handler: createHandler(config, fetcher, message => logs.push(message)), calls, logs};
}

Deno.test('a valid token confirms and only its hash reaches the database', async () => {
  const {handler, calls} = setup([json(1), json(true)]);
  const res = await handler(request());
  assert(res.status === 200 && (await res.json()).ok === true);
  assert(res.headers.get('Access-Control-Allow-Origin') === config.origins[0]);
  assert(calls[1].url.endsWith('/rest/v1/rpc/confirm_waitlist_email'));
  assert(JSON.parse(String(calls[1].init?.body)).p_token_hash === await sha256Hex(TOKEN));
  assert(!String(calls[1].init?.body).includes(TOKEN));
});

Deno.test('unknown, expired and already used tokens look identical (400)', async () => {
  const {handler} = setup([json(1), json(false)]);
  const res = await handler(request());
  assert(res.status === 400);
  const body = await res.json();
  assert(body.message === 'This confirmation link is invalid or has expired.' && body.ok === undefined);
});

Deno.test('malformed tokens are rejected before any upstream call', async () => {
  for (const bad of [{}, {token: ''}, {token: 'short'}, {token: 'A'.repeat(44)}, {token: 'A'.repeat(42) + '!'}, {token: 7}, null]) {
    const {handler, calls} = setup([]);
    assert((await handler(request(bad))).status === 400);
    assert(calls.length === 0);
  }
});

Deno.test('CORS, methods and content type', async () => {
  const {handler, calls} = setup([]);
  assert((await handler(request(undefined, 'https://evil.example'))).status === 403);
  assert((await handler(request(undefined, config.origins[0], 'GET'))).status === 405);
  const options = await handler(new Request('https://edge.example.com/x', {method: 'OPTIONS', headers: {origin: config.origins[0]}}));
  assert(options.status === 204);
  const wrongType = await handler(new Request('https://edge.example.com/x', {
    method: 'POST', headers: {origin: config.origins[0], 'content-type': 'text/plain', 'x-forwarded-for': '198.51.100.9'}, body: '{}',
  }));
  assert(wrongType.status === 400);
  assert(calls.length === 0);
});

Deno.test('guessing is rate limited per client and the limiter fails closed', async () => {
  const limited = setup([json(21)]);
  assert((await limited.handler(request())).status === 429);
  assert(limited.calls.length === 1);

  const down = setup([new Response(null, {status: 500})]);
  assert((await down.handler(request())).status === 503);

  const bad = setup([json('nope')]);
  assert((await bad.handler(request())).status === 503);
});

Deno.test('the rate limit bucket does not contain the raw IP and is separate from signups', async () => {
  const {handler, calls} = setup([json(1), json(true)]);
  await handler(request());
  const bucket = JSON.parse(String(calls[0].init?.body)).p_ip_hash;
  assert(/^[0-9a-f]{64}$/.test(bucket) && !bucket.includes('198'));
  assert(bucket === await sha256Hex(`confirm:${config.ipSalt}:198.51.100.9`));
});

Deno.test('upstream failures are generic and missing config or IP fail closed', async () => {
  const failing = setup([json(1), new Response(null, {status: 500})]);
  const res = await failing.handler(request());
  assert(res.status === 503 && !(await res.text()).includes('500'));

  assert((await createHandler(null)(request())).status === 503);

  const noIp = new Request('https://edge.example.com/x', {
    method: 'POST', headers: {origin: config.origins[0], 'content-type': 'application/json'}, body: JSON.stringify({token: TOKEN}),
  });
  assert((await setup([]).handler(noIp)).status === 503);
});
