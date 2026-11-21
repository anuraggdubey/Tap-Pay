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

let historyCache: TransactionRecord[] = [];
let isLoaded = false;
const listeners: Array<() => void> = [];

/**
 * Load history from AsyncStorage (called once on first access)
 */
async function ensureLoaded(): Promise<void> {
  if (isLoaded) {
    return;
  }
  try {
    // Encrypted at rest; a legacy plaintext copy is migrated on first read.
    const stored = await loadHistoryJson();
    if (stored) {
      historyCache = JSON.parse(stored);
    }
  } catch {
    // If parse fails, start fresh
    historyCache = [];
  }
  isLoaded = true;
}

// Writes run one at a time, each with the snapshot taken when it was requested, so the last
// change always wins and older snapshots can never overwrite newer ones.
let writeChain: Promise<void> = Promise.resolve();

/**
 * Persist current cache, encrypted (see secureHistoryStore). Never falls back to plaintext.
 */
function persistHistory(): Promise<void> {
  const snapshot = JSON.stringify(historyCache);
  writeChain = writeChain
    .then(() => saveHistoryJson(snapshot))
    .catch(() => {
      // Silently fail — history is non-critical
    });
  return writeChain;
}

export function getTransactionHistory(): TransactionRecord[] {
  // Trigger async load if not loaded yet
  if (!isLoaded) {
    ensureLoaded().then(() => {
      listeners.forEach(fn => fn());
    });
  }
  return [...historyCache];
}

/**
 * Initialize history — call this on app start to load from storage
 */
export async function initHistory(): Promise<void> {
  await ensureLoaded();
  listeners.forEach(fn => fn());
}

export function recordTransaction(tx: Omit<TransactionRecord, 'id' | 'timestamp'>): TransactionRecord {
  const newRecord: TransactionRecord = {
    ...tx,
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  historyCache = [newRecord, ...historyCache];
  persistHistory();
  listeners.forEach(fn => fn());
  return newRecord;
}

export function updateTransactionStatus(txHash: string, status: 'confirmed' | 'failed') {
  historyCache = historyCache.map(tx => {
    if (tx.txHash.toLowerCase() === txHash.toLowerCase()) {
      return {...tx, status};
    }
    return tx;
  });
  persistHistory();
  listeners.forEach(fn => fn());
}

const REAL_TX_HASH = /^0x[0-9a-fA-F]{64}$/;

/**
 * Rows that are still pending and have a real on-chain hash (placeholder hashes such as
 * "tap-payment" have no receipt to look up).
 */
export function getPendingTransactions(): TransactionRecord[] {
  return historyCache.filter(tx => tx.status === 'pending' && REAL_TX_HASH.test(tx.txHash));
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
