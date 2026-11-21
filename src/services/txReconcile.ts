/**
 * Reconcile pending history rows against the chain.
 *
 * A sent payment that was still unconfirmed when the status screen stopped waiting (slow
 * network, app closed) stays `pending`. This looks each one up by hash and applies the real
 * receipt: `confirmed` on status 1, `failed` only on a reverted receipt (status 0). No receipt
 * yet, or a failed lookup, leaves the row untouched so it is retried next time.
 */

import {getPendingTransactions, initHistory, updateTransactionStatus} from './history';
import {getReceiptStatus, ReceiptStatus} from './wallet';

export type ReconcileDeps = {
  init: () => Promise<void>;
  pending: () => Array<{txHash: string}>;
  status: (txHash: string) => Promise<ReceiptStatus>;
  update: (txHash: string, status: 'confirmed' | 'failed') => void;
};

const defaultDeps: ReconcileDeps = {
  init: initHistory,
  pending: getPendingTransactions,
  status: getReceiptStatus,
  update: updateTransactionStatus,
};

let inFlight: Promise<number> | null = null;

/** Returns how many rows were updated. Concurrent calls share one run. */
export function reconcilePendingTransactions(deps: ReconcileDeps = defaultDeps): Promise<number> {
  if (inFlight) {
    return inFlight;
  }
  inFlight = (async () => {
    await deps.init();
    let updated = 0;
    // Dedupe: a hash can appear on more than one row.
    const hashes = [...new Set(deps.pending().map(tx => tx.txHash.toLowerCase()))];
    for (const hash of hashes) {
      const result = await deps.status(hash);
      if (result === 'confirmed') {
        deps.update(hash, 'confirmed');
        updated += 1;
      } else if (result === 'reverted') {
        deps.update(hash, 'failed');
        updated += 1;
      }
    }
    return updated;
  })()
    .catch(() => 0)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
