const mockQuery = jest.fn();
const mockRpc = jest.fn();
jest.mock('../../src/services/wallet', () => ({
  withRpcFailover: (...args: unknown[]) => mockRpc(...args),
  getActiveRpcUrl: () => 'https://rpc-a.example',
  corroborateLog: async () => 'confirmed',
}));
jest.mock('../../src/services/hce', () => ({createHceReceiverLease: jest.fn(), stopHceSession: jest.fn()}));
jest.mock('../../src/services/nfcReader', () => ({}));
jest.mock('../../src/services/registry', () => ({}));
jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers');
  return {...actual, ethers: {...actual.ethers, Contract: jest.fn(() => ({
    filters: {PaymentLogged: jest.fn()}, queryFilter: (...args: unknown[]) => mockQuery(...args),
  }))}};
});

import {scanForIncomingTapPayment, waitForIncomingPayment} from '../../src/services/tapPayment';
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

it('never scans from block 0 when the start block cannot be read (#124)', async () => {
  // Start block lookup fails twice, then works. An old payment exists in history.
  provider.getBlockNumber
    .mockRejectedValueOnce(new Error('RPC offline'))
    .mockRejectedValueOnce(new Error('RPC offline'))
    .mockResolvedValue(500);
  mockQuery.mockImplementation((_filter: unknown, fromBlock: number) =>
    Promise.resolve(fromBlock <= 10
      ? [{args: {from: ADDRESS, amount: 5n}, blockNumber: 10, index: 0, transactionHash: '0xold'}]
      : []),
  );
  const pending = waitForIncomingPayment(ADDRESS, 5000);
  await jest.advanceTimersByTimeAsync(5000);
  expect(await pending).toEqual({detected: false});
  expect(mockQuery).toHaveBeenCalled();
  for (const call of mockQuery.mock.calls) {
    expect(call[1]).toBe(500);
  }
  expect(provider.getTransactionReceipt).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

it('does not scan at all while the start block stays unreadable', async () => {
  provider.getBlockNumber.mockRejectedValue(new Error('RPC offline'));
  const pending = waitForIncomingPayment(ADDRESS, 3000);
  await jest.advanceTimersByTimeAsync(3000);
  expect(await pending).toEqual({detected: false});
  expect(mockQuery).not.toHaveBeenCalled();
  expect(provider.getBlockNumber.mock.calls.length).toBeGreaterThan(1);
  expect(jest.getTimerCount()).toBe(0);
});

it('still expires when RPC requests fail', async () => {
  mockRpc.mockRejectedValue(new Error('RPC offline'));
  const pending = waitForIncomingPayment(ADDRESS, 3000);
  await jest.advanceTimersByTimeAsync(3000);
  expect(await pending).toEqual({detected: false});
  expect(jest.getTimerCount()).toBe(0);
});

it('detects a payment more than 100 blocks after startBlock while keeping every query <= 100 blocks (#116)', async () => {
  let head = 1000;
  provider.getBlockNumber.mockImplementation(async () => head);
  mockQuery.mockImplementation(async (_filter: unknown, fromBlock: number, toBlock: number) => {
    if (toBlock - fromBlock + 1 > 100) {
      throw new Error('block range too large');
    }
    if (fromBlock <= 1250 && toBlock >= 1250) {
      return [{
        args: {from: ADDRESS, amount: 2_000_000_000_000_000_000n},
        blockNumber: 1250,
        index: 0,
        transactionHash: '0xlateblock',
      }];
    }
    return [];
  });

  const pending = waitForIncomingPayment(ADDRESS, SESSION_TIMEOUT_MS);
  // Start block read at 1000, first poll at 1000
  await jest.advanceTimersByTimeAsync(0);
  // Advance chain head past 100 blocks to 1260 (simulating >30s on Monad)
  head = 1260;
  await jest.advanceTimersByTimeAsync(5000);

  const result = await pending;
  expect(result).toEqual(expect.objectContaining({
    detected: true,
    txHash: '0xlateblock',
    amountDisplay: '2.0',
  }));
  expect(mockQuery).toHaveBeenCalled();
  for (const [, fromBlock, toBlock] of mockQuery.mock.calls) {
    expect(toBlock - fromBlock + 1).toBeLessThanOrEqual(100);
    expect(fromBlock).toBeGreaterThanOrEqual(1000);
  }
  expect(jest.getTimerCount()).toBe(0);
});

it('does not advance cursor past a failed RPC scan (#116)', async () => {
  let head = 1000;
  let shouldFail = true;
  provider.getBlockNumber.mockImplementation(async () => head);
  mockQuery.mockImplementation(async (_filter: unknown, fromBlock: number, toBlock: number) => {
    if (shouldFail) {
      throw new Error('transient RPC error');
    }
    if (fromBlock <= 1050 && toBlock >= 1050) {
      return [{
        args: {from: ADDRESS, amount: 1_000_000_000_000_000_000n},
        blockNumber: 1050,
        index: 0,
        transactionHash: '0xrecovered',
      }];
    }
    return [];
  });

  const pending = waitForIncomingPayment(ADDRESS, 10_000);
  await jest.advanceTimersByTimeAsync(0);
  head = 1150;
  await jest.advanceTimersByTimeAsync(1000);
  // Now RPC recovers; cursor must still be at 1000 so block 1050 is not skipped.
  shouldFail = false;
  await jest.advanceTimersByTimeAsync(2000);

  const result = await pending;
  expect(result).toEqual(expect.objectContaining({detected: true, txHash: '0xrecovered'}));
  expect(jest.getTimerCount()).toBe(0);
});

it('does not advance cursor past a block whose receipt is still null (#116)', async () => {
  let head = 1000;
  let receiptAvailable = false;
  provider.getBlockNumber.mockImplementation(async () => head);
  provider.getTransactionReceipt.mockImplementation(async () =>
    receiptAvailable ? {status: 1} : null,
  );
  mockQuery.mockImplementation(async (_filter: unknown, fromBlock: number, toBlock: number) => {
    if (fromBlock <= 1001 && toBlock >= 1001) {
      return [{
        args: {from: ADDRESS, amount: 1_000_000_000_000_000_000n},
        blockNumber: 1001,
        index: 0,
        transactionHash: '0xlaggedreceipt',
      }];
    }
    return [];
  });

  const pending = waitForIncomingPayment(ADDRESS, 10_000);
  await jest.advanceTimersByTimeAsync(0);
  // Head moves to 1005 while block 1001's receipt is still null
  head = 1005;
  await jest.advanceTimersByTimeAsync(1000);
  // Receipt becomes available on the next poll — block 1001 must still be rescanned
  receiptAvailable = true;
  await jest.advanceTimersByTimeAsync(1000);

  const result = await pending;
  expect(result).toEqual(expect.objectContaining({detected: true, txHash: '0xlaggedreceipt'}));
  expect(jest.getTimerCount()).toBe(0);
});

it('scanForIncomingTapPayment scans full window >100 blocks newest-first in <=100 block chunks (#116)', async () => {
  provider.getBlockNumber.mockResolvedValue(1250);
  provider.getTransactionReceipt.mockResolvedValue({status: 1});
  mockQuery.mockImplementation(async (_filter: unknown, fromBlock: number, toBlock: number) => {
    const out = [];
    if (fromBlock <= 1050 && toBlock >= 1050) {
      out.push({
        args: {from: ADDRESS, amount: 1_000_000_000_000_000_000n},
        blockNumber: 1050,
        index: 0,
        transactionHash: '0xolder',
      });
    }
    if (fromBlock <= 1220 && toBlock >= 1220) {
      out.push({
        args: {from: ADDRESS, amount: 2_000_000_000_000_000_000n},
        blockNumber: 1220,
        index: 0,
        transactionHash: '0xnewest',
      });
    }
    return out;
  });

  const match = await scanForIncomingTapPayment(ADDRESS, 1000);
  expect(match).toEqual(expect.objectContaining({txHash: '0xnewest', blockNumber: 1220}));
  for (const [, fromBlock, toBlock] of mockQuery.mock.calls) {
    expect(toBlock - fromBlock + 1).toBeLessThanOrEqual(100);
  }
});
