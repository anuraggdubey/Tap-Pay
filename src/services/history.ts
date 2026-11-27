/**
 * Transaction History Store
 *
 * Tracks local transaction history for Monad Tap Pay & Username Pay. The history is encrypted
 * at rest (AES-GCM, key in the Android Keystore); see secureHistoryStore.ts.
 */

import {loadHistoryJson, saveHistoryJson} from './secureHistoryStore';

export interface TransactionRecord {
  id: string;
  direction: 'sent' | 'received';
  counterparty: string;
  counterpartyUsername?: string;
  amount: string;
  /** Token ticker shown in UI (AUSD, USDC, USDT, MON). Defaults to MON for legacy rows. */
  tokenSymbol?: string;
  /**
   * - dropped: never mined; its nonce was used by another transaction or the network forgot it.
   *   No money moved.
   * - cancelled: the user replaced it with a 0-value cancellation that was mined. No money moved.
   */
  status: TransactionStatus;
  /** Current hash. After a speed-up or cancel, the replacement's hash (same nonce). */
  txHash: string;
  timestamp: string; // ISO 8601
  /** Sender nonce of a sent payment, learned while it was pending. */
  nonce?: number;
  /** Earlier hashes of this payment that were replaced (speed-up / cancel). Any one may be mined. */
  replacedHashes?: string[];
  /** Hash of the 0-value cancellation, if the user cancelled. If it is mined, the payment was not. */
  cancelHash?: string;
}

export type TransactionStatus = 'confirmed' | 'pending' | 'failed' | 'dropped' | 'cancelled';

const REAL_TX_HASH = /^0x[0-9a-fA-F]{64}$/;

/** A sent payment pending longer than this is shown as stuck and can be sped up or cancelled. */
export const STUCK_AFTER_MS = 2 * 60 * 1000;

/** True for a sent payment that has been pending for longer than STUCK_AFTER_MS. */
export function isStuck(tx: TransactionRecord, now: number = Date.now()): boolean {
  return (
    tx.direction === 'sent' &&
    tx.status === 'pending' &&
    REAL_TX_HASH.test(tx.txHash) &&
    now - Date.parse(tx.timestamp) > STUCK_AFTER_MS
  );
}

/** Every hash this row may be mined under (current first). */
export function txHashes(tx: TransactionRecord): string[] {
  return [tx.txHash, ...(tx.replacedHashes ?? [])];
}

const sameHash = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const rowHasHash = (tx: TransactionRecord, hash: string) => txHashes(tx).some(h => sameHash(h, hash));

/** Resolve display ticker for a history row (legacy rows without tokenSymbol → MON). */
export function getTxTokenSymbol(tx: Pick<TransactionRecord, 'tokenSymbol'>): string {
  const symbol = tx.tokenSymbol?.trim();
  return symbol ? symbol.toUpperCase() : 'MON';
}

type Mutation = (rows: TransactionRecord[]) => TransactionRecord[];
type Persistence = {load: () => Promise<string | null>; save: (json: string) => Promise<void>};
type HistoryState = {
  cache: TransactionRecord[];
  loaded: boolean;
  loading?: Promise<void>;
  mutations: Mutation[];
  writes: Promise<void>;
  persistence: Persistence;
};

function createState(persistence: Persistence): HistoryState {
  return {cache: [], loaded: false, mutations: [], writes: Promise.resolve(), persistence};
}

const histories = new Map<string, HistoryState>([
  ['', createState({load: loadHistoryJson, save: saveHistoryJson})],
]);
let activeScope = '';
const listeners: Array<() => void> = [];

function notify(state: HistoryState) {
  if (histories.get(activeScope) === state) {
    listeners.forEach(fn => fn());
  }
}

async function ensureLoaded(state: HistoryState): Promise<void> {
  if (state.loaded) {
    return;
  }
  if (!state.loading) {
    state.loading = (async () => {
      let rows: TransactionRecord[] = [];
      try {
        const stored = await state.persistence.load();
        const parsed = stored ? JSON.parse(stored) : [];
        if (Array.isArray(parsed)) {
          rows = parsed.filter(row => row && typeof row.txHash === 'string');
        }
      } catch {
        // Unreadable storage must not discard payments recorded during the read.
      }
      for (const mutation of state.mutations) {
        rows = mutation(rows);
      }
      state.cache = rows;
      state.mutations = [];
      state.loaded = true;
    })();
  }
  await state.loading;
}

function persistHistory(state: HistoryState): Promise<void> {
  state.writes = state.writes
    .then(async () => {
      await ensureLoaded(state);
      await state.persistence.save(JSON.stringify(state.cache));
    })
    .catch(() => {
      // Silently fail — history is non-critical
    });
  return state.writes;
}

function mutate(state: HistoryState, mutation: Mutation) {
  state.cache = mutation(state.cache);
  if (!state.loaded) {
    state.mutations.push(mutation);
  }
  persistHistory(state);
  notify(state);
}

/** Switch the visible history without redirecting in-flight reads or writes. */
export async function setHistoryScope(scope: string | null, persistence: Persistence): Promise<void> {
  activeScope = scope?.toLowerCase() ?? 'signed-out';
  let state = histories.get(activeScope);
  if (!state) {
    state = createState(persistence);
    histories.set(activeScope, state);
  }
  notify(state);
  await ensureLoaded(state);
  notify(state);
}

export function getTransactionHistory(): TransactionRecord[] {
  const state = histories.get(activeScope)!;
  if (!state.loaded) {
    ensureLoaded(state).then(() => notify(state));
  }
  return [...state.cache];
}

/**
 * Initialize history — call this on app start to load from storage
 */
export async function initHistory(): Promise<void> {
  const state = histories.get(activeScope)!;
  await ensureLoaded(state);
  notify(state);
}

export function recordTransaction(tx: Omit<TransactionRecord, 'id' | 'timestamp'> & {walletAddress?: string}): TransactionRecord {
  const {walletAddress, ...payment} = tx;
  const newRecord: TransactionRecord = {
    ...payment,
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  const state = histories.get(walletAddress?.toLowerCase() ?? activeScope);
  if (state) {
    mutate(state, rows => [newRecord, ...rows]);
  }
  return newRecord;
}

/**
 * Set the outcome of the row that `txHash` belongs to (its current or a replaced hash). When the
 * outcome comes from a specific mined hash, that hash becomes the row's reference.
 */
export function updateTransactionStatus(txHash: string, status: Exclude<TransactionStatus, 'pending'>) {
  const state = histories.get(activeScope)!;
  mutate(state, rows => rows.map(tx => {
    if (!rowHasHash(tx, txHash)) {
      return tx;
    }
    if (sameHash(tx.txHash, txHash) || status === 'dropped') {
      return {...tx, status};
    }
    // A replaced hash was mined instead of the current one.
    return {
      ...tx,
      status,
      txHash,
      replacedHashes: txHashes(tx).filter(h => !sameHash(h, txHash)),
    };
  }));
}

/** Remember the sender nonce of a pending payment (needed to detect a dropped transaction). */
export function setTransactionNonce(txHash: string, nonce: number) {
  const state = histories.get(activeScope)!;
  mutate(state, rows => rows.map(tx => (rowHasHash(tx, txHash) ? {...tx, nonce} : tx)));
}

/**
 * A pending payment was replaced by a new transaction with the same nonce (speed-up or cancel).
 * The row keeps every hash, because whichever one is mined decides the outcome.
 */
export function replaceTransaction(oldHash: string, newHash: string, kind: 'speedup' | 'cancel', nonce: number) {
  const state = histories.get(activeScope)!;
  mutate(state, rows => rows.map(tx => {
    if (!rowHasHash(tx, oldHash)) {
      return tx;
    }
    return {
      ...tx,
      txHash: newHash,
      nonce,
      replacedHashes: txHashes(tx),
      ...(kind === 'cancel' ? {cancelHash: newHash} : {}),
    };
  }));
}

/** Sent payments that look stuck (see isStuck). */
export function getStuckPayments(now: number = Date.now()): TransactionRecord[] {
  return histories.get(activeScope)!.cache.filter(tx => isStuck(tx, now));
}


/**
 * Rows that are still pending and have a real on-chain hash (placeholder hashes such as
 * "tap-payment" have no receipt to look up).
 */
export function getPendingTransactions(): TransactionRecord[] {
  return histories.get(activeScope)!.cache.filter(tx => tx.status === 'pending' && REAL_TX_HASH.test(tx.txHash));
}

export function subscribeHistory(callback: () => void): () => void {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) {
      listeners.splice(idx, 1);
    }
  };
}
