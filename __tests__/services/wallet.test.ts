/**
 * Wallet storage rules: one wallet per device, phone authentication required, no fallbacks,
 * atomic writes, secrets never stored unprotected.
 */

jest.mock('react-native-keychain', () => {
  const store: Record<string, {username: string; password: string; opts: any}> = {};
  const state = {authReady: true, failSetFor: null as string | null};
  return {
    __store: store,
    __state: state,
    setGenericPassword: jest.fn(async (username: string, password: string, opts: any) => {
      if (state.failSetFor && opts.service === state.failSetFor) {
        throw new Error('secure hardware unavailable');
      }
      store[opts.service] = {username, password, opts};
      return {service: opts.service, storage: 'AES_GCM'};
    }),
    getGenericPassword: jest.fn(async (opts: any) => {
      const item = store[opts.service];
      return item ? {username: item.username, password: item.password, service: opts.service} : false;
    }),
    hasGenericPassword: jest.fn(async (opts: any) => !!store[opts.service]),
    resetGenericPassword: jest.fn(async (opts: any) => {
      delete store[opts.service];
      return true;
    }),
    canImplyAuthentication: jest.fn(async () => state.authReady),
    getSupportedBiometryType: jest.fn().mockResolvedValue('Fingerprint'),
    AUTHENTICATION_TYPE: {DEVICE_PASSCODE_OR_BIOMETRICS: 'AuthenticationWithBiometricsDevicePasscode'},
    ACCESS_CONTROL: {BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'BIOMETRY_ANY_OR_DEVICE_PASSCODE'},
    SECURITY_LEVEL: {SECURE_HARDWARE: 'SECURE_HARDWARE'},
    STORAGE_TYPE: {AES_GCM: 'AES_GCM'},
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import {Platform} from 'react-native';
import {
  WalletError,
  deleteWallet,
  generateWallet,
  getWalletAddress,
  hasRecoveryPhrase,
  hasWallet,
  loadPrivateKey,
  loadRecoveryPhrase,
  sendPayment,
  storeWallet,
} from '../../src/services/wallet';
import {walletFromRecoveryPhrase} from '../../src/utils/recovery';

const kc = Keychain as any;

async function reset() {
  Object.keys(kc.__store).forEach(k => delete kc.__store[k]);
  kc.__state.authReady = true;
  kc.__state.failSetFor = null;
  await AsyncStorage.clear();
  jest.clearAllMocks();
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({name: 'WalletError', code});
}

describe('wallet storage', () => {
  beforeEach(reset);

  it('distinguishes a failed wallet-existence probe from confirmed absence when requested', async () => {
    await expect(hasWallet(true)).resolves.toBe(false);
    kc.hasGenericPassword.mockRejectedValueOnce(new Error('Keychain unavailable'));
    await expect(hasWallet(true)).rejects.toThrow('Keychain unavailable');
    kc.hasGenericPassword.mockRejectedValueOnce(new Error('Keychain unavailable'));
    await expect(hasWallet()).resolves.toBe(false);
  });

  it('generates a wallet with a matching 12-word recovery phrase', () => {
    const w = generateWallet();
    expect(w.mnemonic.split(' ')).toHaveLength(12);
    expect(walletFromRecoveryPhrase(w.mnemonic).address).toBe(w.address);
    expect(walletFromRecoveryPhrase(w.mnemonic).privateKey).toBe(w.privateKey);
  });

  it('stores key and phrase behind secure hardware + phone authentication', async () => {
    const w = generateWallet();
    const address = await storeWallet({privateKey: w.privateKey, mnemonic: w.mnemonic});
    expect(address).toBe(w.address);
    expect(await hasWallet()).toBe(true);
    expect(await hasRecoveryPhrase()).toBe(true);
    expect(await AsyncStorage.getItem('@tappay_wallet_address')).toBe(w.address);

    for (const call of kc.setGenericPassword.mock.calls) {
      expect(call[2].accessControl).toBe('BIOMETRY_ANY_OR_DEVICE_PASSCODE');
      expect(call[2].securityLevel).toBe('SECURE_HARDWARE');
    }
    // The secret is never written to unprotected storage.
    const stored = JSON.stringify(await AsyncStorage.getAllKeys());
    expect(stored).not.toContain('mnemonic');
  });

  it('refuses a second wallet on the same device (one wallet per device)', async () => {
    const first = generateWallet();
    await storeWallet({privateKey: first.privateKey, mnemonic: first.mnemonic});

    const second = generateWallet();
    await expectCode(
      storeWallet({privateKey: second.privateKey, mnemonic: second.mnemonic}),
      'WALLET_EXISTS',
    );
    // First wallet untouched
    expect(kc.__store['com.tappay.wallet'].password).toBe(first.privateKey);
    expect(await getWalletAddress()).toBe(first.address);
  });

  it('refuses concurrent creation attempts (double tap)', async () => {
    const a = generateWallet();
    const b = generateWallet();
    const results = await Promise.allSettled([
      storeWallet({privateKey: a.privateKey, mnemonic: a.mnemonic}),
      storeWallet({privateKey: b.privateKey, mnemonic: b.mnemonic}),
    ]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
  });

  it('refuses to create a wallet when the phone has no screen lock / biometrics', async () => {
    kc.__state.authReady = false;
    const w = generateWallet();
    await expectCode(storeWallet({privateKey: w.privateKey, mnemonic: w.mnemonic}), 'NO_DEVICE_AUTH');
    expect(await hasWallet()).toBe(false);
    expect(kc.setGenericPassword).not.toHaveBeenCalled();
  });

  it('has no software fallback: secure hardware failure leaves nothing behind', async () => {
    const w = generateWallet();
    kc.__state.failSetFor = 'com.tappay.wallet.phrase'; // key saves, phrase fails
    await expectCode(
      storeWallet({privateKey: w.privateKey, mnemonic: w.mnemonic}),
      'NO_SECURE_HARDWARE',
    );
    expect(await hasWallet()).toBe(false);
    expect(await hasRecoveryPhrase()).toBe(false);
    expect(await AsyncStorage.getItem('@tappay_wallet_address')).toBeNull();
    // Only secure-hardware writes were ever attempted (never a weaker level)
    for (const call of kc.setGenericPassword.mock.calls) {
      expect(call[2].securityLevel).toBe('SECURE_HARDWARE');
    }
  });

  it('rejects a phrase that does not match the key, and invalid keys', async () => {
    const w = generateWallet();
    const other = generateWallet();
    await expectCode(
      storeWallet({privateKey: w.privateKey, mnemonic: other.mnemonic}),
      'INVALID_SECRET',
    );
    await expectCode(storeWallet({privateKey: '0x1234'}), 'INVALID_SECRET');
    await expectCode(
      storeWallet({privateKey: w.privateKey, mnemonic: 'not a real phrase'}),
      'INVALID_SECRET',
    );
    expect(await hasWallet()).toBe(false);
  });

  it('always asks for phone authentication when reading secrets', async () => {
    const w = generateWallet();
    await storeWallet({privateKey: w.privateKey, mnemonic: w.mnemonic});
    kc.getGenericPassword.mockClear();

    expect(await loadPrivateKey('Pay')).toBe(w.privateKey);
    expect(await loadRecoveryPhrase('Show')).toBe(w.mnemonic);
    for (const call of kc.getGenericPassword.mock.calls) {
      expect(call[0].authenticationPrompt).toBeDefined();
      expect(call[0].authenticationPrompt.title).toBeTruthy();
    }
  });

  it('returns null (not a key) when authentication fails or is cancelled', async () => {
    const w = generateWallet();
    await storeWallet({privateKey: w.privateKey, mnemonic: w.mnemonic});
    kc.getGenericPassword.mockRejectedValueOnce(new Error('user canceled'));
    expect(await loadPrivateKey('Pay')).toBeNull();
  });

  it('wallet imported from a raw key has no recovery phrase', async () => {
    const w = generateWallet();
    await storeWallet({privateKey: w.privateKey});
    expect(await hasRecoveryPhrase()).toBe(false);
    expect(await loadRecoveryPhrase()).toBeNull();
  });

  it('getWalletAddress needs no authentication once cached and drops stale cache', async () => {
    const w = generateWallet();
    await storeWallet({privateKey: w.privateKey, mnemonic: w.mnemonic});
    kc.getGenericPassword.mockClear();
    expect(await getWalletAddress()).toBe(w.address);
    expect(kc.getGenericPassword).not.toHaveBeenCalled();

    // Keystore entry vanished (e.g. reinstall) but address cache survived -> no ghost wallet
    delete kc.__store['com.tappay.wallet'];
    expect(await getWalletAddress()).toBeNull();
    expect(await AsyncStorage.getItem('@tappay_wallet_address')).toBeNull();
  });

  it('recovers the cached address once (with authentication) on older installs', async () => {
    const w = generateWallet();
    kc.__store['com.tappay.wallet'] = {username: w.address, password: w.privateKey, opts: {}};
    expect(await getWalletAddress()).toBe(w.address);
    expect(kc.getGenericPassword).toHaveBeenCalledWith(
      expect.objectContaining({authenticationPrompt: expect.any(Object)}),
    );
    expect(await AsyncStorage.getItem('@tappay_wallet_address')).toBe(w.address);
  });

  it('deleteWallet removes key, phrase and cached address, then a new wallet is allowed', async () => {
    const w = generateWallet();
    await storeWallet({privateKey: w.privateKey, mnemonic: w.mnemonic});
    expect(await deleteWallet()).toBe(true);
    expect(kc.getGenericPassword).toHaveBeenCalledWith({
      service: 'com.tappay.wallet',
      authenticationPrompt: expect.objectContaining({
        title: 'Authenticate to reset your wallet',
        subtitle: 'TapPay Authorization',
        cancel: 'Cancel',
      }),
    });
    expect(kc.getGenericPassword.mock.invocationCallOrder[0])
      .toBeLessThan(kc.resetGenericPassword.mock.invocationCallOrder[0]);
    expect(kc.resetGenericPassword.mock.calls).toEqual([
      [{service: 'com.tappay.wallet'}],
      [{service: 'com.tappay.wallet.phrase'}],
    ]);
    expect(await hasWallet()).toBe(false);
    expect(await hasRecoveryPhrase()).toBe(false);
    expect(await AsyncStorage.getItem('@tappay_wallet_address')).toBeNull();

    const n = generateWallet();
    await expect(storeWallet({privateKey: n.privateKey, mnemonic: n.mnemonic})).resolves.toBe(n.address);
  });

  it.each(['cancelled', 'failed', 'missing', 'empty'])(
    'does not delete anything when reset authentication is %s',
    async failure => {
      const w = generateWallet();
      await storeWallet({privateKey: w.privateKey, mnemonic: w.mnemonic});
      if (failure === 'cancelled' || failure === 'failed') {
        kc.getGenericPassword.mockRejectedValueOnce(new Error(failure));
      } else {
        kc.getGenericPassword.mockResolvedValueOnce(failure === 'missing' ? false : {password: ''});
      }
      await expectCode(deleteWallet(), 'AUTHENTICATION_FAILED');
      expect(kc.resetGenericPassword).not.toHaveBeenCalled();
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
      expect(kc.__store['com.tappay.wallet'].password).toBe(w.privateKey);
      expect(kc.__store['com.tappay.wallet.phrase'].password).toBe(w.mnemonic);
      expect(await AsyncStorage.getItem('@tappay_wallet_address')).toBe(w.address);
    },
  );

  it.each(['key', 'phrase'])('fails closed if the %s existence check fails', async service => {
    const w = generateWallet();
    await storeWallet({privateKey: w.privateKey, mnemonic: w.mnemonic});
    if (service === 'phrase') {
      kc.hasGenericPassword.mockResolvedValueOnce(true);
    }
    kc.hasGenericPassword.mockRejectedValueOnce(new Error('Keystore unavailable'));
    await expectCode(deleteWallet(), 'AUTHENTICATION_FAILED');
    expect(kc.getGenericPassword).not.toHaveBeenCalled();
    expect(kc.resetGenericPassword).not.toHaveBeenCalled();
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });

  it('allows reset without an authentication prompt when no secrets exist', async () => {
    await AsyncStorage.setItem('@tappay_wallet_address', 'stale address');
    expect(await deleteWallet()).toBe(true);
    expect(kc.getGenericPassword).not.toHaveBeenCalled();
    expect(kc.resetGenericPassword).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem('@tappay_wallet_address')).toBeNull();
  });

  it('authenticates a raw-key wallet before resetting it', async () => {
    const w = generateWallet();
    await storeWallet({privateKey: w.privateKey});
    expect(await deleteWallet()).toBe(true);
    expect(kc.getGenericPassword).toHaveBeenCalledTimes(1);
    expect(kc.resetGenericPassword).toHaveBeenCalledTimes(1);
    expect(await hasWallet()).toBe(false);
  });

  it.each([true, false])('protects an orphaned recovery phrase (auth succeeds: %s)', async authorized => {
    kc.__store['com.tappay.wallet.phrase'] = {username: 'wallet', password: 'stored phrase', opts: {}};
    if (!authorized) {
      kc.getGenericPassword.mockResolvedValueOnce(false);
      await expectCode(deleteWallet(), 'AUTHENTICATION_FAILED');
      expect(kc.resetGenericPassword).not.toHaveBeenCalled();
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    } else {
      expect(await deleteWallet()).toBe(true);
      expect(await hasRecoveryPhrase()).toBe(false);
    }
    expect(kc.getGenericPassword).toHaveBeenCalledWith(expect.objectContaining({
      service: 'com.tappay.wallet.phrase',
      authenticationPrompt: expect.any(Object),
    }));
  });

  describe('reset with unrecoverable Android secrets', () => {
    const invalidated = {
      code: 'E_CRYPTO_FAILED',
      message: 'Wrapped error: Key permanently invalidated',
    };
    const badTag = {
      code: 'E_CRYPTO_FAILED',
      message: 'Decryption failed: Authentication tag verification failed. ' +
        'This usually indicates that the encrypted data was modified, corrupted, ' +
        'or is being decrypted with the wrong key.',
    };

    beforeEach(() => jest.replaceProperty(Platform, 'OS', 'android'));
    afterEach(() => jest.restoreAllMocks());

    it.each([invalidated, badTag])('allows removal when both secrets are unrecoverable: $message', async error => {
      const w = generateWallet();
      await storeWallet({privateKey: w.privateKey, mnemonic: w.mnemonic});
      kc.getGenericPassword.mockRejectedValueOnce(error).mockRejectedValueOnce(error);
      expect(await deleteWallet()).toBe(true);
      expect(kc.getGenericPassword.mock.calls.map((call: any[]) => call[0].service))
        .toEqual(['com.tappay.wallet', 'com.tappay.wallet.phrase']);
      expect(await hasWallet()).toBe(false);
      expect(await hasRecoveryPhrase()).toBe(false);
      expect(await AsyncStorage.getItem('@tappay_wallet_address')).toBeNull();
    });

    it('authenticates a recoverable phrase before deleting an invalidated signing key', async () => {
      const w = generateWallet();
      await storeWallet({privateKey: w.privateKey, mnemonic: w.mnemonic});
      kc.getGenericPassword.mockRejectedValueOnce(invalidated);
      expect(await deleteWallet()).toBe(true);
      expect(kc.getGenericPassword).toHaveBeenLastCalledWith(expect.objectContaining({
        service: 'com.tappay.wallet.phrase', authenticationPrompt: expect.any(Object),
      }));
      expect(kc.getGenericPassword.mock.invocationCallOrder[1])
        .toBeLessThan(kc.resetGenericPassword.mock.invocationCallOrder[0]);
    });

    it('preserves both entries if authentication of the recoverable phrase is cancelled', async () => {
      const w = generateWallet();
      await storeWallet({privateKey: w.privateKey, mnemonic: w.mnemonic});
      kc.getGenericPassword.mockRejectedValueOnce(invalidated)
        .mockRejectedValueOnce({code: 'E_CRYPTO_FAILED', message: 'code: 10, msg: User cancelled'});
      await expectCode(deleteWallet(), 'AUTHENTICATION_FAILED');
      expect(kc.resetGenericPassword).not.toHaveBeenCalled();
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
      expect(await hasRecoveryPhrase()).toBe(true);
    });

    it.each([
      {code: 'E_CRYPTO_FAILED', message: 'code: 7, msg: Too many attempts'},
      {code: 'E_CRYPTO_FAILED', message: 'code: 9, msg: Permanent biometric lockout'},
      {code: 'E_CRYPTO_FAILED', message: 'code: 10, msg: User cancelled'},
      {code: 'E_CRYPTO_FAILED', message: 'Wrapped error: User not authenticated'},
      {code: 'E_CRYPTO_FAILED', message: 'Decryption failed'},
      {code: 'E_KEYSTORE_ACCESS_ERROR', message: 'Could not access Keystore'},
      {code: 'E_UNKNOWN_ERROR', message: invalidated.message},
    ])('does not treat a generic/authentication error as permanent loss: $message', async error => {
      await storeWallet({privateKey: generateWallet().privateKey});
      kc.getGenericPassword.mockRejectedValueOnce(error);
      await expectCode(deleteWallet(), 'AUTHENTICATION_FAILED');
      expect(kc.resetGenericPassword).not.toHaveBeenCalled();
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });

    it('does not apply Android error-message handling on iOS', async () => {
      jest.replaceProperty(Platform, 'OS', 'ios');
      await storeWallet({privateKey: generateWallet().privateKey});
      kc.getGenericPassword.mockRejectedValueOnce(invalidated);
      await expectCode(deleteWallet(), 'AUTHENTICATION_FAILED');
      expect(kc.resetGenericPassword).not.toHaveBeenCalled();
    });

    it('allows removing an invalidated raw-key wallet', async () => {
      await storeWallet({privateKey: generateWallet().privateKey});
      kc.getGenericPassword.mockRejectedValueOnce(invalidated);
      expect(await deleteWallet()).toBe(true);
      expect(kc.resetGenericPassword).toHaveBeenCalledTimes(1);
    });

    it('allows removing an unrecoverable orphaned recovery phrase', async () => {
      kc.__store['com.tappay.wallet.phrase'] = {username: 'wallet', password: 'stored phrase', opts: {}};
      kc.getGenericPassword.mockRejectedValueOnce(badTag);
      expect(await deleteWallet()).toBe(true);
      expect(await hasRecoveryPhrase()).toBe(false);
    });
  });

  it('refuses to send without a ledger session instead of silently doing a plain transfer', async () => {
    const w = generateWallet();
    await storeWallet({privateKey: w.privateKey, mnemonic: w.mnemonic});
    // No sessionIdHash → must not fall back to a bare value transfer that skips the ledger.
    const result = await sendPayment('0x2222222222222222222222222222222222222222', 1000n, undefined);
    expect(result.txHash).toBeNull();
    expect(result.error).toMatch(/ledger is not configured/i);
  });

  it('returns an auth error (and never sends) when the wallet is locked', async () => {
    const w = generateWallet();
    await storeWallet({privateKey: w.privateKey, mnemonic: w.mnemonic});
    kc.getGenericPassword.mockRejectedValueOnce(new Error('user canceled'));
    const result = await sendPayment('0x2222222222222222222222222222222222222222', 1000n, '0xdead');
    expect(result.txHash).toBeNull();
    expect(result.error).toMatch(/cancelled|not found/i);
  });

  it('WalletError carries a stable code', () => {
    const e = new WalletError('WALLET_EXISTS', 'x');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('WALLET_EXISTS');
  });
});
