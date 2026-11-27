/**
 * Reconcile pending history rows against the chain.
 *
 * A sent payment that was still unconfirmed when the status screen stopped waiting (slow
 * network, app closed) stays `pending`. This looks up every hash the row may be mined under
 * (after a speed-up or cancel there are several with the same nonce) and applies the outcome:
 *  - a receipt with status 1: `confirmed`, or `cancelled` if the mined one is the cancellation;
 *  - a receipt with status 0: `failed`;
 *  - no receipt, but the wallet's mined nonce has moved past this payment's nonce: `dropped`
 *    (another transaction used the nonce, so this one can never be mined);
 *  - no receipt, nonce unknown, and no endpoint knows the transaction for DROP_UNKNOWN_AFTER_MS:
 *    `dropped` (the network forgot it).
 * Otherwise the row stays pending (shown as stuck after a while) and is retried next time. A failed
 * lookup never changes a row.
 */

import {
  TransactionRecord,
  getPendingTransactions,
  initHistory,
  setTransactionNonce,
  txHashes,
  updateTransactionStatus,
} from './history';
import {getLatestNonce, getReceiptStatus, getTransactionNonce, getWalletAddress, ReceiptStatus} from './wallet';

/** Receipts appear within seconds on Monad; wait this long before trusting "no receipt". */
export const DROP_GRACE_MS = 60 * 1000;
/** A payment no endpoint knows about, with no nonce on record, is dropped after this long. */
export const DROP_UNKNOWN_AFTER_MS = 30 * 60 * 1000;

export type ReconcileDeps = {
  init: () => Promise<void>;
  pending: () => TransactionRecord[];
  status: (txHash: string) => Promise<ReceiptStatus>;
  update: (txHash: string, status: 'confirmed' | 'failed' | 'dropped' | 'cancelled') => void;
  /** Sender nonce of a transaction known to the network, or null. */
  txNonce: (txHash: string) => Promise<number | null>;
  saveNonce: (txHash: string, nonce: number) => void;
  /** Mined ('latest') nonce of this wallet, or null if unavailable. */
  latestNonce: () => Promise<number | null>;
  now: () => number;
};

const defaultDeps: ReconcileDeps = {
  init: initHistory,
  pending: getPendingTransactions,
  status: getReceiptStatus,
  update: updateTransactionStatus,
  txNonce: getTransactionNonce,
  saveNonce: setTransactionNonce,
  latestNonce: async () => {
    const address = await getWalletAddress();
    return address ? getLatestNonce(address) : null;
  },
  now: Date.now,
};

let inFlight: Promise<number> | null = null;

async function reconcileRow(
  tx: TransactionRecord,
  deps: ReconcileDeps,
  latestNonce: () => Promise<number | null>,
): Promise<boolean> {
  const hashes = txHashes(tx);
  let reachable = true;
  for (const hash of hashes) {
    const result = await deps.status(hash);
    if (result === 'confirmed') {
      const cancelled = !!tx.cancelHash && tx.cancelHash.toLowerCase() === hash.toLowerCase();
      deps.update(hash, cancelled ? 'cancelled' : 'confirmed');
      return true;
    }
    if (result === 'reverted') {
      deps.update(hash, 'failed');
      return true;
    }
    if (result === 'unknown') {
      reachable = false;
    }
  }
  // Only a sent payment's nonce belongs to this wallet. Without an answer from the network we
  // cannot tell "not mined" from "could not look", so nothing changes.
  if (tx.direction !== 'sent' || !reachable) {
    return false;
  }
  const age = deps.now() - Date.parse(tx.timestamp);
  if (!(age > DROP_GRACE_MS)) {
    return false;
  }

  let nonce = tx.nonce ?? null;
  if (nonce === null) {
    for (const hash of hashes) {
      nonce = await deps.txNonce(hash);
      if (nonce !== null) {
        deps.saveNonce(tx.txHash, nonce);
        break;
      }
    }
  }
  if (nonce === null) {
    if (age > DROP_UNKNOWN_AFTER_MS) {
      deps.update(tx.txHash, 'dropped');
      return true;
    }
    return false;
  }
  const mined = await latestNonce();
  if (mined !== null && mined > nonce) {
    deps.update(tx.txHash, 'dropped');
    return true;
  }
  return false;
}

/** Returns how many rows were updated. Concurrent calls share one run. */
export function reconcilePendingTransactions(deps: ReconcileDeps = defaultDeps): Promise<number> {
  if (inFlight) {
    return inFlight;
  }
  inFlight = (async () => {
    await deps.init();
    let updated = 0;
    // The wallet's mined nonce is read at most once per run.
    let nonceLookup: Promise<number | null> | null = null;
    const latestNonce = () => (nonceLookup ??= deps.latestNonce().catch(() => null));
    // Dedupe: a hash can appear on more than one row.
    const seen = new Set<string>();
    for (const tx of deps.pending()) {
      const key = tx.txHash.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      try {
        if (await reconcileRow(tx, deps, latestNonce)) {
          updated += 1;
        }
      } catch (error: any) {
        console.warn('Could not reconcile a pending payment:', error?.message || error);
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
