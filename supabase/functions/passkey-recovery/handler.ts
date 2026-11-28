import {buildPasskeyProofMessage} from './message.ts';
import {validatePasskeyRequest} from './validation.ts';
import {trustedClientIp} from '../_shared/client_ip.ts';

export type Config = {
  origins: string[];
  supabaseUrl: string;
  serviceKey: string;
};

// Recovers the EIP-191 signer of `message` for `signature`. Injected so tests can stub it.
export type VerifySignature = (message: string, signature: string) => string | null;

const GENERIC = {error: 'Unable to complete the request. Please try again.'};
const WINDOW_SECONDS = 600;
const READ_LIMIT = 30; // fetches per client per window
const WRITE_LIMIT = 20; // writes per wallet per window

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
      log('passkey-recovery: missing configuration');
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
      req = validatePasskeyRequest(await request.json());
    } catch {
      return reply(400);
    }
    if (!req) {
      return reply(400);
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

    // Returns true when the caller is over the limit.
    const limited = async (bucketSource: string, limit: number): Promise<boolean> => {
      const res = await rest('rpc/consume_passkey_recovery_rate_limit', {
        method: 'POST',
        body: JSON.stringify({p_bucket: await sha256Hex(bucketSource), p_window_seconds: WINDOW_SECONDS}),
      });
      if (!res.ok) {
        throw new Error('rate limiter unavailable');
      }
      const hits = Number(await res.json());
      return !Number.isFinite(hits) || hits > limit;
    };

    try {
      if (req.action === 'get') {
        // Blob reads are protected only by this per-client limit, so a caller without a trusted
        // address is refused rather than sharing one bucket with every other such caller.
        const ip = trustedClientIp(request);
        if (!ip) {
          log('passkey-recovery: missing trusted client IP');
          return reply(503);
        }
        if (await limited(`get:${ip}`, READ_LIMIT)) {
          return reply(429, {error: 'Too many attempts. Try again later.'});
        }
        const res = await rest(
          `passkey_recovery_blobs?select=ciphertext,nonce,version,wallet_address,updated_at&credential_id=eq.${req.credentialId}`,
          {method: 'GET'},
        );
        if (!res.ok) {
          log(`passkey-recovery: get failed (${res.status})`);
          return reply(503);
        }
        const rows = await res.json();
        if (!Array.isArray(rows) || rows.length !== 1) {
          return reply(404);
        }
        const row = rows[0];
        return reply(200, {
          ciphertext: row.ciphertext,
          nonce: row.nonce,
          version: row.version,
          walletAddress: row.wallet_address,
          updatedAt: row.updated_at,
        });
      }

      // put / delete: the caller must prove it controls the wallet that owns the blob.
      const message = buildPasskeyProofMessage({
        action: req.action,
        credentialId: req.credentialId,
        walletAddress: req.walletAddress,
        digest: req.digest,
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
      if (await limited(`write:${req.walletAddress}`, WRITE_LIMIT)) {
        return reply(429, {error: 'Too many attempts. Try again later.'});
      }

      // put: the digest signed by the wallet must match the blob actually sent.
      if (req.action === 'put' && req.digest !== (await sha256Hex(`${req.blob.ciphertext}.${req.blob.nonce}`))) {
        return reply(400);
      }

      // Single-use proofs: a captured put/delete is accepted at most once, so it cannot be resent
      // inside the freshness window (a replayed put would delete the wallet's newer blob). The
      // hash covers the signed message only: the message already binds action, credential,
      // wallet, digest and issuedAt, and leaving the signature out means a re-encoded signature
      // for the same message is still recognised as a replay.
      const consume = await rest('rpc/consume_passkey_proof', {
        method: 'POST',
        body: JSON.stringify({p_proof_hash: await sha256Hex(message)}),
      });
      if (!consume.ok) {
        log(`passkey-recovery: proof check failed (${consume.status})`);
        return reply(503);
      }
      if ((await consume.json().catch(() => null)) !== true) {
        return reply(409, {error: 'This request was already used. Please try again.', reason: 'replayed'});
      }

      if (req.action === 'delete') {
        const del = await rest(
          `passkey_recovery_blobs?credential_id=eq.${req.credentialId}&wallet_address=eq.${req.walletAddress}`,
          {method: 'DELETE', headers: {Prefer: 'return=minimal'}},
        );
        if (!del.ok) {
          log(`passkey-recovery: delete failed (${del.status})`);
          return reply(503);
        }
        return reply(200, {ok: true});
      }

      // Never overwrite a blob that belongs to a different wallet.
      const existing = await rest(
        `passkey_recovery_blobs?select=wallet_address&credential_id=eq.${req.credentialId}`,
        {method: 'GET'},
      );
      if (!existing.ok) {
        log(`passkey-recovery: lookup failed (${existing.status})`);
        return reply(503);
      }
      const owners = await existing.json();
      if (Array.isArray(owners) && owners.length > 0 && owners[0].wallet_address !== req.walletAddress) {
        return reply(409, {error: 'This passkey is already linked to another wallet.'});
      }
      // One blob per wallet: a new link replaces the previous one.
      const clear = await rest(
        `passkey_recovery_blobs?wallet_address=eq.${req.walletAddress}&credential_id=neq.${req.credentialId}`,
        {method: 'DELETE', headers: {Prefer: 'return=minimal'}},
      );
      if (!clear.ok) {
        log(`passkey-recovery: replace failed (${clear.status})`);
        return reply(503);
      }
      const put = await rest('passkey_recovery_blobs?on_conflict=credential_id', {
        method: 'POST',
        headers: {Prefer: 'resolution=merge-duplicates,return=minimal'},
        body: JSON.stringify({
          credential_id: req.credentialId,
          wallet_address: req.walletAddress,
          ciphertext: req.blob.ciphertext,
          nonce: req.blob.nonce,
          version: req.blob.version,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!put.ok) {
        log(`passkey-recovery: put failed (${put.status})`);
        return reply(503);
      }
      return reply(200, {ok: true});
    } catch {
      log('passkey-recovery: upstream request failed');
      return reply(503);
    }
  };
}
