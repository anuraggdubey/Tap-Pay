/**
 * Encrypted storage for the transaction history.
 *
 * The history (counterparties, amounts, usernames, tx hashes) is sensitive. AsyncStorage on
 * Android is a plaintext file, so the JSON is encrypted with AES-256-GCM before it is written.
 * The 256-bit key is random, lives in the Android Keystore through react-native-keychain
 * (AES_GCM_NO_AUTH, so no prompt just to open History) and never in AsyncStorage.
 *
 * Fail closed: if the key is unavailable nothing is written in plaintext. If the stored blob
 * cannot be decrypted (tampered, or the key was lost) it is dropped and history starts empty
 * instead of crashing. History is a local convenience; the chain is the source of truth.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import {gcm} from '@noble/ciphers/aes.js';
import {ethers} from 'ethers';

/** Legacy plaintext location (pre-encryption installs). Migrated and removed. */
const LEGACY_STORAGE_KEY = '@tappay_tx_history';
const ENCRYPTED_STORAGE_KEY = '@tappay_tx_history_v2';
const KEY_SERVICE = 'tappay.history.key';
const FORMAT_VERSION = 1;
const NONCE_BYTES = 12;
const AAD = ethers.toUtf8Bytes('tappay-history|v1');

type Envelope = {v: number; n: string; c: string};

let keyValue: Uint8Array | null = null;
// Key operations run one at a time so a load and a save cannot race to create two keys.
let keyChain: Promise<unknown> = Promise.resolve();

function keychainOptions(): Keychain.SetOptions {
  return {
    service: KEY_SERVICE,
    storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    accessible: Keychain.ACCESSIBLE?.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };
}

async function readKey(): Promise<Uint8Array | null> {
  const stored = await Keychain.getGenericPassword({service: KEY_SERVICE});
  if (!stored || !stored.password) {
    return null;
  }
  const bytes = ethers.decodeBase64(stored.password);
  return bytes.length === 32 ? bytes : null;
}

/** Load the key, creating it on first use when `create` is true. Only a real key is cached. */
function getKey(create: boolean): Promise<Uint8Array | null> {
  const run = keyChain.then(async (): Promise<Uint8Array | null> => {
    if (keyValue) {
      return keyValue;
    }
    try {
      const existing = await readKey();
      if (existing) {
        keyValue = existing;
        return existing;
      }
      if (!create) {
        return null;
      }
      const fresh = ethers.randomBytes(32);
      const saved = await Keychain.setGenericPassword('history', ethers.encodeBase64(fresh), keychainOptions());
      if (saved) {
        keyValue = fresh;
        return fresh;
      }
      return null;
    } catch {
      return null;
    }
  });
  keyChain = run;
  return run;
}

function encrypt(json: string, key: Uint8Array): string {
  const nonce = ethers.randomBytes(NONCE_BYTES);
  const ciphertext = gcm(key, nonce, AAD).encrypt(ethers.toUtf8Bytes(json));
  const envelope: Envelope = {v: FORMAT_VERSION, n: ethers.encodeBase64(nonce), c: ethers.encodeBase64(ciphertext)};
  return JSON.stringify(envelope);
}

function decrypt(stored: string, key: Uint8Array): string | null {
  try {
    const envelope = JSON.parse(stored) as Envelope;
    if (envelope?.v !== FORMAT_VERSION || typeof envelope.n !== 'string' || typeof envelope.c !== 'string') {
      return null;
    }
    const nonce = ethers.decodeBase64(envelope.n);
    if (nonce.length !== NONCE_BYTES) {
      return null;
    }
    return ethers.toUtf8String(gcm(key, nonce, AAD).decrypt(ethers.decodeBase64(envelope.c)));
  } catch {
    return null;
  }
}

/**
 * Persist the history JSON encrypted. Throws if it cannot be encrypted (nothing is written in
 * plaintext). Removes the legacy plaintext copy once the encrypted copy is stored.
 */
export async function saveHistoryJson(json: string): Promise<void> {
  const key = await getKey(true);
  if (!key) {
    throw new Error('History key unavailable');
  }
  await AsyncStorage.setItem(ENCRYPTED_STORAGE_KEY, encrypt(json, key));
  await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
}

/**
 * Load the history JSON. Migrates a legacy plaintext copy on first run. Returns null when there
 * is nothing readable.
 */
export async function loadHistoryJson(): Promise<string | null> {
  const stored = await AsyncStorage.getItem(ENCRYPTED_STORAGE_KEY);
  if (stored) {
    const key = await getKey(false);
    const json = key ? decrypt(stored, key) : null;
    if (json === null) {
      // Tampered, or the key is gone: unrecoverable. Drop it rather than crash or loop.
      await AsyncStorage.removeItem(ENCRYPTED_STORAGE_KEY);
    }
    return json;
  }

  const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) {
    return null;
  }
  try {
    await saveHistoryJson(legacy);
  } catch {
    // Could not encrypt right now: keep the legacy copy so nothing is lost, and retry next time.
  }
  return legacy;
}

/** Remove every stored copy of the history and its key. */
export async function clearHistoryStore(): Promise<void> {
  keyValue = null;
  await AsyncStorage.removeItem(ENCRYPTED_STORAGE_KEY);
  await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
  try {
    await Keychain.resetGenericPassword({service: KEY_SERVICE});
  } catch {
    // Nothing to remove.
  }
}
