import {reconcilePendingTransactions, ReconcileDeps} from '../../src/services/txReconcile';
import type {ReceiptStatus} from '../../src/services/wallet';

jest.mock('../../src/services/wallet', () => ({getReceiptStatus: jest.fn()}));

const A = '0x' + 'aa'.repeat(32);
const B = '0x' + 'bb'.repeat(32);
const C = '0x' + 'cc'.repeat(32);
const D = '0x' + 'dd'.repeat(32);

function deps(rows: string[], results: Record<string, ReceiptStatus | Error>) {
  const updates: Array<[string, string]> = [];
  const d: ReconcileDeps = {
    init: jest.fn().mockResolvedValue(undefined),
    pending: () => rows.map(txHash => ({txHash})),
    status: jest.fn(async (hash: string) => {
      const r = results[hash.toLowerCase()];
      if (r instanceof Error) {
        throw r;
      }
      return r ?? 'unknown';
    }),
    update: (hash, status) => {
      updates.push([hash, status]);
    },
  };
  return {d, updates};
}

describe('reconcilePendingTransactions', () => {
  it('confirms on a successful receipt and fails only on a reverted one', async () => {
    const {d, updates} = deps([A, B, C, D], {[A]: 'confirmed', [B]: 'reverted', [C]: 'pending', [D]: 'unknown'});
    await expect(reconcilePendingTransactions(d)).resolves.toBe(2);
    expect(updates).toEqual([
      [A, 'confirmed'],
      [B, 'failed'],
    ]);
  });

  it('leaves rows pending when there is no receipt yet or the lookup failed', async () => {
    const {d, updates} = deps([C, D], {[C]: 'pending', [D]: 'unknown'});
    await expect(reconcilePendingTransactions(d)).resolves.toBe(0);
    expect(updates).toEqual([]);
  });

  it('checks each hash once even if several rows share it', async () => {
    const {d, updates} = deps([A, A.toUpperCase().replace('0X', '0x'), A], {[A]: 'confirmed'});
    await reconcilePendingTransactions(d);
    expect(d.status).toHaveBeenCalledTimes(1);
    expect(updates).toHaveLength(1);
  });

  it('shares one run between concurrent callers', async () => {
    const {d} = deps([A], {[A]: 'confirmed'});
    const [x, y] = await Promise.all([reconcilePendingTransactions(d), reconcilePendingTransactions(d)]);
    expect(x).toBe(y);
    expect(d.status).toHaveBeenCalledTimes(1);
  });

  it('never throws; a failing lookup returns 0 and the next run can retry', async () => {
    const {d} = deps([A], {[A]: new Error('boom')});
    await expect(reconcilePendingTransactions(d)).resolves.toBe(0);
    const again = deps([A], {[A]: 'confirmed'});
    await expect(reconcilePendingTransactions(again.d)).resolves.toBe(1);
  });
});
