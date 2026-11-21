export type Config = {
  origins: string[];
  supabaseUrl: string;
  serviceKey: string;
  ipSalt: string;
  limit: number;
};

const INVALID = {message: 'This confirmation link is invalid or has expired.'};
const FAILURE = {message: 'Unable to confirm right now. Please try again later.'};
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/; // 32 random bytes, base64url

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
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
    const reply = (status: number, body: Record<string, unknown> = FAILURE) =>
      new Response(JSON.stringify(body), {status, headers});

    if (!config) {
      log('waitlist-confirm: missing or invalid server configuration');
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
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      return reply(400, INVALID);
    }

    let token: unknown;
    try {
      token = (await request.json())?.token;
    } catch {
      return reply(400, INVALID);
    }
    if (typeof token !== 'string' || !TOKEN_RE.test(token)) {
      return reply(400, INVALID);
    }

    const ip = request.headers.get('cf-connecting-ip')?.trim() ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (!ip || ip.length > 45 || !/^[0-9a-fA-F:.]+$/.test(ip)) {
      log('waitlist-confirm: missing trusted client IP');
      return reply(503);
    }

    try {
      const apiHeaders = {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        'Content-Type': 'application/json',
      };
      // Throttle guessing. Tokens are 256-bit random, so this is defense in depth.
      const limiter = await fetcher(`${config.supabaseUrl}/rest/v1/rpc/consume_waitlist_rate_limit`, {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({p_ip_hash: await sha256Hex(`confirm:${config.ipSalt}:${ip.toLowerCase()}`)}),
        signal: AbortSignal.timeout(10000),
      });
      if (!limiter.ok) {
        log(`waitlist-confirm: rate limiter failed (${limiter.status})`);
        return reply(503);
      }
      const count = await limiter.json();
      if (!Number.isSafeInteger(count) || count < 1) {
        log('waitlist-confirm: invalid rate limiter result');
        return reply(503);
      }
      if (count > config.limit) {
        return reply(429, {message: 'Too many attempts. Please try again later.'});
      }

      const confirm = await fetcher(`${config.supabaseUrl}/rest/v1/rpc/confirm_waitlist_email`, {
        method: 'POST', headers: apiHeaders,
        body: JSON.stringify({p_token_hash: await sha256Hex(token)}),
        signal: AbortSignal.timeout(10000),
      });
      if (!confirm.ok) {
        log(`waitlist-confirm: confirm failed (${confirm.status})`);
        return reply(503);
      }
      // Unknown, expired and already used tokens are indistinguishable.
      return (await confirm.json()) === true ? reply(200, {ok: true}) : reply(400, INVALID);
    } catch {
      log('waitlist-confirm: upstream request failed');
      return reply(503);
    }
  };
}
