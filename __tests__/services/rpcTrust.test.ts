/**
 * RPC trust and privacy (issue #43): user-set RPC, fan-out broadcast, visible active endpoint.
 */

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  hasGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
  canImplyAuthentication: jest.fn(),
  getSupportedBiometryType: jest.fn(),
  AUTHENTICATION_TYPE: {},
  ACCESS_CONTROL: {},
  SECURITY_LEVEL: {},
  STORAGE_TYPE: {},
}));

const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => (k in mockStore ? mockStore[k] : null)),
    setItem: jest.fn(async (k: string, v: string) => {
      mockStore[k] = v;
    }),
    removeItem: jest.fn(async (k: string) => {
      delete mockStore[k];
    }),
    clear: jest.fn(async () => {
      for (const k of Object.keys(mockStore)) {
        delete mockStore[k];
      }
    }),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {ethers} from 'ethers';
import {FanoutProvider} from '../../src/services/fanoutProvider';
import {CUSTOM_RPC_STORAGE_KEY, describeRpc, validateRpcUrl} from '../../src/services/rpcSettings';

const SIGNED = '0x02f8' + 'ab'.repeat(40);

describe('validateRpcUrl', () => {
  it('accepts a plain https endpoint and normalizes it', () => {
    expect(validateRpcUrl(' https://rpc.example.com/ ')).toEqual({ok: true, url: 'https://rpc.example.com'});
    expect(validateRpcUrl('https://node.example.com/v1/abc/')).toEqual({ok: true, url: 'https://node.example.com/v1/abc'});
  });

  it.each([
    ['', 'Enter'],
    ['not a url', 'valid URL'],
    ['http://rpc.example.com', 'https'],
    ['ws://rpc.example.com', 'https'],
    ['https://user:pw@rpc.example.com', 'password'],
    ['https://rpc.example.com/?key=1', 'query'],
    ['https://rpc.example.com/#x', 'query'],
    ['https://localhost:8545', 'public hostname'],
    ['https://127.0.0.1', 'public hostname'],
    ['https://192.168.1.5', 'public hostname'],
    ['https://intranet', 'public hostname'],
  ])('rejects %p', (input, fragment) => {
    const result = validateRpcUrl(input);
    expect(result.ok).toBe(false);
    expect((result as {error: string}).error).toContain(fragment);
  });

  it('describeRpc shows only the host (a path can contain an API key)', () => {
    expect(describeRpc('https://node.example.com/v1/SECRETKEY')).toBe('node.example.com');
  });
});

describe('FanoutProvider broadcasts the same signed transaction to every endpoint', () => {
  let spy: jest.SpyInstance;
  const received: Array<{host: string; tx: string}> = [];

  function behave(map: Record<string, 'ok' | 'fail'>) {
    spy.mockImplementation(function (this: any, tx: string) {
      const host = new URL(this._getConnection().url).host;
      received.push({host, tx});
      return map[host] === 'ok'
        ? Promise.resolve({hash: `0xok-${host}`} as unknown as ethers.TransactionResponse)
        : Promise.reject(new Error(`${host} rejected`));
    });
  }

  beforeEach(() => {
    received.length = 0;
    spy = jest.spyOn(ethers.JsonRpcProvider.prototype, 'broadcastTransaction');
  });
  afterEach(() => jest.restoreAllMocks());

  const make = () =>
    new FanoutProvider(
      'https://a.example.com',
      {chainId: 143, name: 'Monad'},
      {staticNetwork: true},
      ['https://b.example.com', 'https://c.example.com'],
    );

  it('sends identical bytes to all endpoints and succeeds if any accepts', async () => {
    behave({'a.example.com': 'fail', 'b.example.com': 'ok', 'c.example.com': 'fail'});
    const response = await make().broadcastTransaction(SIGNED);
    expect(response.hash).toBe('0xok-b.example.com');
    expect(received.map(r => r.host).sort()).toEqual(['a.example.com', 'b.example.com', 'c.example.com']);
    expect(new Set(received.map(r => r.tx))).toEqual(new Set([SIGNED]));
  });

  it('one dropping or censoring endpoint cannot stop the payment', async () => {
    behave({'a.example.com': 'ok', 'b.example.com': 'fail', 'c.example.com': 'fail'});
    await expect(make().broadcastTransaction(SIGNED)).resolves.toMatchObject({hash: '0xok-a.example.com'});
  });

  it('throws the primary error only when every endpoint rejects', async () => {
    behave({});
    await expect(make().broadcastTransaction(SIGNED)).rejects.toThrow('a.example.com rejected');
    expect(received).toHaveLength(3);
  });

  it('with a single (custom) endpoint nothing is sent anywhere else', async () => {
    behave({'only.example.com': 'ok'});
    const solo = new FanoutProvider('https://only.example.com', {chainId: 143, name: 'Monad'}, {staticNetwork: true}, []);
    await solo.broadcastTransaction(SIGNED);
    expect(received.map(r => r.host)).toEqual(['only.example.com']);
  });
});

describe('custom RPC in the wallet service', () => {
  let wallet: typeof import('../../src/services/wallet');
  // The wallet module is re-required per test, so spy on ITS copy of ethers.
  let E: typeof import('ethers');
  let sendSpy: jest.SpyInstance;

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.resetModules();
    E = require('ethers');
    wallet = require('../../src/services/wallet');
    await wallet.rpcReady;
    sendSpy = jest.spyOn(E.ethers.JsonRpcProvider.prototype, 'send');
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('defaults to the public endpoints and shows the active one', () => {
    expect(wallet.getCustomRpcUrl()).toBeNull();
    expect(wallet.getDefaultRpcEndpoints()).toContain(wallet.getActiveRpcUrl());
  });

  it('accepts an endpoint on Monad, persists it and uses it exclusively', async () => {
    sendSpy.mockResolvedValue('0x8f'); // 143
    await expect(wallet.setCustomRpc('https://my.node.example.com/rpc')).resolves.toEqual({ok: true});
    expect(wallet.getCustomRpcUrl()).toBe('https://my.node.example.com/rpc');
    expect(wallet.getActiveRpcUrl()).toBe('https://my.node.example.com/rpc');
    await expect(AsyncStorage.getItem(CUSTOM_RPC_STORAGE_KEY)).resolves.toBe('https://my.node.example.com/rpc');

    // Receipts are read from the custom node only: no silent use of the public providers.
    const hosts: string[] = [];
    jest.spyOn(E.ethers.JsonRpcProvider.prototype, 'getTransactionReceipt').mockImplementation(function (this: any) {
      hosts.push(new URL(this._getConnection().url).host);
      return Promise.resolve({status: 1} as ethers.TransactionReceipt);
    });
    await expect(wallet.getReceiptStatus('0x' + 'ab'.repeat(32))).resolves.toBe('confirmed');
    expect(hosts).toEqual(['my.node.example.com']);
  });

  it('does not fall back to the public endpoints when the custom one fails', async () => {
    sendSpy.mockResolvedValue('0x8f');
    await wallet.setCustomRpc('https://my.node.example.com');
    const hosts: string[] = [];
    jest.spyOn(E.ethers.JsonRpcProvider.prototype, 'getBalance').mockImplementation(function (this: any) {
      hosts.push(new URL(this._getConnection().url).host);
      return Promise.reject(new Error('down'));
    });
    await expect(wallet.getBalance('0x' + '11'.repeat(20))).rejects.toThrow('down');
    expect(new Set(hosts)).toEqual(new Set(['my.node.example.com']));
  });

  it('refuses an endpoint on another chain and stores nothing', async () => {
    sendSpy.mockResolvedValue('0x1'); // Ethereum mainnet
    const result = await wallet.setCustomRpc('https://eth.example.com');
    expect(result.ok).toBe(false);
    expect((result as {error: string}).error).toMatch(/different network/i);
    expect(wallet.getCustomRpcUrl()).toBeNull();
    await expect(AsyncStorage.getItem(CUSTOM_RPC_STORAGE_KEY)).resolves.toBeNull();
  });

  it('refuses an unreachable endpoint and invalid input', async () => {
    sendSpy.mockRejectedValue(new Error('network'));
    expect((await wallet.setCustomRpc('https://down.example.com')).ok).toBe(false);
    expect((await wallet.setCustomRpc('http://insecure.example.com')).ok).toBe(false);
    expect(wallet.getCustomRpcUrl()).toBeNull();
  });

  it('clearing returns to the default endpoints', async () => {
    sendSpy.mockResolvedValue('0x8f');
    await wallet.setCustomRpc('https://my.node.example.com');
    await expect(wallet.setCustomRpc(null)).resolves.toEqual({ok: true});
    expect(wallet.getCustomRpcUrl()).toBeNull();
    await expect(AsyncStorage.getItem(CUSTOM_RPC_STORAGE_KEY)).resolves.toBeNull();
    expect(wallet.getDefaultRpcEndpoints()).toContain(wallet.getActiveRpcUrl());
  });

  it('loads a stored custom endpoint on startup, before any RPC call', async () => {
    await AsyncStorage.setItem(CUSTOM_RPC_STORAGE_KEY, 'https://saved.example.com');
    jest.resetModules();
    const fresh = require('../../src/services/wallet');
    await fresh.rpcReady;
    expect(fresh.getCustomRpcUrl()).toBe('https://saved.example.com');
    expect(fresh.getActiveRpcUrl()).toBe('https://saved.example.com');
  });

  it('ignores a corrupted stored value', async () => {
    await AsyncStorage.setItem(CUSTOM_RPC_STORAGE_KEY, 'http://plain-http.example.com');
    jest.resetModules();
    const fresh = require('../../src/services/wallet');
    await fresh.rpcReady;
    expect(fresh.getCustomRpcUrl()).toBeNull();
  });
});
