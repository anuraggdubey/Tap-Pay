/**
 * Transaction history must never be stored in plaintext (issue #36).
 * Storage mocks live outside the module registry so a "restart" (resetModules) keeps data.
 */

const mockAsync: Record<string, string> = {};
const mockKeychain: {items: Record<string, string>; failSet: boolean; failGet: boolean; setOptions: any[]} = {
  items: {},
  failSet: false,
  failGet: false,
  setOptions: [],
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => (k in mockAsync ? mockAsync[k] : null)),
    getAllKeys: jest.fn(async () => Object.keys(mockAsync)),
    setItem: jest.fn(async (k: string, v: string) => {
      mockAsync[k] = v;
    }),
    removeItem: jest.fn(async (k: string) => {
      delete mockAsync[k];
    }),
  },
}));

jest.mock('react-native-keychain', () => ({
  STORAGE_TYPE: {AES_GCM_NO_AUTH: 'KeystoreAESGCM_NoAuth', AES_GCM: 'KeystoreAESGCM'},
  ACCESSIBLE: {WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly'},
  setGenericPassword: jest.fn(async (_u: string, password: string, opts: any) => {
    if (mockKeychain.failSet) {
      throw new Error('keystore unavailable');
    }
    mockKeychain.setOptions.push(opts);
    mockKeychain.items[opts.service] = password;
    return {service: opts.service};
  }),
  getGenericPassword: jest.fn(async (opts: any) => {
    if (mockKeychain.failGet) {
      throw new Error('keystore unavailable');
    }
    const password = mockKeychain.items[opts.service];
    return password ? {username: 'history', password, service: opts.service} : false;
  }),
  resetGenericPassword: jest.fn(async (opts: any) => {
    delete mockKeychain.items[opts.service];
    return true;
  }),
}));

const ENC = '@tappay_tx_history_v2';
const LEGACY = '@tappay_tx_history';
const SAMPLE = JSON.stringify([
  {
    id: '1',
    direction: 'sent',
    counterparty: '0x1111111111111111111111111111111111111111',
    counterpartyUsername: 'rhea',
    amount: '25.5',
    tokenSymbol: 'USDC',
    status: 'confirmed',
    txHash: '0x' + 'ab'.repeat(32),
    timestamp: '2026-11-21T10:00:00.000Z',
  },
]);

function freshStore(): typeof import('../../src/services/secureHistoryStore') {
  jest.resetModules();
  return require('../../src/services/secureHistoryStore');
}

beforeEach(() => {
  for (const k of Object.keys(mockAsync)) {
    delete mockAsync[k];
  }
  mockKeychain.items = {};
  mockKeychain.failSet = false;
  mockKeychain.failGet = false;
  mockKeychain.setOptions = [];
});

describe('secureHistoryStore', () => {
  it('stores history encrypted: no counterparty, username, amount or hash in plaintext', async () => {
    const store = freshStore();
    await store.saveHistoryJson(SAMPLE);
    const raw = mockAsync[ENC];
    expect(raw).toBeTruthy();
    for (const secret of ['0x1111', 'rhea', '25.5', 'USDC', 'abab', 'counterparty']) {
      expect(raw).not.toContain(secret);
    }
    expect(mockAsync[LEGACY]).toBeUndefined();
    await expect(store.loadHistoryJson()).resolves.toBe(SAMPLE);
  });

  it('keeps the key in the Keystore without a prompt, never in AsyncStorage', async () => {
    const store = freshStore();
    await store.saveHistoryJson(SAMPLE);
    expect(mockKeychain.setOptions).toHaveLength(1);
    expect(mockKeychain.setOptions[0]).toMatchObject({
      service: 'tappay.history.key',
      storage: 'KeystoreAESGCM_NoAuth',
    });
    const key = mockKeychain.items['tappay.history.key'];
    expect(key).toBeTruthy();
    expect(JSON.stringify(mockAsync)).not.toContain(key);
  });

  it('survives an app restart and uses a fresh nonce for every write', async () => {
    let store = freshStore();
    await store.saveHistoryJson(SAMPLE);
    const first = JSON.parse(mockAsync[ENC]).n;
    await store.saveHistoryJson(SAMPLE);
    expect(JSON.parse(mockAsync[ENC]).n).not.toBe(first);

    store = freshStore(); // new process: key must be re-read from the Keystore
    await expect(store.loadHistoryJson()).resolves.toBe(SAMPLE);
    expect(mockKeychain.setOptions).toHaveLength(1); // the key was created once and reused
  });

  it('migrates a legacy plaintext history and removes the plaintext copy', async () => {
    mockAsync[LEGACY] = SAMPLE;
    const store = freshStore();
    await expect(store.loadHistoryJson()).resolves.toBe(SAMPLE);
    expect(mockAsync[LEGACY]).toBeUndefined();
    expect(mockAsync[ENC]).toBeTruthy();
    expect(mockAsync[ENC]).not.toContain('rhea');
    // and it reads back from the encrypted copy after a restart
    await expect(freshStore().loadHistoryJson()).resolves.toBe(SAMPLE);
  });

  it('keeps the legacy copy (loses nothing) if it cannot be encrypted yet', async () => {
    mockAsync[LEGACY] = SAMPLE;
    mockKeychain.failSet = true;
    const store = freshStore();
    await expect(store.loadHistoryJson()).resolves.toBe(SAMPLE);
    expect(mockAsync[LEGACY]).toBe(SAMPLE);
    expect(mockAsync[ENC]).toBeUndefined();
  });

  it('never writes plaintext when the key is unavailable', async () => {
    mockKeychain.failSet = true;
    const store = freshStore();
    await expect(store.saveHistoryJson(SAMPLE)).rejects.toThrow();
    expect(mockAsync[ENC]).toBeUndefined();
    expect(mockAsync[LEGACY]).toBeUndefined();
    expect(JSON.stringify(mockAsync)).not.toContain('rhea');
  });

  it('a tampered blob is dropped and history starts empty (fails closed)', async () => {
    await freshStore().saveHistoryJson(SAMPLE);
    const envelope = JSON.parse(mockAsync[ENC]);
    envelope.c = envelope.c.slice(0, -4) + (envelope.c.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    mockAsync[ENC] = JSON.stringify(envelope);
    const store = freshStore();
    await expect(store.loadHistoryJson()).resolves.toBeNull();
    expect(mockAsync[ENC]).toBeUndefined();
  });

  it('a lost key makes the blob unreadable, so it is dropped (no crash, no plaintext)', async () => {
    await freshStore().saveHistoryJson(SAMPLE);
    mockKeychain.items = {};
    const store = freshStore();
    await expect(store.loadHistoryJson()).resolves.toBeNull();
    expect(mockAsync[ENC]).toBeUndefined();
  });

  it('garbage or an unknown version is dropped safely', async () => {
    mockAsync[ENC] = 'not json';
    await freshStore().saveHistoryJson(SAMPLE); // creates the key (overwrites)
    mockAsync[ENC] = JSON.stringify({v: 2, n: 'AAAA', c: 'AAAA'});
    await expect(freshStore().loadHistoryJson()).resolves.toBeNull();
    expect(mockAsync[ENC]).toBeUndefined();
  });

  it('concurrent first saves create exactly one key', async () => {
    const store = freshStore();
    await Promise.all([store.saveHistoryJson(SAMPLE), store.saveHistoryJson(SAMPLE), store.saveHistoryJson(SAMPLE)]);
    expect(mockKeychain.setOptions).toHaveLength(1);
    await expect(store.loadHistoryJson()).resolves.toBe(SAMPLE);
  });

  it('clearHistoryStore removes the blob, the legacy copy and the key', async () => {
    mockAsync[LEGACY] = SAMPLE;
    const store = freshStore();
    await store.saveHistoryJson(SAMPLE);
    mockAsync[LEGACY] = SAMPLE;
    await store.clearHistoryStore();
    expect(mockAsync[ENC]).toBeUndefined();
    expect(mockAsync[LEGACY]).toBeUndefined();
    expect(mockKeychain.items['tappay.history.key']).toBeUndefined();
  });
});

describe('history service uses the encrypted store', () => {
  const A = '0x1111111111111111111111111111111111111111';
  const B = '0x2222222222222222222222222222222222222222';

  it.each(['plaintext', 'encrypted'])('migrates all %s rows once, regardless of endpoint metadata', async format => {
    let store = freshStore();
    const base = JSON.parse(SAMPLE)[0];
    const sent = {...base, from: A.toUpperCase(), to: B};
    const received = {...base, id: '2', txHash: '0x' + 'cd'.repeat(32), sender: B, recipient: A};
    const foreign = {...base, id: '3', txHash: 'foreign', from: B, to: B};
    const counterpartyOnly = {...base, id: '4', txHash: 'counterparty-only'};
    const rows = [sent, received, foreign, counterpartyOnly];
    const source = JSON.stringify(rows);
    if (format === 'encrypted') await store.saveHistoryJson(source);
    else mockAsync[LEGACY] = source;
    expect(JSON.parse((await store.loadHistoryJson(A))!)).toEqual(rows);
    expect(mockAsync[ENC]).toBeUndefined();
    expect(mockAsync[LEGACY]).toBeUndefined();
    store = freshStore();
    expect(JSON.parse((await store.loadHistoryJson(A))!)).toEqual(rows);
    await expect(store.loadHistoryJson(B)).resolves.toBeNull();
  });

  it('preserves the source on encryption failure and retries without duplicates', async () => {
    const store = freshStore();
    const owned = {...JSON.parse(SAMPLE)[0], to: A};
    mockAsync[LEGACY] = JSON.stringify([owned]);
    mockKeychain.failSet = true;
    await expect(store.loadHistoryJson(A)).rejects.toThrow('History key unavailable');
    expect(mockAsync[LEGACY]).toBeTruthy();
    mockKeychain.failSet = false;
    expect(JSON.parse((await store.loadHistoryJson(A))!)).toEqual([owned]);
  });

  it('keeps distinct counterparty-only placeholder-hash payments from both legacy stores', async () => {
    const store = freshStore();
    const first = {...JSON.parse(SAMPLE)[0], id: 'first', txHash: 'tap-payment'};
    const second = {...first, id: 'second'};
    await store.saveHistoryJson(JSON.stringify([first]));
    mockAsync[LEGACY] = JSON.stringify([first, second]);
    expect(JSON.parse((await store.loadHistoryJson(A))!)).toEqual([first, second]);
    expect(JSON.parse((await freshStore().loadHistoryJson(A))!)).toEqual([first, second]);
  });

  it('commits scoped ciphertext before deleting either legacy source', async () => {
    const store = freshStore();
    await store.saveHistoryJson(SAMPLE);
    mockAsync[LEGACY] = SAMPLE;
    const storage = require('@react-native-async-storage/async-storage').default;
    storage.removeItem.mockImplementationOnce(async (key: string) => {
      expect(mockAsync[`${ENC}:${A}`]).toBeTruthy();
      expect(key).toBe(ENC);
      throw new Error('Interrupted cleanup');
    });
    await expect(store.loadHistoryJson(A)).rejects.toThrow('Interrupted cleanup');
    expect(mockAsync[ENC]).toBeTruthy();
    expect(mockAsync[LEGACY]).toBeTruthy();
    expect(JSON.parse((await store.loadHistoryJson(A))!)).toEqual(JSON.parse(SAMPLE));
  });

  it.each(['plaintext', 'encrypted'])('discards orphaned %s history without attaching it to a later wallet', async format => {
    let store = freshStore();
    if (format === 'encrypted') await store.saveHistoryJson(SAMPLE);
    else mockAsync[LEGACY] = SAMPLE;
    await store.discardLegacyHistory();
    expect(mockAsync[ENC]).toBeUndefined();
    expect(mockAsync[LEGACY]).toBeUndefined();
    store = freshStore();
    await expect(store.loadHistoryJson(B)).resolves.toBeNull();
  });

  it('preserves migrated rows across later writes after an initial hydration failure', async () => {
    freshStore();
    const owned = JSON.parse(SAMPLE)[0];
    mockAsync[LEGACY] = JSON.stringify([owned]);
    mockKeychain.failSet = true;
    const history = require('../../src/services/history');
    const {setHistoryWallet} = require('../../src/services/walletHistory');
    setHistoryWallet(A);
    await history.initHistory();
    mockKeychain.failSet = false;
    for (const hash of ['first', 'second']) {
      history.recordTransaction({walletAddress: A, direction: 'sent', counterparty: B, amount: '1', status: 'pending', txHash: hash});
      await new Promise(resolve => setImmediate(resolve));
    }
    freshStore();
    const restarted = require('../../src/services/history');
    require('../../src/services/walletHistory').setHistoryWallet(A);
    await restarted.initHistory();
    expect(restarted.getTransactionHistory().map((tx: {txHash: string}) => tx.txHash)).toEqual(['second', 'first', owned.txHash]);
  });

  it('does not destroy encrypted legacy data while its key is unavailable', async () => {
    let store = freshStore();
    await store.saveHistoryJson(JSON.stringify([{...JSON.parse(SAMPLE)[0], from: A}]));
    store = freshStore();
    mockKeychain.failGet = true;
    await expect(store.loadHistoryJson(A)).rejects.toThrow('History key unavailable');
    expect(mockAsync[ENC]).toBeTruthy();
    mockKeychain.failGet = false;
    expect(JSON.parse((await store.loadHistoryJson(A))!)).toHaveLength(1);
  });

  it.each(['throws', 'missing'])('retains scoped ciphertext when a key read is temporarily %s', async failure => {
    let store = freshStore();
    await store.saveHistoryJson(SAMPLE, A);
    const ciphertext = mockAsync[`${ENC}:${A}`];
    const keys = {...mockKeychain.items};
    store = freshStore();
    if (failure === 'throws') mockKeychain.failGet = true;
    else mockKeychain.items = {};
    await expect(store.loadHistoryJson(A)).rejects.toThrow('History key unavailable');
    expect(mockAsync[`${ENC}:${A}`]).toBe(ciphertext);
    mockKeychain.failGet = false;
    mockKeychain.items = keys;
    await expect(store.loadHistoryJson(A)).resolves.toBe(SAMPLE);
  });

  it.each(['with plaintext', 'without plaintext'])('drops corrupt encrypted legacy data %s without blocking payments', async format => {
    const store = freshStore();
    await store.saveHistoryJson(SAMPLE, A);
    await store.saveHistoryJson(SAMPLE);
    mockAsync[ENC] = 'corrupt encrypted history';
    const plain = {...JSON.parse(SAMPLE)[0], id: 'plaintext', txHash: 'plaintext'};
    if (format === 'with plaintext') mockAsync[LEGACY] = JSON.stringify([plain]);
    const migrated = JSON.parse((await store.loadHistoryJson(A))!);
    expect(migrated).toEqual(format === 'with plaintext' ? [JSON.parse(SAMPLE)[0], plain] : JSON.parse(SAMPLE));
    expect(mockAsync[ENC]).toBeUndefined();
    expect(mockAsync[LEGACY]).toBeUndefined();
    const payment = {...plain, id: 'new-payment', txHash: 'new-payment'};
    await store.saveHistoryJson(JSON.stringify([payment]), A);
    expect(JSON.parse((await freshStore().loadHistoryJson(A))!)).toEqual([payment, ...migrated]);
  });

  it('persists a new scoped payment when a transient key read defers legacy migration', async () => {
    let store = freshStore();
    await store.saveHistoryJson(SAMPLE);
    const legacy = mockAsync[ENC];
    store = freshStore();
    require('react-native-keychain').getGenericPassword.mockRejectedValueOnce(new Error('Temporarily unavailable'));
    const payment = {...JSON.parse(SAMPLE)[0], id: 'new-payment', txHash: 'new-payment'};
    await expect(store.saveHistoryJson(JSON.stringify([payment]), A)).resolves.toBeUndefined();
    expect(mockAsync[`${ENC}:${A}`]).toBeTruthy();
    expect(mockAsync[ENC]).toBe(legacy);
    expect(JSON.parse((await freshStore().loadHistoryJson(A))!)).toEqual([payment, ...JSON.parse(SAMPLE)]);
    expect(mockAsync[ENC]).toBeUndefined();
  });

  it('never replaces an unavailable legacy key to persist a new payment', async () => {
    let store = freshStore();
    await store.saveHistoryJson(SAMPLE);
    const legacy = mockAsync[ENC];
    const keys = {...mockKeychain.items};
    const keyWrites = mockKeychain.setOptions.length;
    store = freshStore();
    mockKeychain.items = {};
    const payment = {...JSON.parse(SAMPLE)[0], id: 'new-payment', txHash: 'new-payment'};
    await expect(store.saveHistoryJson(JSON.stringify([payment]), A)).rejects.toThrow('History key unavailable');
    expect(mockKeychain.setOptions).toHaveLength(keyWrites);
    expect(mockAsync[ENC]).toBe(legacy);
    expect(mockAsync[`${ENC}:${A}`]).toBeUndefined();
    mockKeychain.items = keys;
    await store.saveHistoryJson(JSON.stringify([payment]), A);
    expect(JSON.parse((await freshStore().loadHistoryJson(A))!)).toEqual([payment, ...JSON.parse(SAMPLE)]);
  });

  it('merges migration with an early payment during hydration and hides both after wallet reset/import', async () => {
    freshStore();
    const owned = JSON.parse(SAMPLE)[0];
    mockAsync[LEGACY] = JSON.stringify([owned]);
    const history = require('../../src/services/history');
    const {setHistoryWallet} = require('../../src/services/walletHistory');
    setHistoryWallet(A);
    const early = history.recordTransaction({walletAddress: A, direction: 'sent', counterparty: B, amount: '1', status: 'pending', txHash: 'early'});
    await history.initHistory();
    await new Promise(resolve => setImmediate(resolve));
    expect(history.getTransactionHistory()).toEqual([early, owned]);
    setHistoryWallet(null);
    await history.initHistory();
    expect(history.getTransactionHistory()).toEqual([]);
    setHistoryWallet(B);
    await history.initHistory();
    expect(history.getTransactionHistory()).toEqual([]);
    setHistoryWallet(A);
    await history.initHistory();
    expect(history.getTransactionHistory()).toEqual([early, owned]);
  });

  it('separates wallets across restart and authenticates the owning address', async () => {
    let store = freshStore();
    await store.saveHistoryJson(SAMPLE, A);
    await expect(store.loadHistoryJson(B)).resolves.toBeNull();
    const other = SAMPLE.replace('rhea', 'bob');
    await store.saveHistoryJson(other, B);
    store = freshStore();
    await expect(store.loadHistoryJson(A)).resolves.toBe(SAMPLE);
    await expect(store.loadHistoryJson(B)).resolves.toBe(other);
    mockAsync[`${ENC}:${B}`] = mockAsync[`${ENC}:${A}`];
    await expect(store.loadHistoryJson(B)).resolves.toBeNull();
    await expect(store.loadHistoryJson(A)).resolves.toBe(SAMPLE);
  });

  it('discards only unscoped rows before import and retains previously scoped history', async () => {
    const store = freshStore();
    await store.saveHistoryJson(SAMPLE, A);
    await store.saveHistoryJson(SAMPLE);
    mockAsync[LEGACY] = SAMPLE;
    await store.discardLegacyHistory();
    await expect(store.loadHistoryJson(B)).resolves.toBeNull();
    await expect(store.loadHistoryJson(A)).resolves.toBe(SAMPLE);
    expect(mockAsync[ENC]).toBeUndefined();
    expect(mockAsync[LEGACY]).toBeUndefined();
  });

  it('removes wallet-scoped ciphertexts as well when clearing all history', async () => {
    const store = freshStore();
    await store.saveHistoryJson(SAMPLE, A);
    await store.saveHistoryJson(SAMPLE, B);
    await store.clearHistoryStore();
    expect(mockAsync[`${ENC}:${A}`]).toBeUndefined();
    expect(mockAsync[`${ENC}:${B}`]).toBeUndefined();
  });

  it('recordTransaction persists encrypted and a restart reads it back', async () => {
    jest.resetModules();
    const history = require('../../src/services/history');
    history.recordTransaction({
      direction: 'sent',
      counterparty: '0x2222222222222222222222222222222222222222',
      counterpartyUsername: 'kai',
      amount: '3',
      tokenSymbol: 'MON',
      status: 'pending',
      txHash: '0x' + 'cd'.repeat(32),
    });
    // let the serialized write finish
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));

    expect(mockAsync[ENC]).toBeTruthy();
    expect(mockAsync[LEGACY]).toBeUndefined();
    expect(mockAsync[ENC]).not.toContain('kai');
    expect(mockAsync[ENC]).not.toContain('2222');

    jest.resetModules();
    const restarted = require('../../src/services/history');
    await restarted.initHistory();
    const rows = restarted.getTransactionHistory();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({counterpartyUsername: 'kai', amount: '3', status: 'pending'});
  });
});
