/**
 * Native passkey provider (react-native-passkey, WebAuthn PRF).
 *
 * The passkey is used only as a keyed secret holder: the PRF output unlocks the recovery blob.
 * No server verifies the WebAuthn attestation/assertion, so the challenge is a local random
 * value. A discoverable, user-verified, platform credential is required.
 */

import {Passkey} from 'react-native-passkey';
import {ethers} from 'ethers';
import {PASSKEY_RP_ID, PASSKEY_RP_NAME, isPasskeyRecoveryConfigured} from '../../config/passkey';
import {PasskeyRecoveryError, fromBase64Url, prfSalt, toBase64Url} from './crypto';

export type PasskeyResult = {credentialId: string; prfOutput: Uint8Array};

export interface PasskeyProvider {
  isSupported(): boolean;
  /** Register a new passkey and return its credential id and PRF output. */
  create(): Promise<PasskeyResult>;
  /** Authenticate with a discoverable passkey and return its credential id and PRF output. */
  get(): Promise<PasskeyResult>;
}

function challenge(): string {
  return toBase64Url(ethers.randomBytes(32));
}

function prfFrom(result: {clientExtensionResults?: {prf?: {results?: {first?: unknown}}}}): Uint8Array | null {
  const first = result.clientExtensionResults?.prf?.results?.first;
  if (typeof first !== 'string' || first.length === 0) {
    return null;
  }
  try {
    const bytes = fromBase64Url(first);
    return bytes.length >= 32 ? bytes : null;
  } catch {
    return null;
  }
}

function mapError(error: unknown): PasskeyRecoveryError {
  if (error instanceof PasskeyRecoveryError) {
    return error;
  }
  const code = String((error as {error?: string})?.error ?? (error as Error)?.message ?? '');
  if (/cancel/i.test(code)) {
    return new PasskeyRecoveryError('CANCELLED', 'Passkey request was cancelled.');
  }
  if (/notsupported|not_supported/i.test(code)) {
    return new PasskeyRecoveryError('UNSUPPORTED', 'This phone does not support passkeys.');
  }
  if (/nocredentials|no_credentials|NoCreateOption/i.test(code)) {
    return new PasskeyRecoveryError('NOT_FOUND', 'No passkey was found on this phone.');
  }
  return new PasskeyRecoveryError('UNSUPPORTED', 'Could not use a passkey on this phone.');
}

function requireConfigured() {
  if (!isPasskeyRecoveryConfigured()) {
    throw new PasskeyRecoveryError('NOT_CONFIGURED', 'Passkey recovery is not available yet.');
  }
}

async function evaluate(credentialId?: string): Promise<PasskeyResult> {
  const result = await Passkey.get({
    challenge: challenge(),
    rpId: PASSKEY_RP_ID,
    userVerification: 'required',
    allowCredentials: credentialId ? [{type: 'public-key', id: credentialId}] : undefined,
    extensions: {prf: {eval: {first: prfSalt()}}},
  });
  const prfOutput = prfFrom(result);
  if (!prfOutput) {
    throw new PasskeyRecoveryError('PRF_UNSUPPORTED', 'This passkey cannot be used for recovery.');
  }
  return {credentialId: result.id, prfOutput};
}

export const nativePasskeyProvider: PasskeyProvider = {
  isSupported: () => {
    try {
      return Passkey.isSupported();
    } catch {
      return false;
    }
  },

  async create() {
    requireConfigured();
    try {
      const created = await Passkey.create({
        challenge: challenge(),
        rp: {id: PASSKEY_RP_ID, name: PASSKEY_RP_NAME},
        user: {
          id: toBase64Url(ethers.randomBytes(16)),
          name: 'TapPay recovery',
          displayName: 'TapPay recovery',
        },
        pubKeyCredParams: [
          {type: 'public-key', alg: -7},
          {type: 'public-key', alg: -257},
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'required',
          userVerification: 'required',
        },
        attestation: 'none',
        extensions: {prf: {eval: {first: prfSalt()}}},
      });
      if (created.clientExtensionResults?.prf?.enabled === false) {
        throw new PasskeyRecoveryError('PRF_UNSUPPORTED', 'This phone cannot use passkeys for recovery.');
      }
      const prfOutput = prfFrom(created);
      if (prfOutput) {
        return {credentialId: created.id, prfOutput};
      }
      // Some authenticators only return PRF results on assertion; evaluate once now.
      return await evaluate(created.id);
    } catch (error) {
      throw mapError(error);
    }
  },

  async get() {
    requireConfigured();
    try {
      return await evaluate();
    } catch (error) {
      throw mapError(error);
    }
  },
};
