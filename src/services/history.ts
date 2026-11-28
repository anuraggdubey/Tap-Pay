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
  status: 'confirmed' | 'pending' | 'failed';
  txHash: string;
  timestamp: string; // ISO 8601
}

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

export function updateTransactionStatus(txHash: string, status: 'confirmed' | 'failed') {
  const state = histories.get(activeScope)!;
  mutate(state, rows => rows.map(tx => {
    if (tx.txHash.toLowerCase() === txHash.toLowerCase()) {
      return {...tx, status};
    }
    return tx;
  }));
}

export function updateTransactionUsername(
  walletAddress: string,
  txHash: string,
  counterpartyUsername: string,
) {
  const state = histories.get(walletAddress.toLowerCase()) ?? histories.get(activeScope);
  if (!state) {
    return;
  }
  mutate(state, rows =>
    rows.map(tx => {
      if (tx.txHash.toLowerCase() === txHash.toLowerCase() && !tx.counterpartyUsername) {
        return {...tx, counterpartyUsername};
      }
      return tx;
    }),
  );
}

const REAL_TX_HASH = /^0x[0-9a-fA-F]{64}$/;

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
