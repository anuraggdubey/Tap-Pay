import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {WalletProvider, useWallet} from '../src/context/WalletContext';
import * as wallet from '../src/services/wallet';
import {getTransactionHistory, recordTransaction} from '../src/services/history';

const mockStored = new Map<string, string>();
const mockLoad = jest.fn((owner: string) => Promise.resolve(mockStored.get(owner) ?? null));
const mockSave = jest.fn(async (json: string, owner: string) => { mockStored.set(owner, json); });
const mockDiscard = jest.fn(async () => {});
jest.mock('../src/services/secureHistoryStore', () => ({
  loadHistoryJson: (owner: string) => mockLoad(owner),
  saveHistoryJson: (json: string, owner: string) => mockSave(json, owner),
  discardLegacyHistory: () => mockDiscard(),
}));
jest.mock('../src/services/wallet', () => ({
  ...jest.requireActual('../src/services/wallet'),
  hasWallet: jest.fn(), hasRecoveryPhrase: jest.fn().mockResolvedValue(true),
  getWalletAddress: jest.fn(), storeWallet: jest.fn(), deleteWallet: jest.fn(),
  getBalance: jest.fn().mockResolvedValue(0n),
}));
jest.mock('../src/services/registry', () => ({reverseResolve: jest.fn().mockResolvedValue(null)}));
jest.mock('../src/services/tokens/tokenBalance', () => ({getTokenBalance: jest.fn().mockResolvedValue({balanceRaw: 0n})}));

let tree: TestRenderer.ReactTestRenderer;
let state: ReturnType<typeof useWallet>;
let sequence = 0;
let A: string;
let B: string;
const KEY = '0x' + '22'.repeat(32);
const drain = () => new Promise<void>(resolve => setImmediate(resolve));
const row = (hash: string) => ({
  id: hash, timestamp: '2026-01-01T00:00:00.000Z', direction: 'sent',
  counterparty: '0x3333333333333333333333333333333333333333',
  amount: '1', status: 'pending', txHash: hash,
});
function record(owner: string, hash: string) {
  recordTransaction({walletAddress: owner, direction: 'sent', counterparty: A, amount: '1', status: 'pending', txHash: hash});
}
async function mount() {
  function Probe() { state = useWallet(); return null; }
  await act(async () => { tree = TestRenderer.create(<WalletProvider><Probe /></WalletProvider>); });
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockDiscard.mockReset().mockResolvedValue(undefined);
  mockStored.clear();
  await AsyncStorage.clear();
  A = '0x' + String(++sequence).padStart(40, '0');
  B = '0x' + String(sequence + 100).padStart(40, '0');
  mockStored.set(A, JSON.stringify([row('A-payment')]));
  jest.mocked(wallet.hasWallet).mockResolvedValue(true);
  jest.mocked(wallet.getWalletAddress).mockResolvedValue(A);
  jest.mocked(wallet.storeWallet).mockResolvedValue(B);
  jest.mocked(wallet.deleteWallet).mockResolvedValue(true);
});
afterEach(async () => { await act(async () => { tree?.unmount(); }); });

it('isolates reset/import and direct replacement, retaining only each wallet\'s own rows', async () => {
  await mount();
  record(A, 'A-live-payment');
  expect(getTransactionHistory()).toEqual(expect.arrayContaining([expect.objectContaining({txHash: 'A-live-payment'})]));
  await act(async () => { expect(await state.resetWallet()).toBe(true); });
  expect(state.address).toBeNull();
  expect(getTransactionHistory()).toEqual([]);
  await act(async () => { await state.importPrivateKey(KEY); });
  expect(state.address).toBe(B);
  expect(getTransactionHistory()).toEqual([]);
  record(B, 'B-payment');
  jest.mocked(wallet.storeWallet).mockResolvedValueOnce(A);
  await act(async () => { await state.importPrivateKey(KEY); });
  expect(getTransactionHistory().map(tx => tx.txHash)).toEqual(['A-live-payment', 'A-payment']);
});

it.each(['cancelled', 'storage failure'])('preserves history when reset is %s', async outcome => {
  await mount();
  const error = new wallet.WalletError('AUTHENTICATION_FAILED', 'Cancelled');
  if (outcome === 'cancelled') jest.mocked(wallet.deleteWallet).mockRejectedValueOnce(error);
  else jest.mocked(wallet.deleteWallet).mockResolvedValueOnce(false);
  await act(async () => {
    if (outcome === 'cancelled') await expect(state.resetWallet()).rejects.toBe(error);
    else expect(await state.resetWallet()).toBe(false);
  });
  expect(state.address).toBe(A);
  expect(getTransactionHistory().map(tx => tx.txHash)).toEqual(['A-payment']);
});

it('reports a successful reset and clears state even if legacy cleanup fails', async () => {
  await mount();
  mockDiscard.mockRejectedValueOnce(new Error('Cleanup unavailable'));
  await act(async () => { expect(await state.resetWallet()).toBe(true); });
  expect(state.address).toBeNull();
  expect(state.isInitialized).toBe(false);
  expect(state.balance).toBe(0n);
  expect(state.ausdBalance).toBe(0n);
  expect(state.username).toBeNull();
  expect(state.backupVerified).toBe(false);
  expect(state.walletLocked).toBe(false);
  expect(getTransactionHistory()).toEqual([]);
  jest.mocked(wallet.hasWallet).mockResolvedValue(false);
  await act(async () => { await state.importPrivateKey(KEY); });
  expect(mockDiscard).toHaveBeenCalledTimes(2);
  expect(state.address).toBe(B);
  expect(getTransactionHistory()).toEqual([]);
});

it('clears wallet state before pending post-reset cleanup finishes', async () => {
  await mount();
  let finish!: () => void;
  mockDiscard.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  let reset!: Promise<boolean>;
  await act(async () => { reset = state.resetWallet(); await drain(); });
  try {
    expect(state.address).toBeNull();
    expect(getTransactionHistory()).toEqual([]);
  } finally {
    finish();
    await act(async () => { await reset; });
  }
});

it('keeps a late read and late broadcast from A out of B\'s cache and persisted history', async () => {
  let finish!: (json: string) => void;
  mockLoad.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await mount();
  expect(getTransactionHistory()).toEqual([]);
  await act(async () => { await state.resetWallet(); await state.importPrivateKey(KEY); });
  record(A, 'late-A-broadcast');
  finish(JSON.stringify([row('A-payment')]));
  await act(async () => { await drain(); });
  expect(state.address).toBe(B);
  expect(getTransactionHistory()).toEqual([]);
  record(B, 'B-payment');
  await drain();
  expect(JSON.parse(mockStored.get(B)!).map((tx: {txHash: string}) => tx.txHash)).toEqual(['B-payment']);
  expect(JSON.parse(mockStored.get(A)!).map((tx: {txHash: string}) => tx.txHash)).toEqual(['late-A-broadcast', 'A-payment']);
});

it('keeps signed-out startup empty without loading any unowned history', async () => {
  jest.mocked(wallet.hasWallet).mockResolvedValueOnce(false);
  await mount();
  expect(state.address).toBeNull();
  expect(getTransactionHistory()).toEqual([]);
  expect(mockLoad).not.toHaveBeenCalled();
  expect(mockDiscard).toHaveBeenCalledTimes(1);
});

it('cleans up unscoped history before persisting a new wallet, including after cleanup failure', async () => {
  jest.mocked(wallet.hasWallet).mockResolvedValue(false);
  await mount();
  mockDiscard.mockRejectedValueOnce(new Error('Storage unavailable'));
  await act(async () => { await expect(state.importPrivateKey(KEY)).rejects.toThrow('Storage unavailable'); });
  expect(wallet.storeWallet).not.toHaveBeenCalled();
  await act(async () => { await state.importPrivateKey(KEY); });
  expect(mockDiscard.mock.invocationCallOrder[2]).toBeLessThan(jest.mocked(wallet.storeWallet).mock.invocationCallOrder[0]);
  expect(getTransactionHistory()).toEqual([]);
});

it('does not discard an existing wallet\'s pending legacy migration on rejected import', async () => {
  await mount();
  jest.mocked(wallet.storeWallet).mockRejectedValueOnce(new Error('Wallet already exists'));
  await act(async () => { await expect(state.importPrivateKey(KEY)).rejects.toThrow('Wallet already exists'); });
  expect(mockDiscard).not.toHaveBeenCalled();
});

it('preserves legacy history when wallet presence is unknown and allows initialization retry', async () => {
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    jest.mocked(wallet.hasWallet).mockRejectedValueOnce(new Error('Keychain unavailable'));
    await mount();
    expect(wallet.hasWallet).toHaveBeenCalledWith(true);
    expect(mockDiscard).not.toHaveBeenCalled();
    await act(async () => { await state.unlockWallet(); });
    expect(state.address).toBe(A);
    expect(getTransactionHistory().map(tx => tx.txHash)).toEqual(['A-payment']);
  } finally {
    errorLog.mockRestore();
  }
});
