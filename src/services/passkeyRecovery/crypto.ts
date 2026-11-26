/**
 * Passkey recovery crypto. See docs/PASSKEY_RECOVERY.md.
 *
 * The WebAuthn PRF output of the user's passkey is the only secret. It is stretched with
 * HKDF-SHA-256 into an AES-256-GCM key; the wallet's recovery phrase (or raw key) is encrypted
 * under it. The blob is bound by AEAD associated data to the credential id and wallet address
 * so it cannot be moved to another credential or wallet. Any failure is reported with one
 * generic error and never returns partial plaintext.
 */

import {gcm} from '@noble/ciphers/aes.js';
import {hkdf} from '@noble/hashes/hkdf';
import {sha256} from '@noble/hashes/sha256';
import {ethers} from 'ethers';

export const BLOB_VERSION = 1;
const PRF_SALT_LABEL = 'tappay/passkey-recovery/v1/prf-salt';
const KEY_INFO = 'tappay/passkey-recovery/v1/aes-gcm-key';
const AAD_LABEL = 'tappay-passkey-recovery';
const NONCE_BYTES = 12;
const MAX_SECRET_BYTES = 1024;

export type RecoverySecret = {t: 'phrase' | 'key'; v: string};

export type RecoveryBlob = {
  version: number;
  /** base64url(AES-GCM ciphertext || tag) */
  ciphertext: string;
  /** base64url(96-bit nonce) */
  nonce: string;
};

export class PasskeyRecoveryError extends Error {
  code: PasskeyRecoveryErrorCode;
  constructor(code: PasskeyRecoveryErrorCode, message: string) {
    super(message);
    this.name = 'PasskeyRecoveryError';
    this.code = code;
  }
}

export type PasskeyRecoveryErrorCode =
  | 'NOT_CONFIGURED'
  | 'UNSUPPORTED'
  | 'PRF_UNSUPPORTED'
  | 'CANCELLED'
  | 'NO_WALLET'
  | 'WALLET_EXISTS'
  | 'AUTH_FAILED'
  | 'NETWORK'
  | 'NOT_FOUND'
  | 'DECRYPT_FAILED'
  | 'INVALID_SECRET';

export function toBase64Url(bytes: Uint8Array): string {
  return ethers.encodeBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(value: string): Uint8Array {
  const std = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = std + '='.repeat((4 - (std.length % 4)) % 4);
  return ethers.decodeBase64(padded);
}

/** Fixed PRF input. The authenticator mixes it with a per-credential secret. */
export function prfSalt(): Uint8Array {
  return sha256(ethers.toUtf8Bytes(PRF_SALT_LABEL));
}

function deriveKey(prfOutput: Uint8Array, credentialId: string): Uint8Array {
  if (prfOutput.length < 32) {
    throw new PasskeyRecoveryError('DECRYPT_FAILED', 'Could not unlock the recovery data.');
  }
  return hkdf(sha256, prfOutput, ethers.toUtf8Bytes(credentialId), ethers.toUtf8Bytes(KEY_INFO), 32);
}

function aad(credentialId: string, walletAddress: string, version: number): Uint8Array {
  return ethers.toUtf8Bytes(
    [AAD_LABEL, `v${version}`, credentialId, walletAddress.toLowerCase()].join('|'),
  );
}

export function encryptRecovery(params: {
  secret: RecoverySecret;
  prfOutput: Uint8Array;
  credentialId: string;
  walletAddress: string;
}): RecoveryBlob {
  const {secret, prfOutput, credentialId, walletAddress} = params;
  const plaintext = ethers.toUtf8Bytes(JSON.stringify(secret));
  if (plaintext.length > MAX_SECRET_BYTES) {
    throw new PasskeyRecoveryError('INVALID_SECRET', 'The wallet secret is not valid.');
  }
  const key = deriveKey(prfOutput, credentialId);
  const nonce = ethers.randomBytes(NONCE_BYTES);
  try {
    const ciphertext = gcm(key, nonce, aad(credentialId, walletAddress, BLOB_VERSION)).encrypt(plaintext);
    return {version: BLOB_VERSION, ciphertext: toBase64Url(ciphertext), nonce: toBase64Url(nonce)};
  } finally {
    key.fill(0);
    plaintext.fill(0);
  }
}

export function decryptRecovery(params: {
  blob: RecoveryBlob;
  prfOutput: Uint8Array;
  credentialId: string;
  walletAddress: string;
}): RecoverySecret {
  const {blob, prfOutput, credentialId, walletAddress} = params;
  const fail = () => new PasskeyRecoveryError('DECRYPT_FAILED', 'Could not unlock the recovery data.');
  if (blob.version !== BLOB_VERSION) {
    throw fail();
  }
  let key: Uint8Array | null = null;
  let plaintext: Uint8Array | null = null;
  try {
    key = deriveKey(prfOutput, credentialId);
    const nonce = fromBase64Url(blob.nonce);
    if (nonce.length !== NONCE_BYTES) {
      throw fail();
    }
    plaintext = gcm(key, nonce, aad(credentialId, walletAddress, blob.version)).decrypt(
      fromBase64Url(blob.ciphertext),
    );
    const parsed = JSON.parse(ethers.toUtf8String(plaintext));
    if (
      !parsed ||
      (parsed.t !== 'phrase' && parsed.t !== 'key') ||
      typeof parsed.v !== 'string' ||
      parsed.v.length === 0
    ) {
      throw fail();
    }
    return {t: parsed.t, v: parsed.v};
  } catch {
    throw fail();
  } finally {
    key?.fill(0);
    plaintext?.fill(0);
  }
}

/** sha256 hex of "<ciphertext>.<nonce>"; signed by the wallet so a proof is bound to one blob. */
export function blobDigest(blob: Pick<RecoveryBlob, 'ciphertext' | 'nonce'>): string {
  return ethers.hexlify(sha256(ethers.toUtf8Bytes(`${blob.ciphertext}.${blob.nonce}`))).slice(2);
}
