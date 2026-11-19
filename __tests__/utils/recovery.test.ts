import {
  RECOVERY_WORD_COUNT,
  isPrivateKeyHex,
  isValidRecoveryPhrase,
  normalizeMnemonic,
  pickVerificationIndices,
  secureRandomInt,
  verifyRecoveryAnswers,
  walletFromRecoveryPhrase,
} from '../../src/utils/recovery';

// Well-known BIP-39 test vector (never use for real funds)
const PHRASE =
  'test test test test test test test test test test test junk';
const PHRASE_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

describe('recovery phrase helpers', () => {
  it('normalizes whitespace and case', () => {
    expect(normalizeMnemonic('  Test  TEST\ntest ')).toBe('test test test');
  });

  it('accepts a valid 12-word phrase and rejects bad ones', () => {
    expect(isValidRecoveryPhrase(PHRASE)).toBe(true);
    expect(isValidRecoveryPhrase(`  ${PHRASE.toUpperCase()}  `)).toBe(true);
    // wrong checksum
    expect(
      isValidRecoveryPhrase(
        'test test test test test test test test test test test test',
      ),
    ).toBe(false);
    // wrong length
    expect(isValidRecoveryPhrase('test test test')).toBe(false);
    // not words
    expect(isValidRecoveryPhrase('foo bar baz qux 1 2 3 4 5 6 7 8')).toBe(false);
    expect(isValidRecoveryPhrase('')).toBe(false);
  });

  it('derives the expected wallet from a phrase', () => {
    expect(walletFromRecoveryPhrase(PHRASE).address).toBe(PHRASE_ADDRESS);
    expect(() => walletFromRecoveryPhrase('nope')).toThrow();
  });

  it('detects raw private keys', () => {
    expect(isPrivateKeyHex('0x' + 'a'.repeat(64))).toBe(true);
    expect(isPrivateKeyHex('a'.repeat(64))).toBe(false);
    expect(isPrivateKeyHex('0x' + 'a'.repeat(63))).toBe(false);
  });

  it('picks distinct, sorted verification indices', () => {
    for (let i = 0; i < 50; i++) {
      const idx = pickVerificationIndices(RECOVERY_WORD_COUNT, 3);
      expect(idx).toHaveLength(3);
      expect(new Set(idx).size).toBe(3);
      expect([...idx].sort((a, b) => a - b)).toEqual(idx);
      idx.forEach(n => {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(RECOVERY_WORD_COUNT);
      });
    }
  });

  it('retries on duplicate random picks', () => {
    const seq = [4, 4, 4, 7, 4, 1];
    const idx = pickVerificationIndices(12, 3, () => seq.shift() as number);
    expect(idx).toEqual([1, 4, 7]);
  });

  it('rejects invalid verification parameters', () => {
    expect(() => pickVerificationIndices(12, 13)).toThrow();
    expect(() => pickVerificationIndices(12, 0)).toThrow();
  });

  it('secureRandomInt stays in range', () => {
    for (let i = 0; i < 200; i++) {
      const n = secureRandomInt(12);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(12);
    }
    expect(() => secureRandomInt(0)).toThrow();
  });

  it('verifies answers strictly', () => {
    const idx = [0, 5, 11];
    expect(
      verifyRecoveryAnswers(PHRASE, idx, {0: 'test', 5: ' TEST ', 11: 'junk'}),
    ).toBe(true);
    expect(
      verifyRecoveryAnswers(PHRASE, idx, {0: 'test', 5: 'test', 11: 'test'}),
    ).toBe(false);
    expect(verifyRecoveryAnswers(PHRASE, idx, {0: 'test', 5: 'test'})).toBe(false);
    expect(verifyRecoveryAnswers(PHRASE, [], {})).toBe(false);
  });
});
