/**
 * Recovery phrase helpers (BIP-39). Pure functions, no storage, no logging.
 */

import 'react-native-get-random-values';
import '@ethersproject/shims';
import {ethers} from 'ethers';

export const RECOVERY_WORD_COUNT = 12;
export const VERIFY_WORD_COUNT = 3;

/** Lowercase, trim and collapse whitespace so pasted/typed phrases compare equal. */
export function normalizeMnemonic(input: string): string {
  return input.trim().toLowerCase().split(/\s+/).filter(Boolean).join(' ');
}

/**
 * True only for a valid 12-word English BIP-39 phrase with a correct checksum.
 */
export function isValidRecoveryPhrase(input: string): boolean {
  const phrase = normalizeMnemonic(input);
  if (phrase.split(' ').length !== RECOVERY_WORD_COUNT) {
    return false;
  }
  try {
    return ethers.Mnemonic.isValidMnemonic(phrase);
  } catch {
    return false;
  }
}

/** Derive the wallet (m/44'/60'/0'/0/0) for a validated phrase. Throws on invalid input. */
export function walletFromRecoveryPhrase(input: string): ethers.HDNodeWallet {
  const phrase = normalizeMnemonic(input);
  if (!isValidRecoveryPhrase(phrase)) {
    throw new Error('Invalid recovery phrase');
  }
  return ethers.Wallet.fromPhrase(phrase);
}

/** True for a 0x-prefixed 32-byte hex private key. */
export function isPrivateKeyHex(input: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(input.trim());
}

/** Unbiased secure random integer in [0, max) using rejection sampling. */
export function secureRandomInt(max: number): number {
  if (!Number.isInteger(max) || max < 1 || max > 0x10000) {
    throw new Error('Invalid range');
  }
  const space = 0x100000000;
  const limit = space - (space % max);
  let value: number;
  do {
    const b = ethers.randomBytes(4);
    value = ((b[0] << 24) >>> 0) + (b[1] << 16) + (b[2] << 8) + b[3];
  } while (value >= limit);
  return value % max;
}

/**
 * Pick `count` distinct word positions (0-based, ascending) to quiz the user on.
 * `rand` must return an integer in [0, max).
 */
export function pickVerificationIndices(
  wordCount: number = RECOVERY_WORD_COUNT,
  count: number = VERIFY_WORD_COUNT,
  rand: (max: number) => number = secureRandomInt,
): number[] {
  if (count > wordCount || count < 1) {
    throw new Error('Invalid verification parameters');
  }
  const chosen = new Set<number>();
  while (chosen.size < count) {
    chosen.add(rand(wordCount));
  }
  return Array.from(chosen).sort((a, b) => a - b);
}

/**
 * Check the user's answers against the phrase. `answers` maps word index -> typed word.
 * All requested indices must be answered correctly.
 */
export function verifyRecoveryAnswers(
  phrase: string,
  indices: number[],
  answers: Record<number, string>,
): boolean {
  const words = normalizeMnemonic(phrase).split(' ');
  if (indices.length === 0) {
    return false;
  }
  return indices.every(i => {
    const typed = (answers[i] ?? '').trim().toLowerCase();
    return typed.length > 0 && typed === words[i];
  });
}
