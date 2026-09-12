/**
 * Transaction History Store
 *
 * Tracks local transaction history for Monad Tap Pay & Username Pay.
 */

export interface TransactionRecord {
  id: string;
  direction: 'sent' | 'received';
  counterparty: string;
  counterpartyUsername?: string;
  amount: string;
  status: 'confirmed' | 'pending' | 'failed';
  txHash: string;
  timestamp: string;
}

// In-memory store initialized with sample transaction records for demo UX
let historyCache: TransactionRecord[] = [
  {
    id: 'demo-tx-1',
    direction: 'received',
    counterparty: '0x32Be343B94f860124dC4fEe278FDCBD38C102D88',
    counterpartyUsername: 'aditya',
    amount: '1.0',
    status: 'confirmed',
    txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    timestamp: 'Today, 2:15 PM',
  },
  {
    id: 'demo-tx-2',
    direction: 'sent',
    counterparty: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    counterpartyUsername: 'coffee_shop',
    amount: '0.25',
    status: 'confirmed',
    txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    timestamp: 'Yesterday, 6:40 PM',
  },
];

const listeners: Array<() => void> = [];

export function getTransactionHistory(): TransactionRecord[] {
  return [...historyCache];
}

export function recordTransaction(tx: Omit<TransactionRecord, 'id' | 'timestamp'>): TransactionRecord {
  const newRecord: TransactionRecord = {
    ...tx,
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: 'Just now',
  };

  historyCache = [newRecord, ...historyCache];
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
