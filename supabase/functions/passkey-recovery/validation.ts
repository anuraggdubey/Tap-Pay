export type Blob = {ciphertext: string; nonce: string; version: number};

export type PutRequest = {
  action: 'put';
  credentialId: string;
  walletAddress: string;
  digest: string;
  issuedAt: string;
  signature: string;
  blob: Blob;
};
export type DeleteRequest = {
  action: 'delete';
  credentialId: string;
  walletAddress: string;
  digest: '-';
  issuedAt: string;
  signature: string;
};
export type GetRequest = {action: 'get'; credentialId: string};
export type PasskeyRequest = PutRequest | DeleteRequest | GetRequest;

const CREDENTIAL_RE = /^[A-Za-z0-9_-]{16,512}$/;
const CIPHERTEXT_RE = /^[A-Za-z0-9_-]{16,4096}$/;
const NONCE_RE = /^[A-Za-z0-9_-]{16}$/;
const ADDRESS_RE = /^0x[0-9a-f]{40}$/;
const SIGNATURE_RE = /^0x[0-9a-fA-F]{130}$/;
const DIGEST_RE = /^[0-9a-f]{64}$/;
// Reject stale / future-dated proofs to bound replay.
const MAX_AGE_MS = 5 * 60 * 1000;

export function validatePasskeyRequest(value: unknown, now: number = Date.now()): PasskeyRequest | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const v = value as Record<string, unknown>;
  if (typeof v.credentialId !== 'string' || !CREDENTIAL_RE.test(v.credentialId)) {
    return null;
  }
  if (v.action === 'get') {
    return {action: 'get', credentialId: v.credentialId};
  }
  if (v.action !== 'put' && v.action !== 'delete') {
    return null;
  }
  if (
    typeof v.walletAddress !== 'string' ||
    typeof v.issuedAt !== 'string' ||
    typeof v.signature !== 'string' ||
    typeof v.digest !== 'string'
  ) {
    return null;
  }
  const walletAddress = v.walletAddress.toLowerCase();
  if (!ADDRESS_RE.test(walletAddress) || !SIGNATURE_RE.test(v.signature)) {
    return null;
  }
  const issued = Date.parse(v.issuedAt);
  if (!Number.isFinite(issued) || Math.abs(now - issued) > MAX_AGE_MS) {
    return null;
  }
  const base = {
    credentialId: v.credentialId,
    walletAddress,
    issuedAt: v.issuedAt,
    signature: v.signature,
  };
  if (v.action === 'delete') {
    return v.digest === '-' ? {action: 'delete', ...base, digest: '-'} : null;
  }
  const blob = v.blob as Record<string, unknown> | undefined;
  if (
    !blob ||
    typeof blob.ciphertext !== 'string' ||
    typeof blob.nonce !== 'string' ||
    blob.version !== 1 ||
    !CIPHERTEXT_RE.test(blob.ciphertext) ||
    !NONCE_RE.test(blob.nonce) ||
    !DIGEST_RE.test(v.digest)
  ) {
    return null;
  }
  return {
    action: 'put',
    ...base,
    digest: v.digest,
    blob: {ciphertext: blob.ciphertext, nonce: blob.nonce, version: 1},
  };
}
