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
    // The platform appends the real client address as the right-most hop; the left-most is client-controlled.
    method, headers: {origin, 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.1, 198.51.100.9'},
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
  for (const forwarded of ['192.0.2.1, 198.51.100.9', null]) {
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

// ---- Double opt-in (issue #28) ----
const emailConfig: Config = {
  ...config,
  email: {
    apiUrl: 'https://mail.example.com/emails', apiKey: 'mail-key',
    from: 'TapPay <hello@tappay.example>', confirmUrl: 'https://tappay.example/confirm',
  },
};

function setupEmail(responses: Response[], cfg: Config = emailConfig) {
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
  return {handler: createHandler(cfg, fetcher, message => logs.push(message)), calls, logs};
}
async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join('');
}
const SIGNUP_OK = () => [json(1), json(captcha), new Response(null, {status: 201})];

Deno.test('a new signup stores only a hashed token and emails a single-use link', async () => {
  const {handler, calls} = setupEmail([...SIGNUP_OK(), json('sent'), new Response(null, {status: 200})]);
  const res = await handler(request());
  assert(res.status === 200 && (await res.json()).ok === true);

  const issue = calls[3];
  assert(issue.url.endsWith('/rest/v1/rpc/issue_waitlist_confirmation'));
  const issued = JSON.parse(String(issue.init?.body));
  assert(issued.p_email === 'ada@example.com' && /^[0-9a-f]{64}$/.test(issued.p_token_hash));

  const mail = calls[4];
  assert(mail.url === 'https://mail.example.com/emails');
  assert((mail.init?.headers as Record<string, string>).Authorization === 'Bearer mail-key');
  const message = JSON.parse(String(mail.init?.body));
  assert(message.from === 'TapPay <hello@tappay.example>' && message.to[0] === 'ada@example.com');
  const link = /https:\/\/tappay\.example\/confirm\?token=([A-Za-z0-9_-]{43})/.exec(message.text);
  assert(link);
  // The database only ever sees the hash of the token that is in the email.
  assert(await sha256Hex(link[1]) === issued.p_token_hash);
  assert(!String(issue.init?.body).includes(link[1]));
  assert(message.html.includes(`token=${link[1]}`));
});

Deno.test('new, duplicate, confirmed and throttled signups get the identical response', async () => {
  const bodies: string[] = [];
  for (const issued of ['sent', 'throttled', 'confirmed', 'missing']) {
    const rows = [...SIGNUP_OK(), json(issued)];
    if (issued === 'sent') {
      rows.push(new Response(null, {status: 200}));
    }
    const res = await setupEmail(rows).handler(request());
    assert(res.status === 200);
    bodies.push(await res.text());
  }
  // a duplicate email (unique violation on insert) is also indistinguishable
  const dup = await setupEmail([json(1), json(captcha), json({code: '23505'}, 409), json('throttled')]).handler(request());
  assert(dup.status === 200);
  bodies.push(await dup.text());
  assert(new Set(bodies).size === 1);
});

Deno.test('no email is sent when the address is confirmed, throttled or unknown', async () => {
  for (const issued of ['throttled', 'confirmed', 'missing']) {
    const {handler, calls} = setupEmail([...SIGNUP_OK(), json(issued)]);
    await handler(request());
    assert(!calls.some(c => c.url === 'https://mail.example.com/emails'));
  }
});

Deno.test('a duplicate signup can still be sent a fresh link (resend path)', async () => {
  const {handler, calls} = setupEmail([json(1), json(captcha), json({code: '23505'}, 409), json('sent'), new Response(null, {status: 200})]);
  assert((await handler(request())).status === 200);
  assert(calls.some(c => c.url === 'https://mail.example.com/emails'));
});

Deno.test('email provider or token issue failures never leak and never fail the signup', async () => {
  const a = setupEmail([...SIGNUP_OK(), json('sent'), new Response('boom', {status: 500})]);
  const resA = await a.handler(request());
  assert(resA.status === 200 && (await resA.json()).ok === true);
  assert(a.logs.some(l => l.includes('not accepted')));

  const b = setupEmail([...SIGNUP_OK(), new Response(null, {status: 500})]);
  assert((await b.handler(request())).status === 200);
  assert(b.logs.some(l => l.includes('confirmation issue failed')));
  assert(!b.calls.some(c => c.url === 'https://mail.example.com/emails'));
});

Deno.test('without an email provider signups are stored unconfirmed and nothing is sent', async () => {
  const {handler, calls} = setup([json(1), json(captcha), new Response(null, {status: 201})]);
  assert((await handler(request())).status === 200);
  assert(calls.length === 3);
});

Deno.test('a spoofed left-most X-Forwarded-For does not change the rate-limit bucket', async () => {
  const hashes: string[] = [];
  for (const spoofed of ['10.9.9.9', '172.16.0.1']) {
    const {handler, calls} = setup([json(1), json(captcha), new Response(null, {status: 201})]);
    const req = request();
    req.headers.set('x-forwarded-for', `${spoofed}, 198.51.100.9`);
    assert((await handler(req)).status === 200);
    hashes.push(JSON.parse(String(calls[0].init?.body)).p_ip_hash);
  }
  assert(hashes[0] === hashes[1] && hashes[0] === await hashIp('198.51.100.9', config.ipSalt));
});
