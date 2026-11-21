import {buildUsernameAuthMessage, normalizeUsername} from './message.ts';
import {validateUsernameRequest} from './validation.ts';
import {isReservedUsername} from './reserved.ts';

export type Config = {
  origins: string[];
  supabaseUrl: string;
  serviceKey: string;
};

// Recovers the EIP-191 signer of `message` for `signature`. Injected so tests can stub it.
export type VerifySignature = (message: string, signature: string) => string | null;

const GENERIC = {error: 'Unable to complete the request. Please try again.'};

const WINDOW_SECONDS = 3600;
const REGISTER_LIMIT = 10; // registrations per client address per hour
const RELEASE_LIMIT = 20; // releases per client address per hour

function clientAddress(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export function createHandler(
  config: Config | null,
  verify: VerifySignature,
  fetcher: typeof fetch = fetch,
  log: (message: string) => void = console.error,
) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin') || '';
    const allowOrigin = config?.origins.includes(origin) ?? false;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
    };
    // App (no browser Origin) is allowed; browsers are restricted to configured origins.
    if (origin && allowOrigin) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'authorization, apikey, content-type, x-client-info';
    }
    const reply = (status: number, body: Record<string, unknown> = GENERIC) =>
      new Response(JSON.stringify(body), {status, headers});

    if (!config) {
      log('register-username: missing configuration');
      return reply(503);
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, {status: 204, headers});
    }
    if (origin && !allowOrigin) {
      return reply(403);
    }
    if (request.method !== 'POST') {
      return reply(405);
    }
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      return reply(400);
    }

    let req;
    try {
      req = validateUsernameRequest(await request.json());
    } catch {
      return reply(400);
    }
    if (!req) {
      return reply(400);
    }

    if (req.action === 'register' && isReservedUsername(normalizeUsername(req.username))) {
      return reply(400, {error: 'That username is reserved. Please choose another.', reason: 'reserved'});
    }

    // Verify wallet ownership: the recovered signer must equal the claimed wallet.
    const message = buildUsernameAuthMessage({
      action: req.action,
      username: req.username,
      walletAddress: req.walletAddress,
      chainId: req.chainId,
      issuedAt: req.issuedAt,
    });
    let recovered: string | null;
    try {
      recovered = verify(message, req.signature);
    } catch {
      recovered = null;
    }
    if (!recovered || recovered.toLowerCase() !== req.walletAddress) {
      return reply(401, {error: 'Signature does not match the wallet.'});
    }

    const api = {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      'Content-Type': 'application/json',
    };
    const rest = (path: string, init: RequestInit) =>
      fetcher(`${config.supabaseUrl}/rest/v1/${path}`, {
        ...init,
        headers: {...api, ...(init.headers as Record<string, string>)},
        signal: AbortSignal.timeout(10000),
      });

    try {
      // Rate limit verified requests per client address. Wallets are free to generate, so a valid
      // signature alone does not stop mass squatting. Fails closed if the limiter is down.
      const isRegister = req.action === 'register';
      const limiter = await rest('rpc/consume_username_rate_limit', {
        method: 'POST',
        body: JSON.stringify({
          p_bucket: await sha256Hex(`${req.action}:${clientAddress(request)}`),
          p_window_seconds: WINDOW_SECONDS,
        }),
      });
      if (!limiter.ok) {
        log(`register-username: rate limiter failed (${limiter.status})`);
        return reply(503);
      }
      const hits = Number(await limiter.json().catch(() => NaN));
      if (!Number.isFinite(hits) || hits > (isRegister ? REGISTER_LIMIT : RELEASE_LIMIT)) {
        return reply(429, {error: 'Too many attempts. Please try again later.', reason: 'rate_limited'});
      }

      // Single-use proofs: a captured {message, signature} pair is accepted at most once, so it
      // cannot be replayed inside the freshness window. The wallet signs a new proof per request.
      const consume = await rest('rpc/consume_username_proof', {
        method: 'POST',
        body: JSON.stringify({p_proof_hash: await sha256Hex(`${message}\n${req.signature.toLowerCase()}`)}),
      });
      if (!consume.ok) {
        log(`register-username: proof check failed (${consume.status})`);
        return reply(503);
      }
      if ((await consume.json().catch(() => null)) !== true) {
        return reply(409, {error: 'This request was already used. Please try again.', reason: 'replayed'});
      }

      if (req.action === 'release') {
        // Release exactly what the wallet signed: the delete is scoped to the signed username,
        // not to whatever username the wallet currently holds.
        const del = await rest(
          `usernames?wallet_address=eq.${req.walletAddress}` +
            `&normalized_username=eq.${normalizeUsername(req.username)}&chain_id=eq.143`,
          {method: 'DELETE', headers: {Prefer: 'return=representation'}},
        );
        if (!del.ok) {
          log(`register-username: release failed (${del.status})`);
          return reply(503);
        }
        const removed = await del.json().catch(() => null);
        if (!Array.isArray(removed) || removed.length === 0) {
          return reply(404, {error: 'That username is not registered to this wallet.', reason: 'not_found'});
        }
        return reply(200, {ok: true});
      }

      // register: refuse if this wallet already holds a username, or the name is taken.
      const walletRows = await rest(
        `usernames?select=username&wallet_address=eq.${req.walletAddress}&chain_id=eq.143`,
        {method: 'GET'},
      );
      if (walletRows.ok && Array.isArray(await walletRows.clone().json()) &&
          (await walletRows.json()).length > 0) {
        return reply(409, {error: 'This wallet already has a username.', reason: 'wallet_taken'});
      }

      const normalized = normalizeUsername(req.username);
      const insert = await rest('usernames', {
        method: 'POST',
        headers: {Prefer: 'return=minimal'},
        body: JSON.stringify({
          username: req.username,
          normalized_username: normalized,
          wallet_address: req.walletAddress,
          chain_id: 143,
        }),
      });
      if (insert.ok) {
        return reply(200, {ok: true, walletAddress: req.walletAddress});
      }
      const body = await insert.json().catch(() => ({}));
      if (insert.status === 409 || body.code === '23505') {
        const reason = String(body.message || '').includes('wallet') ? 'wallet_taken' : 'taken';
        return reply(409, {error: 'Already registered.', reason});
      }
      log(`register-username: insert failed (${insert.status})`);
      return reply(503);
    } catch {
      log('register-username: upstream request failed');
      return reply(503);
    }
  };
}
