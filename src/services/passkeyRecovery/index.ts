/**
 * Passkey recovery: link, recover and remove. See docs/PASSKEY_RECOVERY.md.
 *
 * The wallet key stays device-generated and Keystore-held. A passkey only unlocks an
 * encrypted copy of the recovery phrase (or raw key). This module never logs, displays or
 * copies a secret, and returns it only to the caller that must import it.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {ethers} from 'ethers';
import {isPasskeyRecoveryConfigured} from '../../config/passkey';
import {hasWallet, signMessage} from '../wallet';
import {isPrivateKeyHex, isValidRecoveryPhrase, normalizeMnemonic, walletFromRecoveryPhrase} from '../../utils/recovery';
import {
  PasskeyRecoveryError,
  RecoverySecret,
  blobDigest,
  decryptRecovery,
  encryptRecovery,
} from './crypto';
import {buildPasskeyProofMessage} from './message';
import {nativePasskeyProvider, PasskeyProvider} from './provider';
import {PasskeyRecoveryApi, supabasePasskeyApi} from './api';

export {PasskeyRecoveryError} from './crypto';
export type {PasskeyRecoveryErrorCode, RecoverySecret} from './crypto';

const STATUS_KEY = '@tappay_passkey_recovery';

export type PasskeyStatus = {linked: boolean; credentialId?: string; updatedAt?: string};

export type Deps = {
  provider: PasskeyProvider;
  api: PasskeyRecoveryApi;
  /** Wallet signature over a proof message. Prompts for device authentication. */
  sign: (message: string) => Promise<string | null>;
  walletExists: () => Promise<boolean>;
  now: () => Date;
};

export function defaultDeps(): Deps {
  return {
    provider: nativePasskeyProvider,
    api: supabasePasskeyApi,
    sign: message => signMessage(message, 'Confirm to update passkey recovery'),
    walletExists: hasWallet,
    now: () => new Date(),
  };
}

/** The address a secret controls, or null if it is not a valid phrase / key. */
export function addressOfSecret(secret: RecoverySecret): string | null {
  try {
    if (secret.t === 'phrase') {
      const phrase = normalizeMnemonic(secret.v);
      return isValidRecoveryPhrase(phrase) ? walletFromRecoveryPhrase(phrase).address : null;
    }
    return isPrivateKeyHex(secret.v) ? ethers.computeAddress(secret.v) : null;
  } catch {
    return null;
  }
}

export async function getPasskeyStatus(): Promise<PasskeyStatus> {
  try {
    const raw = await AsyncStorage.getItem(STATUS_KEY);
    if (!raw) {
      return {linked: false};
    }
    const parsed = JSON.parse(raw);
    return typeof parsed?.credentialId === 'string'
      ? {linked: true, credentialId: parsed.credentialId, updatedAt: parsed.updatedAt}
      : {linked: false};
  } catch {
    return {linked: false};
  }
}

async function setStatus(status: {credentialId: string; updatedAt: string} | null) {
  if (!status) {
    await AsyncStorage.removeItem(STATUS_KEY);
    return;
  }
  await AsyncStorage.setItem(STATUS_KEY, JSON.stringify(status));
}

/** Local status must never outlive the wallet (reset / restore). */
export async function clearPasskeyStatus() {
  await AsyncStorage.removeItem(STATUS_KEY).catch(() => {});
}

/**
 * Link a passkey to the existing device wallet.
 * `secret` must be the wallet's own recovery phrase / key (loaded by the caller after device
 * authentication) and `walletAddress` its address.
 */
export async function linkPasskey(
  secret: RecoverySecret,
  walletAddress: string,
  deps: Deps = defaultDeps(),
): Promise<PasskeyStatus> {
  if (!isPasskeyRecoveryConfigured()) {
    throw new PasskeyRecoveryError('NOT_CONFIGURED', 'Passkey recovery is not available yet.');
  }
  if (!(await deps.walletExists())) {
    throw new PasskeyRecoveryError('NO_WALLET', 'Create or restore a wallet first.');
  }
  const derived = addressOfSecret(secret);
  if (!derived || derived.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new PasskeyRecoveryError('INVALID_SECRET', 'The wallet secret is not valid.');
  }
  if (!deps.provider.isSupported()) {
    throw new PasskeyRecoveryError('UNSUPPORTED', 'This phone does not support passkeys.');
  }

  const {credentialId, prfOutput} = await deps.provider.create();
  try {
    const blob = encryptRecovery({secret, prfOutput, credentialId, walletAddress});
    const issuedAt = deps.now().toISOString();
    const digest = blobDigest(blob);
    const signature = await deps.sign(
      buildPasskeyProofMessage({action: 'put', credentialId, walletAddress, digest, issuedAt}),
    );
    if (!signature) {
      throw new PasskeyRecoveryError('AUTH_FAILED', 'Authentication was cancelled.');
    }
    await deps.api.put({
      action: 'put',
      credentialId,
      walletAddress: walletAddress.toLowerCase(),
      digest,
      issuedAt,
      signature,
      blob,
    });
    await setStatus({credentialId, updatedAt: issuedAt});
    return {linked: true, credentialId, updatedAt: issuedAt};
  } finally {
    prfOutput.fill(0);
  }
}

/**
 * Recover a wallet secret with a passkey on a phone that has no wallet. Returns the secret
 * and its address; the caller imports it through the normal Keystore import path.
 */
export async function recoverWithPasskey(
  deps: Deps = defaultDeps(),
): Promise<{secret: RecoverySecret; address: string}> {
  if (!isPasskeyRecoveryConfigured()) {
    throw new PasskeyRecoveryError('NOT_CONFIGURED', 'Passkey recovery is not available yet.');
  }
  if (await deps.walletExists()) {
    throw new PasskeyRecoveryError('WALLET_EXISTS', 'This phone already has a wallet.');
  }
  if (!deps.provider.isSupported()) {
    throw new PasskeyRecoveryError('UNSUPPORTED', 'This phone does not support passkeys.');
  }

  const {credentialId, prfOutput} = await deps.provider.get();
  try {
    const stored = await deps.api.get(credentialId);
    const secret = decryptRecovery({
      blob: {version: stored.version, ciphertext: stored.ciphertext, nonce: stored.nonce},
      prfOutput,
      credentialId,
      walletAddress: stored.walletAddress,
    });
    const address = addressOfSecret(secret);
    if (!address || address.toLowerCase() !== stored.walletAddress.toLowerCase()) {
      throw new PasskeyRecoveryError('DECRYPT_FAILED', 'Could not unlock the recovery data.');
    }
    return {secret, address};
  } finally {
    prfOutput.fill(0);
  }
}

/** Remove passkey recovery (deletes the stored blob). Requires device authentication. */
export async function removePasskey(
  walletAddress: string,
  deps: Deps = defaultDeps(),
): Promise<PasskeyStatus> {
  const status = await getPasskeyStatus();
  if (!status.linked || !status.credentialId) {
    return {linked: false};
  }
  const issuedAt = deps.now().toISOString();
  const signature = await deps.sign(
    buildPasskeyProofMessage({
      action: 'delete',
      credentialId: status.credentialId,
      walletAddress,
      digest: '-',
      issuedAt,
    }),
  );
  if (!signature) {
    throw new PasskeyRecoveryError('AUTH_FAILED', 'Authentication was cancelled.');
  }
  await deps.api.remove({
    action: 'delete',
    credentialId: status.credentialId,
    walletAddress: walletAddress.toLowerCase(),
    digest: '-',
    issuedAt,
    signature,
  });
  await setStatus(null);
  return {linked: false};
}

/** Friendly text for any failure. Never includes secrets. */
export function passkeyErrorMessage(error: unknown): string {
  if (error instanceof PasskeyRecoveryError) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
