/**
 * Tap Payment Orchestrator — End-to-end One-Way NFC contactless payment flow
 */

import {ethers} from 'ethers';
import {MONAD_CONFIG} from '../config/monad';
import {
  startHceReceiverSession,
  stopHceSession,
} from './hce';
import {
  readReceiverAddress,
  cancelNfcRead,
  stopContinuousHceScan,
} from './nfcReader';
import {getBalance, sendPayment, withRpcFailover} from './wallet';

const PAYMENT_LOGGED_ABI = [
  'event PaymentLogged(address indexed from, address indexed to, uint256 amount, bytes32 sessionId, uint256 timestamp)',
];

export type IncomingPaymentInfo = {
  detected: boolean;
  senderAddress?: string;
  amountWei?: bigint;
  txHash?: string;
};

export type TapSenderPhase =
  | 'idle'
  | 'reading'
  | 'broadcasting'
  | 'completed'
  | 'failed';

export function createSessionId(): string {
  const sessionIdHex = ethers.hexlify(ethers.randomBytes(16)).replace('0x', '');
  return `${sessionIdHex.slice(0, 8)}-${sessionIdHex.slice(8, 12)}-4${sessionIdHex.slice(13, 16)}-8${sessionIdHex.slice(17, 20)}-${sessionIdHex.slice(20, 32)}`;
}

/**
 * Sender: wait for receiver address, then broadcast payment.
 */
export async function completeSenderTap(
  senderAddress: string,
  amountWei: bigint,
  onPhaseChange?: (phase: TapSenderPhase) => void,
): Promise<{txHash: string | null; receiverAddress: string | null; error?: string}> {
  onPhaseChange?.('reading');

  const readResult = await readReceiverAddress();
  
  if (readResult.status !== 'SUCCESS' || !readResult.receiverAddress) {
    onPhaseChange?.('failed');
    await stopContinuousHceScan();
    return {
      txHash: null,
      receiverAddress: null,
      error: readResult.errorMessage || 'Failed to read receiver address.',
    };
  }

  const receiverAddress = readResult.receiverAddress;

  if (receiverAddress.toLowerCase() === senderAddress.toLowerCase()) {
    onPhaseChange?.('failed');
    await stopContinuousHceScan();
    return {
      txHash: null,
      receiverAddress: null,
      error: 'Cannot send payment to your own address.',
    };
  }

  onPhaseChange?.('broadcasting');
  await stopContinuousHceScan(); // Stop reading after success

  // In the one-way architecture, we don't necessarily have a sessionId for the signature 
  // since we just read the address directly. We can just generate a random one for logging/history
  // or use a dummy hash if sendPayment requires it.
  const sessionId = createSessionId();
  const sessionIdHash = ethers.keccak256(
    ethers.solidityPacked(['string'], [sessionId]),
  );

  const result = await sendPayment(
    receiverAddress,
    amountWei,
    sessionIdHash,
    'Confirm Biometrics to Complete Tap Payment',
  );

  if (!result.txHash) {
    onPhaseChange?.('failed');
    return {
      txHash: null,
      receiverAddress: receiverAddress,
      error: result.error || 'Transaction could not be broadcast.',
    };
  }

  onPhaseChange?.('completed');

  return {
    txHash: result.txHash,
    receiverAddress: receiverAddress,
  };
}

export async function startReceiverBroadcast(
  receiverAddress: string,
): Promise<boolean> {
  return await startHceReceiverSession(receiverAddress);
}

export async function stopReceiverBroadcast(): Promise<void> {
  await stopHceSession();
}

export async function cancelTapSession(): Promise<void> {
  await cancelNfcRead();
  await stopContinuousHceScan();
  await stopHceSession();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Look up the latest PaymentLogged event for a recipient on TapPayLedger.
 * Used by the receiver after a balance increase to recover the sender address.
 */
export async function lookupIncomingPayment(
  recipientAddress: string,
  expectedAmountWei?: bigint | null,
): Promise<{senderAddress?: string; amountWei?: bigint; txHash?: string}> {
  const ledgerAddress = MONAD_CONFIG.contracts.tapPayLedger;
  if (!ledgerAddress) {
    return {};
  }

  try {
    return await withRpcFailover(async provider => {
      const contract = new ethers.Contract(
        ledgerAddress,
        PAYMENT_LOGGED_ABI,
        provider,
      );
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 64);
      const filter = contract.filters.PaymentLogged(null, recipientAddress);
      const events = await contract.queryFilter(filter, fromBlock, currentBlock);

      if (!events.length) {
        return {};
      }

      let match = events[events.length - 1];
      if (expectedAmountWei != null && expectedAmountWei > 0n) {
        const amountMatch = [...events].reverse().find(event => {
          const args = (event as ethers.EventLog).args;
          return args?.amount === expectedAmountWei;
        });
        if (amountMatch) {
          match = amountMatch;
        }
      }

      const args = (match as ethers.EventLog).args;
      if (!args?.from) {
        return {};
      }

      return {
        senderAddress: args.from as string,
        amountWei: args.amount as bigint,
        txHash: match.transactionHash,
      };
    });
  } catch {
    return {};
  }
}

export async function waitForIncomingPayment(
  address: string,
  previousBalance: bigint,
  amountWei: bigint | null,
  timeoutMs = 60_000,
): Promise<IncomingPaymentInfo> {
  const deadline = Date.now() + timeoutMs;
  // fast aggressive polling every 500ms
  while (Date.now() < deadline) {
    try {
      const balance = await getBalance(address);
      const received =
        amountWei != null
          ? balance >= previousBalance + amountWei
          : balance > previousBalance;

      if (received) {
        const delta = balance - previousBalance;
        // Event index can lag the balance update briefly — retry a few times
        for (let attempt = 0; attempt < 5; attempt++) {
          const info = await lookupIncomingPayment(
            address,
            amountWei ?? (delta > 0n ? delta : null),
          );
          if (info.senderAddress) {
            return {
              detected: true,
              senderAddress: info.senderAddress,
              amountWei: info.amountWei ?? (delta > 0n ? delta : undefined),
              txHash: info.txHash,
            };
          }
          await sleep(400);
        }

        return {
          detected: true,
          amountWei: delta > 0n ? delta : undefined,
        };
      }
    } catch {
      // Keep polling
    }
    await sleep(500);
  }

  return {detected: false};
}
