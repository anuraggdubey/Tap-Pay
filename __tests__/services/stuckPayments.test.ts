/**
 * #130: stuck payments can be sped up or cancelled (same nonce, higher fee), history keeps every
 * hash a payment may be mined under, and a new payment warns about earlier stuck ones.
 */

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(async () => ({username: 'tappay', password: '0x' + '11'.repeat(32)})),
  hasGenericPassword: jest.fn(async () => true),
  resetGenericPassword: jest.fn(),
  canImplyAuthentication: jest.fn(),
  getSupportedBiometryType: jest.fn(),
  AUTHENTICATION_TYPE: {},
  ACCESS_CONTROL: {},
  SECURITY_LEVEL: {},
  STORAGE_TYPE: {},
  ACCESSIBLE: {},
}));
jest.mock('../../src/services/secureHistoryStore', () => ({
  loadHistoryJson: jest.fn(async () => null),
  saveHistoryJson: jest.fn(async () => undefined),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {ethers} from 'ethers';
import {
  getStuckPayments,
  getTransactionHistory,
  initHistory,
  isStuck,
  recordTransaction,
  replaceTransaction,
  STUCK_AFTER_MS,
  updateTransactionStatus,
} from '../../src/services/history';
import {getLatestNonce, replacePendingTransaction} from '../../src/services/wallet';

const KEY = '0x' + '11'.repeat(32);
const ME = new ethers.Wallet(KEY).address;
const TO = '0x2222222222222222222222222222222222222222';
const GWEI = ethers.parseUnits('1', 'gwei');
const H1 = '0x' + 'a1'.repeat(32);
const H2 = '0x' + 'b2'.repeat(32);
const H3 = '0x' + 'c3'.repeat(32);

describe('history keeps every hash of a replaced payment', () => {
  beforeAll(async () => {
    await initHistory();
  });

  it('speed-up then a mined original: the row confirms under the original hash', () => {
    recordTransaction({direction: 'sent', counterparty: TO, amount: '1', status: 'pending', txHash: H1});
    replaceTransaction(H1, H2, 'speedup', 4);
    let tx = getTransactionHistory().find(r => r.txHash === H2)!;
    expect(tx.replacedHashes).toEqual([H1]);
    expect(tx.nonce).toBe(4);
    expect(tx.cancelHash).toBeUndefined();

    updateTransactionStatus(H1, 'confirmed');
    tx = getTransactionHistory().find(r => r.txHash === H1)!;
    expect(tx.status).toBe('confirmed');
    expect(tx.replacedHashes).toEqual([H2]);
  });

  it('cancel records the cancellation hash', () => {
    recordTransaction({direction: 'sent', counterparty: TO, amount: '2', status: 'pending', txHash: H3});
    replaceTransaction(H3, '0x' + 'd4'.repeat(32), 'cancel', 9);
    const tx = getTransactionHistory().find(r => r.amount === '2')!;
    expect(tx.cancelHash).toBe('0x' + 'd4'.repeat(32));
    expect(tx.replacedHashes).toEqual([H3]);
  });

  it('isStuck only for sent payments pending longer than STUCK_AFTER_MS', () => {
    const now = Date.now();
    const base = {id: 'x', counterparty: TO, amount: '1', txHash: H1};
    const old = new Date(now - STUCK_AFTER_MS - 1000).toISOString();
    expect(isStuck({...base, direction: 'sent', status: 'pending', timestamp: old}, now)).toBe(true);
    expect(isStuck({...base, direction: 'sent', status: 'pending', timestamp: new Date(now).toISOString()}, now)).toBe(false);
    expect(isStuck({...base, direction: 'received', status: 'pending', timestamp: old}, now)).toBe(false);
    expect(isStuck({...base, direction: 'sent', status: 'confirmed', timestamp: old}, now)).toBe(false);
    expect(isStuck({...base, txHash: 'tap-payment', direction: 'sent', status: 'pending', timestamp: old}, now)).toBe(false);
    expect(getStuckPayments(now + 10 * STUCK_AFTER_MS).length).toBeGreaterThan(0);
  });
});

describe('replacePendingTransaction', () => {
  let original: ethers.Transaction;
  let originalHash: string;
  let chain: {known: boolean; tamper: boolean; latest: number[]};
  let sendTransaction: jest.SpyInstance;

  beforeEach(async () => {
    await AsyncStorage.setItem('@tappay_wallet_address', ME);
    const signed = await new ethers.Wallet(KEY).signTransaction({
      type: 2,
      to: TO,
      value: ethers.parseEther('1'),
      data: '0x1234',
      nonce: 7,
      gasLimit: 72_000n,
      maxFeePerGas: 2n * GWEI,
      maxPriorityFeePerGas: GWEI,
      chainId: 143,
    });
    original = ethers.Transaction.from(signed);
    originalHash = original.hash!;
    chain = {known: true, tamper: false, latest: [7, 7]};

    const proto = ethers.JsonRpcProvider.prototype as any;
    jest.spyOn(proto, 'getTransaction').mockImplementation(async () => {
      if (!chain.known) {
        return null;
      }
      return {
        type: 2,
        to: chain.tamper ? '0x9999999999999999999999999999999999999999' : original.to,
        nonce: original.nonce,
        gasLimit: original.gasLimit,
        gasPrice: original.maxFeePerGas,
        maxFeePerGas: original.maxFeePerGas,
        maxPriorityFeePerGas: original.maxPriorityFeePerGas,
        data: original.data,
        value: original.value,
        chainId: original.chainId,
        accessList: [],
        signature: original.signature,
      };
    });
    let call = 0;
    jest.spyOn(proto, 'getTransactionCount').mockImplementation(async () => chain.latest[call++ % chain.latest.length]);
    jest.spyOn(proto, 'getFeeData').mockImplementation(async () => new ethers.FeeData(GWEI, GWEI, GWEI));
    sendTransaction = jest
      .spyOn(ethers.Wallet.prototype, 'sendTransaction')
      .mockImplementation(async () => ({hash: '0x' + 'ee'.repeat(32)}) as any);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('speed up re-signs the same payment and nonce with fees raised by at least 10%', async () => {
    const result = await replacePendingTransaction(originalHash, 'speedup');
    expect(result).toEqual({txHash: '0x' + 'ee'.repeat(32), nonce: 7});
    const tx = sendTransaction.mock.calls[0][0];
    expect(tx).toMatchObject({to: TO, value: ethers.parseEther('1'), data: '0x1234', nonce: 7, gasLimit: 72_000n, chainId: 143});
    expect(tx.maxFeePerGas).toBe(23n * GWEI / 10n); // 2 gwei * 1.15
    expect(tx.maxPriorityFeePerGas).toBe(115n * GWEI / 100n);
    expect(tx.maxFeePerGas * 100n).toBeGreaterThanOrEqual(original.maxFeePerGas! * 110n);
  });

  it('cancel sends 0 to this wallet with the same nonce', async () => {
    await replacePendingTransaction(originalHash, 'cancel');
    expect(sendTransaction.mock.calls[0][0]).toMatchObject({to: ME, value: 0n, data: '0x', gasLimit: 21_000n, nonce: 7});
  });

  it('uses the current network fee when it is higher than the bump', async () => {
    (ethers.JsonRpcProvider.prototype.getFeeData as jest.Mock).mockResolvedValue(new ethers.FeeData(GWEI, 10n * GWEI, 5n * GWEI));
    await replacePendingTransaction(originalHash, 'speedup');
    expect(sendTransaction.mock.calls[0][0]).toMatchObject({maxFeePerGas: 10n * GWEI, maxPriorityFeePerGas: 5n * GWEI});
  });

  it('refuses when the payment was already mined (nonce used)', async () => {
    chain.latest = [8, 8];
    const result = await replacePendingTransaction(originalHash, 'speedup');
    expect(result.txHash).toBeNull();
    expect(result.error).toMatch(/already been processed/);
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it('refuses when the network no longer knows the payment', async () => {
    chain.known = false;
    const result = await replacePendingTransaction(originalHash, 'cancel');
    expect(result.error).toMatch(/no longer waiting/);
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it('never signs a transaction an RPC altered (it must hash to the original)', async () => {
    chain.tamper = true;
    const result = await replacePendingTransaction(originalHash, 'speedup');
    expect(result.txHash).toBeNull();
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it('getLatestNonce takes the lowest of two endpoints', async () => {
    chain.latest = [9, 7];
    await expect(getLatestNonce(ME)).resolves.toBe(7);
  });
});
