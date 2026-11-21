/**
 * A payment is reported failed ONLY when a reverted receipt exists. A timeout or an unreachable
 * node is "still pending", never "failed" (issue #38).
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

import {ethers} from 'ethers';
import {TX_MAX_WAIT_MS} from '../../src/config/monad';
import {getReceiptStatus, waitForReceipt} from '../../src/services/wallet';

const HASH = '0x' + 'ab'.repeat(32);
let receiptSpy: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  receiptSpy = jest.spyOn(ethers.JsonRpcProvider.prototype, 'getTransactionReceipt');
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function settle<T>(promise: Promise<T>, ms: number): Promise<T> {
  await jest.advanceTimersByTimeAsync(ms);
  return promise;
}

describe('waitForReceipt', () => {
  it('confirms on a successful receipt', async () => {
    receiptSpy.mockResolvedValue({status: 1} as ethers.TransactionReceipt);
    await expect(settle(waitForReceipt(HASH), 1000)).resolves.toEqual({confirmed: true});
  });

  it('reports a revert only when a receipt with status 0 exists', async () => {
    receiptSpy.mockResolvedValue({status: 0} as ethers.TransactionReceipt);
    const result = await settle(waitForReceipt(HASH), 1000);
    expect(result).toMatchObject({confirmed: false, reverted: true});
    expect(result.timedOut).toBeUndefined();
  });

  it('a timeout with no receipt is pending, not a failure', async () => {
    receiptSpy.mockResolvedValue(null);
    const result = await settle(waitForReceipt(HASH), TX_MAX_WAIT_MS + 2000);
    expect(result.confirmed).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.reverted).toBeUndefined();
    expect(result.error).toMatch(/may still go through/i);
  });

  it('an unreachable node for the whole wait is also pending, not a failure', async () => {
    receiptSpy.mockRejectedValue(new Error('network down'));
    const result = await settle(waitForReceipt(HASH), TX_MAX_WAIT_MS + 2000);
    expect(result.timedOut).toBe(true);
    expect(result.reverted).toBeUndefined();
  });

  it('keeps polling through transient errors and confirms once the receipt appears', async () => {
    receiptSpy
      .mockRejectedValueOnce(new Error('rate limited'))
      .mockResolvedValueOnce(null)
      .mockResolvedValue({status: 1} as ethers.TransactionReceipt);
    await expect(settle(waitForReceipt(HASH), 3000)).resolves.toEqual({confirmed: true});
  });
});

describe('getReceiptStatus', () => {
  it('maps receipts and missing receipts', async () => {
    receiptSpy.mockResolvedValueOnce({status: 1} as ethers.TransactionReceipt);
    await expect(getReceiptStatus(HASH)).resolves.toBe('confirmed');
    receiptSpy.mockResolvedValueOnce({status: 0} as ethers.TransactionReceipt);
    await expect(getReceiptStatus(HASH)).resolves.toBe('reverted');
    receiptSpy.mockResolvedValueOnce(null);
    await expect(getReceiptStatus(HASH)).resolves.toBe('pending');
  });

  it('is unknown (not failed) when every endpoint errors', async () => {
    receiptSpy.mockRejectedValue(new Error('down'));
    await expect(getReceiptStatus(HASH)).resolves.toBe('unknown');
  });
});
