/**
 * Tap Payment Orchestrator — End-to-end One-Way NFC contactless payment flow
 */

import {ethers} from 'ethers';
import {MONAD_CONFIG, SESSION_TIMEOUT_MS} from '../config/monad';
import {
  createHceReceiverLease,
  stopHceSession,
} from './hce';
import {
  readReceiverAddress,
  cancelNfcRead,
  stopContinuousHceScan,
} from './nfcReader';
import {sendPayment, withRpcFailover} from './wallet';
import {reverseResolveAddress} from './registry';
import {createSessionIdHash} from '../utils/paymentSession';
import {SUPPORTED_TOKENS} from '../config/tokens';

// TapPayLedger logs native MON payments; MultiTokenLedger logs native + ERC-20 payments.
const TAPPAY_LEDGER_EVENT_ABI = [
  'event PaymentLogged(address indexed from, address indexed to, uint256 amount, bytes32 sessionId, uint256 timestamp)',
];
const MULTI_LEDGER_EVENT_ABI = [
  'event PaymentLogged(address indexed from, address indexed to, address indexed token, uint256 amount, bytes32 sessionIdHash)',
];

export type IncomingPaymentInfo = {
  detected: boolean;
  senderAddress?: string;
  /** Raw amount in the token's smallest unit (wei for MON). */
  amountWei?: bigint;
  /** Human-readable amount string (token-decimals aware). */
  amountDisplay?: string;
  tokenSymbol?: string;
  txHash?: string;
};

/** Resolve a PaymentLogged token address to its symbol and decimals. */
function describeToken(tokenAddress?: string): {symbol: string; decimals: number} {
  if (!tokenAddress || tokenAddress === ethers.ZeroAddress) {
    return {symbol: 'MON', decimals: 18};
  }
  const token = Object.values(SUPPORTED_TOKENS).find(
    t => t.contractAddress && t.contractAddress.toLowerCase() === tokenAddress.toLowerCase(),
  );
  return token ? {symbol: token.symbol, decimals: token.decimals} : {symbol: 'TOKEN', decimals: 18};
}

export type TapSenderPhase =
  | 'idle'
  | 'reading'
  | 'confirming'
  | 'broadcasting'
  | 'completed'
  | 'failed';

export type TapRecipient = {
  receiverAddress: string;
  receiverUsername?: string;
};

export {createSessionId, createSessionIdHash} from '../utils/paymentSession';

/**
 * Step 1 — read the receiver's address over NFC. Does NOT sign or broadcast anything.
 * The caller MUST show this recipient to the user and get explicit confirmation before
 * calling broadcastTapPayment(). A stray NFC tag or relay can answer the read, so the
 * user confirming the exact address they see is the protection against paying the wrong
 * party.
 */
export async function readTapRecipient(
  senderAddress: string,
  onHint?: (hint: string) => void,
): Promise<{recipient?: TapRecipient; error?: string}> {
  const readResult = await readReceiverAddress({onHint});

  if (readResult.status !== 'SUCCESS' || !readResult.receiverAddress) {
    await stopContinuousHceScan();
    return {error: readResult.errorMessage || 'Failed to read receiver address.'};
  }

  // Normalise + checksum; reject anything that is not a valid EVM address.
  let receiverAddress: string;
  try {
    receiverAddress = ethers.getAddress(readResult.receiverAddress);
  } catch {
    await stopContinuousHceScan();
    return {error: 'The other device sent an invalid address. Please try again.'};
  }

  await stopContinuousHceScan(); // Stop reading once we have a candidate address.

  if (receiverAddress.toLowerCase() === senderAddress.toLowerCase()) {
    return {error: 'Cannot send payment to your own address.'};
  }

  let receiverUsername: string | undefined;
  try {
    receiverUsername = (await reverseResolveAddress(receiverAddress)) || undefined;
  } catch {
    // Username is optional; the address is what the user confirms.
  }

  return {recipient: {receiverAddress, receiverUsername}};
}

/**
 * Step 2 — sign and broadcast to a recipient the user has ALREADY confirmed on screen.
 * Signing triggers the device biometric / screen-lock prompt inside sendPayment().
 */
export async function broadcastTapPayment(
  receiverAddress: string,
  amountWei: bigint,
): Promise<{txHash: string | null; error?: string}> {
  const sessionIdHash = createSessionIdHash();

  const result = await sendPayment(
    receiverAddress,
    amountWei,
    sessionIdHash,
    'Confirm to send this payment',
  );

  if (!result.txHash) {
    return {txHash: null, error: result.error || 'Transaction could not be broadcast.'};
  }

  return {txHash: result.txHash};
}

export function createReceiverBroadcastLease() {
  return createHceReceiverLease();
}

export async function cancelTapSession(): Promise<void> {
  await cancelNfcRead();
  await stopContinuousHceScan();
  await stopHceSession();
}

export type IncomingPaymentMatch = {
  senderAddress: string;
  amountWei: bigint;
  amountDisplay: string;
  tokenSymbol: string;
  txHash: string;
  blockNumber: number;
};

/**
 * Scan both ledgers for a confirmed PaymentLogged event paying `recipientAddress`, in blocks
 * [fromBlock, head]. Returns the newest one whose transaction receipt is confirmed (status === 1),
 * or null. This is the ONLY evidence the receiver trusts: a bare balance increase (an unrelated
 * deposit, a dust transfer) is never treated as a TapPay payment.
 */
export async function scanForIncomingTapPayment(
  recipientAddress: string,
  fromBlock: number,
  signal?: AbortSignal,
): Promise<IncomingPaymentMatch | null> {
  const tapLedger = MONAD_CONFIG.contracts.tapPayLedger;
  const multiLedger = MONAD_CONFIG.contracts.multiTokenLedger;

  try {
    return await withRpcFailover(async provider => {
      if (signal?.aborted) return null;
      const head = await provider.getBlockNumber();
      if (signal?.aborted) return null;
      const start = Math.max(0, fromBlock);

      const found: {event: ethers.EventLog; tokenAddress?: string}[] = [];

      if (tapLedger) {
        const c = new ethers.Contract(tapLedger, TAPPAY_LEDGER_EVENT_ABI, provider);
        const events = await c.queryFilter(
          c.filters.PaymentLogged(null, recipientAddress),
          start,
          head,
        );
        if (signal?.aborted) return null;
        for (const e of events) {
          found.push({event: e as ethers.EventLog});
        }
      }

      if (multiLedger && ethers.isAddress(multiLedger)) {
        const c = new ethers.Contract(multiLedger, MULTI_LEDGER_EVENT_ABI, provider);
        const events = await c.queryFilter(
          c.filters.PaymentLogged(null, recipientAddress),
          start,
          head,
        );
        if (signal?.aborted) return null;
        for (const e of events) {
          const evt = e as ethers.EventLog;
          found.push({event: evt, tokenAddress: evt.args?.token as string});
        }
      }

      if (!found.length) {
        return null;
      }

      // Newest first by (block, logIndex).
      found.sort(
        (a, b) => a.event.blockNumber - b.event.blockNumber || a.event.index - b.event.index,
      );

      // Walk newest→oldest and return the first with a confirmed (status === 1) receipt.
      for (let i = found.length - 1; i >= 0; i--) {
        const {event, tokenAddress} = found[i];
        const args = event.args;
        if (!args?.from) {
          continue;
        }
        const receipt = await provider.getTransactionReceipt(event.transactionHash);
        if (signal?.aborted) return null;
        if (!receipt || receipt.status !== 1) {
          continue;
        }
        const {symbol, decimals} = describeToken(tokenAddress);
        const amountWei = args.amount as bigint;
        return {
          senderAddress: args.from as string,
          amountWei,
          amountDisplay: ethers.formatUnits(amountWei, decimals),
          tokenSymbol: symbol,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
        };
      }

      return null;
    });
  } catch {
    return null;
  }
}

/**
 * Wait for a confirmed incoming TapPay payment to `address`. Detection is driven entirely by a
 * confirmed ledger PaymentLogged event emitted at or after the block where we started listening —
 * never by a raw balance delta — and it reports the real sender, amount and token from that event.
 */
export async function waitForIncomingPayment(
  address: string,
  timeoutMs = SESSION_TIMEOUT_MS,
  signal?: AbortSignal,
): Promise<IncomingPaymentInfo> {
  if (signal?.aborted || timeoutMs <= 0) {
    return {detected: false};
  }
  const deadline = Date.now() + timeoutMs;
  const scanController = new AbortController();
  let finished = false;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let wake: (() => void) | undefined;
  let endWait: () => void = () => {};
  const ended = new Promise<IncomingPaymentInfo>(resolve => {
    endWait = () => resolve({detected: false});
  });
  const expiryTimer = setTimeout(endWait, timeoutMs);
  signal?.addEventListener('abort', endWait);

  const sleep = () =>
    new Promise<void>(resolve => {
      wake = resolve;
      pollTimer = setTimeout(resolve, Math.min(1000, Math.max(0, deadline - Date.now())));
    });

  // The scan window MUST start at the chain head when the session began. Never fall back to
  // block 0: that would scan the whole history and report an old payment as this tap (#124).
  // If the head cannot be read, keep retrying until it can or the session ends.
  const readStartBlock = async (): Promise<number | null> => {
    while (!finished && !signal?.aborted && Date.now() < deadline) {
      try {
        const head = await withRpcFailover(p => p.getBlockNumber());
        if (Number.isSafeInteger(head) && head > 0) {
          return head;
        }
      } catch {
        // All endpoints failed: retry after a short pause.
      }
      if (finished || signal?.aborted || Date.now() >= deadline) break;
      await sleep();
    }
    return null;
  };

  const poll = async (): Promise<IncomingPaymentInfo> => {
    const startBlock = await readStartBlock();
    if (startBlock === null) {
      return {detected: false};
    }
    while (!finished && !signal?.aborted && Date.now() < deadline) {
      const match = await scanForIncomingTapPayment(address, startBlock, scanController.signal);
      if (finished || signal?.aborted || Date.now() >= deadline) break;
      if (match) {
        return {
          detected: true,
          senderAddress: match.senderAddress,
          amountWei: match.amountWei,
          amountDisplay: match.amountDisplay,
          tokenSymbol: match.tokenSymbol,
          txHash: match.txHash,
        };
      }
      await sleep();
    }
    return {detected: false};
  };

  try {
    return await Promise.race([poll(), ended]);
  } finally {
    finished = true;
    scanController.abort();
    clearTimeout(expiryTimer);
    if (pollTimer !== undefined) clearTimeout(pollTimer);
    signal?.removeEventListener('abort', endWait);
    wake?.();
  }
}
