import {hashIp, validateSignup} from './validation.ts';

export type Config = {
  origins: string[];
  supabaseUrl: string;
  serviceKey: string;
  turnstileSecret: string;
  ipSalt: string;
  limit: number;
};

const FAILURE = {message: 'Unable to join the waitlist. Please try again later.'};
const SUCCESS = {ok: true};

async function readBody(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new Error('invalid content type');
  }
  const reader = request.body?.getReader();
  if (!reader) {
    return null;
  }
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) {
      break;
    }
    length += value.length;
    if (length > 8192) {
      await reader.cancel();
      throw new Error('body too large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function createHandler(config: Config | null, fetcher: typeof fetch = fetch,
  log: (message: string) => void = console.error) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin') || '';
    const allowed = config?.origins.includes(origin) ?? false;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
    };
    if (allowed) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'authorization, apikey, content-type, x-client-info';
    }
    const reply = (status: number, body = FAILURE) =>
      new Response(JSON.stringify(body), {status, headers});
    if (!config) {
      log('waitlist: missing or invalid server configuration');
      return reply(503);
    }
    if (!allowed) {
      return reply(403);
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, {status: 204, headers});
    }
    if (request.method !== 'POST') {
      return reply(405);
    }
    let signup;
    try {
      signup = validateSignup(await readBody(request));
    } catch {
      return reply(400);
    }
    if (!signup) {
      return reply(400);
    }

    // The gateway must overwrite/append this header; never trust a client-supplied first hop.
    const ip = request.headers.get('x-forwarded-for')?.split(',').pop()?.trim();
    if (!ip || ip.length > 45 || !/^[0-9a-fA-F:.]+$/.test(ip)) {
      log('waitlist: missing trusted client IP');
      return reply(503);
    }
    try {
      const apiHeaders = {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        'Content-Type': 'application/json',
      };
      const countResponse = await fetcher(`${config.supabaseUrl}/rest/v1/rpc/consume_waitlist_rate_limit`, {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({p_ip_hash: await hashIp(ip.toLowerCase(), config.ipSalt)}),
        signal: AbortSignal.timeout(10000),
      });
      if (!countResponse.ok) {
        log(`waitlist: rate limiter failed (${countResponse.status})`);
        return reply(503);
      }
      const count = await countResponse.json();
      if (!Number.isSafeInteger(count) || count < 1) {
        log('waitlist: invalid rate limiter result');
        return reply(503);
      }
      if (count > config.limit) {
        return reply(429);
      }
      const verification = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: new URLSearchParams({secret: config.turnstileSecret, response: signup.token, remoteip: ip}),
        signal: AbortSignal.timeout(10000),
      });
      if (!verification.ok) {
        log(`waitlist: CAPTCHA service failed (${verification.status})`);
        return reply(503);
      }
      const result = await verification.json();
      if (result.success !== true || result.hostname !== new URL(origin).hostname ||
          result.action !== 'waitlist-signup') {
        log('waitlist: CAPTCHA rejected');
        return reply(400);
      }
      const insert = await fetcher(`${config.supabaseUrl}/rest/v1/waitlist`, {
        method: 'POST', headers: {...apiHeaders, Prefer: 'return=minimal'},
        body: JSON.stringify({name: signup.name, email: signup.email, source: 'web'}),
        signal: AbortSignal.timeout(10000),
      });
      if (!insert.ok) {
        const error = await insert.json();
        if (insert.status !== 409 || error.code !== '23505') {
          log(`waitlist: insert failed (${insert.status})`);
          return reply(503);
        }
      }
      return new Response(JSON.stringify(SUCCESS), {status: 200, headers});
    } catch {
      log('waitlist: upstream request failed');
      return reply(503);
    }
  };
}
