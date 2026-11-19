import {UsernameAction} from './message.ts';

export type UsernameRequest = {
  action: UsernameAction;
  username: string;
  walletAddress: string;
  chainId: number;
  issuedAt: string;
  signature: string;
};

const USERNAME_RE = /^[a-z0-9]{3,20}$/;
const ADDRESS_RE = /^0x[0-9a-f]{40}$/;
const SIGNATURE_RE = /^0x[0-9a-fA-F]{130}$/;
const CHAIN_ID = 143;
// Reject stale / future-dated proofs to bound replay.
const MAX_AGE_MS = 5 * 60 * 1000;

export function validateUsernameRequest(value: unknown, now: number = Date.now()): UsernameRequest | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const {action, username, walletAddress, chainId, issuedAt, signature} = value as Record<string, unknown>;
  if (action !== 'register' && action !== 'release') {
    return null;
  }
  if (
    typeof username !== 'string' ||
    typeof walletAddress !== 'string' ||
    typeof issuedAt !== 'string' ||
    typeof signature !== 'string' ||
    typeof chainId !== 'number'
  ) {
    return null;
  }
  const normalizedAddress = walletAddress.toLowerCase();
  const normalizedUsername = username.toLowerCase();
  if (!USERNAME_RE.test(normalizedUsername) || !ADDRESS_RE.test(normalizedAddress) ||
      !SIGNATURE_RE.test(signature) || chainId !== CHAIN_ID) {
    return null;
  }
  const issued = Date.parse(issuedAt);
  if (!Number.isFinite(issued) || Math.abs(now - issued) > MAX_AGE_MS) {
    return null;
  }
  return {
    action,
    username: normalizedUsername,
    walletAddress: normalizedAddress,
    chainId,
    issuedAt,
    signature,
  };
}
