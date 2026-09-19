/**
 * Transaction History Store — AsyncStorage-backed
 *
 * Persists transaction history to AsyncStorage.
 * Tracks local transaction history for Monad Tap Pay & Username Pay.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_STORAGE_KEY = '@tappay_tx_history';

export interface TransactionRecord {
  id: string;
  direction: 'sent' | 'received';
  counterparty: string;
  counterpartyUsername?: string;
  amount: string;
  status: 'confirmed' | 'pending' | 'failed';
  txHash: string;
  timestamp: string; // ISO 8601
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
    const stored = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
    if (stored) {
      historyCache = JSON.parse(stored);
    }
  } catch {
    // If parse fails, start fresh
    historyCache = [];
  }
  isLoaded = true;
}

/**
 * Persist current cache to AsyncStorage
 */
async function persistHistory(): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyCache));
  } catch {
    // Silently fail — history is non-critical
  }
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

export function subscribeHistory(callback: () => void): () => void {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) {
      listeners.splice(idx, 1);
    }
  };
}
