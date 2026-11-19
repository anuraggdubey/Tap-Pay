import {Config, createHandler} from './handler.ts';
import {hashIp} from './validation.ts';

function assert(value: unknown): asserts value {
  if (!value) {
    throw new Error('assertion failed');
  }
}

const config: Config = {
  origins: ['https://example.com'], supabaseUrl: 'https://db.example.com',
  serviceKey: 'test-service-key', turnstileSecret: 'test-secret',
  ipSalt: 'test-only-salt-with-at-least-32-characters', limit: 5,
};
const valid = {name: ' Ada ', email: 'ADA@EXAMPLE.COM', token: 'test-token'};
function request(body: unknown = valid, origin = config.origins[0], method = 'POST') {
  return new Request('https://edge.example.com/waitlist-signup', {
    method, headers: {origin, 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.9, 192.0.2.1'},
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status});
const captcha = {success: true, hostname: 'example.com', action: 'waitlist-signup'};

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

Deno.test('valid signup verifies CAPTCHA and inserts only normalized fields', async () => {
  const {handler, calls} = setup([json(1), json(captcha), new Response(null, {status: 201})]);
  const result = await handler(request());
  assert(result.status === 200 && (await result.json()).ok === true);
  assert(result.headers.get('Access-Control-Allow-Origin') === config.origins[0]);
  const hashed = JSON.parse(String(calls[0].init?.body)).p_ip_hash;
  assert(hashed === await hashIp('198.51.100.9', config.ipSalt));
  const verification = calls[1].init?.body as URLSearchParams;
  assert(verification.get('remoteip') === '198.51.100.9');
  assert(verification.get('response') === valid.token);
  assert(calls[2].init?.body === JSON.stringify({name: 'Ada', email: 'ada@example.com', source: 'web'}));
});

Deno.test('Cloudflare client IP takes precedence over forwarded proxy hops', async () => {
  for (const forwarded of ['198.51.100.9, 192.0.2.1', null]) {
    const {handler, calls} = setup([json(1), json(captcha), new Response(null, {status: 201})]);
    const req = request();
    req.headers.set('cf-connecting-ip', '203.0.113.7');
    if (forwarded === null) {
      req.headers.delete('x-forwarded-for');
    } else {
      req.headers.set('x-forwarded-for', forwarded);
    }
    assert((await handler(req)).status === 200);
    assert(JSON.parse(String(calls[0].init?.body)).p_ip_hash === await hashIp('203.0.113.7', config.ipSalt));
    assert((calls[1].init?.body as URLSearchParams).get('remoteip') === '203.0.113.7');
  }
});

Deno.test('duplicates return exactly the same success as a new signup', async () => {
  const duplicate = setup([json(1), json(captcha), json({code: '23505', message: 'private detail'}, 409)]);
  const fresh = setup([json(1), json(captcha), new Response(null, {status: 201})]);
  const a = await duplicate.handler(request());
  const b = await fresh.handler(request());
  assert(a.status === b.status && await a.text() === await b.text());
});

Deno.test('CORS, methods, invalid and oversized bodies fail without upstream calls', async () => {
  const {handler, calls} = setup([]);
  const preflight = await handler(request(undefined, config.origins[0], 'OPTIONS'));
  assert(preflight.status === 204);
  const forbidden = await handler(request(valid, 'https://evil.example'));
  assert(forbidden.status === 403 && !forbidden.headers.has('Access-Control-Allow-Origin'));
  assert((await handler(request(valid, config.origins[0], 'GET'))).status === 405);
  assert((await handler(request({}))).status === 400);
  assert((await handler(request({name: 'x'.repeat(9000)}))).status === 400);
  const malformed = request();
  assert((await handler(new Request(malformed, {body: '{'}))).status === 400);
  assert(calls.length === 0);
});

Deno.test('missing config or client IP fails closed', async () => {
  assert((await createHandler(null, fetch, () => undefined)(request())).status === 503);
  const {handler, calls} = setup([]);
  const req = request();
  req.headers.delete('cf-connecting-ip');
  req.headers.delete('x-forwarded-for');
  assert((await handler(req)).status === 503 && calls.length === 0);
});

Deno.test('rate limit stops before CAPTCHA and insertion', async () => {
  const {handler, calls} = setup([json(6)]);
  assert((await handler(request())).status === 429 && calls.length === 1);
});

Deno.test('invalid CAPTCHA, hostname or action never inserts', async () => {
  for (const result of [{success: false}, {...captcha, hostname: 'evil.example'}, {...captcha, action: 'other'}]) {
    const {handler, calls} = setup([json(1), json(result)]);
    assert((await handler(request())).status === 400 && calls.length === 2);
  }
});

Deno.test('upstream failures are generic and fail closed', async () => {
  for (const responses of [
    [json({message: 'private detail'}, 500)],
    [json('invalid count')],
    [json(1), json({}, 500)],
    [json(1), json(captcha), json({message: 'private detail'}, 500)],
    [],
  ]) {
    const {handler, logs} = setup(responses);
    const result = await handler(request());
    assert(result.status === 503);
    assert((await result.text()) === JSON.stringify({message: 'Unable to join the waitlist. Please try again later.'}));
    assert(logs.length > 0);
  }
});
