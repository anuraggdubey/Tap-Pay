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
