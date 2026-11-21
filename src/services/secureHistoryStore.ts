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

function storageKey(walletAddress?: string): string {
  return walletAddress ? `${ENCRYPTED_STORAGE_KEY}:${walletAddress.toLowerCase()}` : ENCRYPTED_STORAGE_KEY;
}

function additionalData(walletAddress?: string): Uint8Array {
  return walletAddress ? ethers.toUtf8Bytes(`tappay-history|v1|${walletAddress.toLowerCase()}`) : AAD;
}

function encrypt(json: string, key: Uint8Array, walletAddress?: string): string {
  const nonce = ethers.randomBytes(NONCE_BYTES);
  const ciphertext = gcm(key, nonce, additionalData(walletAddress)).encrypt(ethers.toUtf8Bytes(json));
  const envelope: Envelope = {v: FORMAT_VERSION, n: ethers.encodeBase64(nonce), c: ethers.encodeBase64(ciphertext)};
  return JSON.stringify(envelope);
}

function decrypt(stored: string, key: Uint8Array, walletAddress?: string): string | null {
  try {
    const envelope = JSON.parse(stored) as Envelope;
    if (envelope?.v !== FORMAT_VERSION || typeof envelope.n !== 'string' || typeof envelope.c !== 'string') {
      return null;
    }
    const nonce = ethers.decodeBase64(envelope.n);
    if (nonce.length !== NONCE_BYTES) {
      return null;
    }
    return ethers.toUtf8String(gcm(key, nonce, additionalData(walletAddress)).decrypt(ethers.decodeBase64(envelope.c)));
  } catch {
    return null;
  }
}

/**
 * Persist the history JSON encrypted. Throws if it cannot be encrypted (nothing is written in
 * plaintext). Removes the legacy plaintext copy once the encrypted copy is stored.
 */
async function writeHistoryJson(json: string, walletAddress?: string): Promise<void> {
  const key = await getKey(true);
  if (!key) {
    throw new Error('History key unavailable');
  }
  await AsyncStorage.setItem(storageKey(walletAddress), encrypt(json, key, walletAddress));
  if (!walletAddress) {
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
  }
}

/**
 * Load the history JSON. Migrates a legacy plaintext copy on first run. Returns null when there
 * is nothing readable.
 */
async function readHistoryJson(walletAddress?: string, preserveUnreadable = false): Promise<string | null> {
  const stored = await AsyncStorage.getItem(storageKey(walletAddress));
  if (stored) {
    const key = await getKey(false);
    if (!key && preserveUnreadable) throw new Error('History key unavailable');
    const json = key ? decrypt(stored, key, walletAddress) : null;
    if (json === null) {
      // Tampered, or the key is gone: unrecoverable. Drop it rather than crash or loop.
      await AsyncStorage.removeItem(storageKey(walletAddress));
    }
    return json;
  }

  if (walletAddress) {
    return null;
  }
  const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) {
    return null;
  }
  try {
    await writeHistoryJson(legacy);
  } catch {
    // Could not encrypt right now: keep the legacy copy so nothing is lost, and retry next time.
  }
  return legacy;
}

type LegacyRow = Record<string, unknown> & {txHash: string};

function rowsFrom(json: string | null): LegacyRow[] {
  try {
    const rows = JSON.parse(json || '[]');
    return Array.isArray(rows) ? rows.filter(row => row && typeof row.txHash === 'string') : [];
  } catch {
    return [];
  }
}

function mergeRows(current: LegacyRow[], legacy: LegacyRow[]): LegacyRow[] {
  const seen = new Set<string>();
  return [...current, ...legacy].filter(row => {
    const identity = typeof row.id === 'string'
      ? `id:${row.id}`
      : `tx:${row.txHash.toLowerCase()}:${row.direction}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

let storageChain: Promise<unknown> = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const run = storageChain.then(operation);
  storageChain = run.catch(() => {});
  return run;
}

async function migrateLegacy(walletAddress: string): Promise<boolean> {
  const plaintext = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
  const encrypted = await AsyncStorage.getItem(ENCRYPTED_STORAGE_KEY);
  if (encrypted === null && plaintext === null) return false;
  let legacy: string | null = null;
  if (encrypted !== null) {
    const key = await getKey(false);
    if (!key) throw new Error('History key unavailable');
    legacy = decrypt(encrypted, key);
    if (legacy === null) throw new Error('Legacy history unreadable');
  }
  const rows = mergeRows(rowsFrom(legacy), rowsFrom(plaintext));
  const current = rowsFrom(await readHistoryJson(walletAddress, true));
  const merged = mergeRows(current, rows);
  await writeHistoryJson(JSON.stringify(merged), walletAddress);
  // Commit the scoped copy before consuming the source; retries deduplicate after interruption.
  await AsyncStorage.removeItem(ENCRYPTED_STORAGE_KEY);
  await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
  return true;
}

export function discardLegacyHistory(): Promise<void> {
  return serialize(async () => {
    await AsyncStorage.removeItem(ENCRYPTED_STORAGE_KEY);
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
  });
}

export function loadHistoryJson(walletAddress?: string): Promise<string | null> {
  return serialize(async () => {
    if (walletAddress) await migrateLegacy(walletAddress);
    return readHistoryJson(walletAddress);
  });
}

export function saveHistoryJson(json: string, walletAddress?: string): Promise<void> {
  return serialize(async () => {
    let snapshot = json;
    if (walletAddress) {
      await migrateLegacy(walletAddress);
      snapshot = JSON.stringify(mergeRows(rowsFrom(json), rowsFrom(await readHistoryJson(walletAddress, true))));
    }
    await writeHistoryJson(snapshot, walletAddress);
  });
}

/** Remove every stored copy of the history and its key. */
export async function clearHistoryStore(): Promise<void> {
  keyValue = null;
  const keys = await AsyncStorage.getAllKeys();
  await Promise.all(keys.filter(key => key.startsWith(`${ENCRYPTED_STORAGE_KEY}:`)).map(key => AsyncStorage.removeItem(key)));
  await AsyncStorage.removeItem(ENCRYPTED_STORAGE_KEY);
  await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
  try {
    await Keychain.resetGenericPassword({service: KEY_SERVICE});
  } catch {
    // Nothing to remove.
  }
}
