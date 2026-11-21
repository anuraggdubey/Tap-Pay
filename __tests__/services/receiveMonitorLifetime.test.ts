const mockQuery = jest.fn();
const mockRpc = jest.fn();
jest.mock('../../src/services/wallet', () => ({withRpcFailover: (...args: unknown[]) => mockRpc(...args)}));
jest.mock('../../src/services/hce', () => ({createHceReceiverLease: jest.fn(), stopHceSession: jest.fn()}));
jest.mock('../../src/services/nfcReader', () => ({}));
jest.mock('../../src/services/registry', () => ({}));
jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers');
  return {...actual, ethers: {...actual.ethers, Contract: jest.fn(() => ({
    filters: {PaymentLogged: jest.fn()}, queryFilter: (...args: unknown[]) => mockQuery(...args),
  }))}};
});

import {waitForIncomingPayment} from '../../src/services/tapPayment';
import {SESSION_TIMEOUT_MS} from '../../src/config/monad';

const ADDRESS = '0x1111111111111111111111111111111111111111';
const provider = {
  getBlockNumber: jest.fn(),
  getTransactionReceipt: jest.fn(),
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(0);
  jest.clearAllMocks();
  provider.getBlockNumber.mockResolvedValue(100);
  provider.getTransactionReceipt.mockResolvedValue({status: 1});
  mockRpc.mockImplementation(callback => callback(provider));
  mockQuery.mockResolvedValue([]);
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

it('keeps polling beyond 60 seconds and ends at the shared session deadline', async () => {
  let settled = false;
  const pending = waitForIncomingPayment(ADDRESS).then(result => { settled = true; return result; });
  await jest.advanceTimersByTimeAsync(60_000);
  expect(settled).toBe(false);
  const scans = mockQuery.mock.calls.length;
  await jest.advanceTimersByTimeAsync(SESSION_TIMEOUT_MS - 60_000);
  expect(await pending).toEqual({detected: false});
  expect(mockQuery.mock.calls.length).toBeGreaterThan(scans);
  const finalScans = mockQuery.mock.calls.length;
  await jest.advanceTimersByTimeAsync(SESSION_TIMEOUT_MS);
  expect(mockQuery).toHaveBeenCalledTimes(finalScans);
  expect(jest.getTimerCount()).toBe(0);
});

it('bounds a stalled initial RPC and ignores its late result', async () => {
  let resolveBlock: (block: number) => void = () => {};
  provider.getBlockNumber.mockReturnValueOnce(new Promise(resolve => { resolveBlock = resolve; }));
  const pending = waitForIncomingPayment(ADDRESS, 5000);
  await jest.advanceTimersByTimeAsync(5000);
  expect(await pending).toEqual({detected: false});
  resolveBlock(100);
  await jest.advanceTimersByTimeAsync(10_000);
  expect(mockQuery).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

it('bounds a stalled event scan and ignores a payment returned after expiry', async () => {
  let resolveScan: (events: unknown[]) => void = () => {};
  mockQuery.mockReturnValueOnce(new Promise(resolve => { resolveScan = resolve; }));
  const pending = waitForIncomingPayment(ADDRESS, 5000);
  await jest.advanceTimersByTimeAsync(5000);
  expect(await pending).toEqual({detected: false});
  resolveScan([{args: {from: ADDRESS, amount: 1n}, blockNumber: 100, index: 0, transactionHash: '0xlate'}]);
  await jest.advanceTimersByTimeAsync(1000);
  expect(mockQuery).toHaveBeenCalledTimes(1);
  expect(provider.getTransactionReceipt).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

it('cancels polling immediately during the sleep between scans', async () => {
  const controller = new AbortController();
  const pending = waitForIncomingPayment(ADDRESS, SESSION_TIMEOUT_MS, controller.signal);
  await jest.advanceTimersByTimeAsync(0);
  const scans = mockQuery.mock.calls.length;
  controller.abort();
  expect(await pending).toEqual({detected: false});
  await jest.advanceTimersByTimeAsync(SESSION_TIMEOUT_MS);
  expect(mockQuery).toHaveBeenCalledTimes(scans);
  expect(jest.getTimerCount()).toBe(0);
});

it('cancels while the initial RPC is still pending', async () => {
  provider.getBlockNumber.mockReturnValueOnce(new Promise(() => {}));
  const controller = new AbortController();
  const pending = waitForIncomingPayment(ADDRESS, SESSION_TIMEOUT_MS, controller.signal);
  controller.abort();
  expect(await pending).toEqual({detected: false});
  expect(jest.getTimerCount()).toBe(0);
});

it.each([0, -1])('does not query for an elapsed timeout (%s)', async timeout => {
  expect(await waitForIncomingPayment(ADDRESS, timeout)).toEqual({detected: false});
  expect(mockRpc).not.toHaveBeenCalled();
});

it('does not query for a pre-cancelled session', async () => {
  const controller = new AbortController();
  controller.abort();
  expect(await waitForIncomingPayment(ADDRESS, SESSION_TIMEOUT_MS, controller.signal)).toEqual({detected: false});
  expect(mockRpc).not.toHaveBeenCalled();
});

it('returns a confirmed payment and clears the expiry timer', async () => {
  mockQuery.mockResolvedValueOnce([{
    args: {from: ADDRESS, amount: 1_000_000_000_000_000_000n},
    blockNumber: 100, index: 0, transactionHash: '0xpayment',
  }]);
  const result = await waitForIncomingPayment(ADDRESS);
  expect(result).toEqual(expect.objectContaining({detected: true, txHash: '0xpayment', amountDisplay: '1.0'}));
  expect(jest.getTimerCount()).toBe(0);
});

it('still expires when RPC requests fail', async () => {
  mockRpc.mockRejectedValue(new Error('RPC offline'));
  const pending = waitForIncomingPayment(ADDRESS, 3000);
  await jest.advanceTimersByTimeAsync(3000);
  expect(await pending).toEqual({detected: false});
  expect(jest.getTimerCount()).toBe(0);
});
