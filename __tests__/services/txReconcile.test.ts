import {
  DROP_GRACE_MS,
  DROP_UNKNOWN_AFTER_MS,
  reconcilePendingTransactions,
  ReconcileDeps,
} from '../../src/services/txReconcile';
import type {ReceiptStatus} from '../../src/services/wallet';
import type {TransactionRecord} from '../../src/services/history';

jest.mock('../../src/services/wallet', () => ({
  getReceiptStatus: jest.fn(),
  getTransactionNonce: jest.fn(),
  getLatestNonce: jest.fn(),
  getWalletAddress: jest.fn(),
}));
jest.mock('../../src/services/secureHistoryStore', () => ({loadHistoryJson: jest.fn(), saveHistoryJson: jest.fn()}));

const A = '0x' + 'aa'.repeat(32);
const B = '0x' + 'bb'.repeat(32);
const C = '0x' + 'cc'.repeat(32);
const D = '0x' + 'dd'.repeat(32);
const NOW = Date.parse('2026-06-01T12:00:00Z');
const OLD = new Date(NOW - 10 * 60 * 1000).toISOString(); // 10 minutes ago

function row(txHash: string, overrides: Partial<TransactionRecord> = {}): TransactionRecord {
  return {
    id: txHash, direction: 'sent', counterparty: '0x1', amount: '1', status: 'pending',
    txHash, timestamp: OLD, ...overrides,
  };
}

function deps(
  rows: TransactionRecord[],
  results: Record<string, ReceiptStatus | Error>,
  chain: {nonces?: Record<string, number>; latest?: number | null} = {},
) {
  const updates: Array<[string, string]> = [];
  const saved: Array<[string, number]> = [];
  const d: ReconcileDeps = {
    init: jest.fn().mockResolvedValue(undefined),
    pending: () => rows,
    status: jest.fn(async (hash: string) => {
      const r = results[hash.toLowerCase()];
      if (r instanceof Error) {
        throw r;
      }
      return r ?? 'pending';
    }),
    update: (hash, status) => {
      updates.push([hash, status]);
    },
    txNonce: jest.fn(async (hash: string) => chain.nonces?.[hash] ?? null),
    saveNonce: (hash, nonce) => {
      saved.push([hash, nonce]);
    },
    latestNonce: jest.fn(async () => (chain.latest === undefined ? 0 : chain.latest)),
    now: () => NOW,
  };
  return {d, updates, saved};
}

describe('reconcilePendingTransactions: receipts', () => {
  it('confirms on a successful receipt and fails only on a reverted one', async () => {
    const {d, updates} = deps([row(A), row(B), row(C), row(D)], {[A]: 'confirmed', [B]: 'reverted', [C]: 'pending', [D]: 'unknown'});
    await expect(reconcilePendingTransactions(d)).resolves.toBe(2);
    expect(updates).toEqual([
      [A, 'confirmed'],
      [B, 'failed'],
    ]);
  });

  it('leaves rows pending when there is no receipt yet or the lookup failed', async () => {
    const {d, updates} = deps([row(C), row(D)], {[C]: 'pending', [D]: 'unknown'});
    await expect(reconcilePendingTransactions(d)).resolves.toBe(0);
    expect(updates).toEqual([]);
  });

  it('checks each row once even if several rows share a hash', async () => {
    const {d, updates} = deps([row(A), row(A.toUpperCase().replace('0X', '0x')), row(A)], {[A]: 'confirmed'});
    await reconcilePendingTransactions(d);
    expect(d.status).toHaveBeenCalledTimes(1);
    expect(updates).toHaveLength(1);
  });

  it('shares one run between concurrent callers', async () => {
    const {d} = deps([row(A)], {[A]: 'confirmed'});
    const [x, y] = await Promise.all([reconcilePendingTransactions(d), reconcilePendingTransactions(d)]);
    expect(x).toBe(y);
    expect(d.status).toHaveBeenCalledTimes(1);
  });

  it('never throws; a failing lookup returns 0 and the next run can retry', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const {d} = deps([row(A)], {[A]: new Error('boom')});
    await expect(reconcilePendingTransactions(d)).resolves.toBe(0);
    const again = deps([row(A)], {[A]: 'confirmed'});
    await expect(reconcilePendingTransactions(again.d)).resolves.toBe(1);
  });

  it('confirms the payment when a replaced (sped-up) hash is the one mined', async () => {
    const {d, updates} = deps([row(B, {replacedHashes: [A]})], {[A]: 'confirmed'});
    await reconcilePendingTransactions(d);
    expect(updates).toEqual([[A, 'confirmed']]);
  });

  it('reports a mined cancellation as cancelled, and a mined original as confirmed', async () => {
    const cancelled = deps([row(B, {replacedHashes: [A], cancelHash: B})], {[B]: 'confirmed'});
    await reconcilePendingTransactions(cancelled.d);
    expect(cancelled.updates).toEqual([[B, 'cancelled']]);

    const raced = deps([row(B, {replacedHashes: [A], cancelHash: B})], {[A]: 'confirmed'});
    await reconcilePendingTransactions(raced.d);
    expect(raced.updates).toEqual([[A, 'confirmed']]);
  });
});

describe('reconcilePendingTransactions: dropped and replaced transactions (#130)', () => {
  it('marks a payment dropped when the latest nonce passed its nonce and there is no receipt', async () => {
    const {d, updates} = deps([row(A, {nonce: 4})], {}, {latest: 5});
    await expect(reconcilePendingTransactions(d)).resolves.toBe(1);
    expect(updates).toEqual([[A, 'dropped']]);
  });

  it('keeps it pending while its nonce is still unused', async () => {
    const {d, updates} = deps([row(A, {nonce: 5})], {}, {latest: 5});
    await reconcilePendingTransactions(d);
    expect(updates).toEqual([]);
  });

  it('learns the nonce from the network and stores it', async () => {
    const {d, updates, saved} = deps([row(A)], {}, {nonces: {[A]: 7}, latest: 7});
    await reconcilePendingTransactions(d);
    expect(saved).toEqual([[A, 7]]);
    expect(updates).toEqual([]);

    const later = deps([row(A)], {}, {nonces: {[A]: 7}, latest: 8});
    await reconcilePendingTransactions(later.d);
    expect(later.updates).toEqual([[A, 'dropped']]);
  });

  it('does not decide anything within the grace period after sending', async () => {
    const fresh = new Date(NOW - DROP_GRACE_MS + 1000).toISOString();
    const {d, updates} = deps([row(A, {nonce: 1, timestamp: fresh})], {}, {latest: 9});
    await reconcilePendingTransactions(d);
    expect(updates).toEqual([]);
    expect(d.latestNonce).not.toHaveBeenCalled();
  });

  it('drops a payment no endpoint knows only after DROP_UNKNOWN_AFTER_MS', async () => {
    const recent = deps([row(A)], {}, {latest: 3});
    await reconcilePendingTransactions(recent.d);
    expect(recent.updates).toEqual([]);

    const stale = new Date(NOW - DROP_UNKNOWN_AFTER_MS - 1000).toISOString();
    const old = deps([row(A, {timestamp: stale})], {}, {latest: 3});
    await reconcilePendingTransactions(old.d);
    expect(old.updates).toEqual([[A, 'dropped']]);
  });

  it('changes nothing when the network cannot be reached', async () => {
    const unreachable = deps([row(A, {nonce: 1})], {[A]: 'unknown'}, {latest: 9});
    await reconcilePendingTransactions(unreachable.d);
    expect(unreachable.updates).toEqual([]);

    const noNonce = deps([row(A, {nonce: 1})], {}, {latest: null});
    await reconcilePendingTransactions(noNonce.d);
    expect(noNonce.updates).toEqual([]);
  });

  it('never drops a received payment (the nonce is the sender\'s)', async () => {
    const stale = new Date(NOW - DROP_UNKNOWN_AFTER_MS - 1000).toISOString();
    const {d, updates} = deps([row(A, {direction: 'received', nonce: 1, timestamp: stale})], {}, {latest: 9});
    await reconcilePendingTransactions(d);
    expect(updates).toEqual([]);
  });

  it('reads the wallet nonce once per run', async () => {
    const {d} = deps([row(A, {nonce: 1}), row(B, {nonce: 2}), row(C, {nonce: 3})], {}, {latest: 2});
    await reconcilePendingTransactions(d);
    expect(d.latestNonce).toHaveBeenCalledTimes(1);
  });
});
