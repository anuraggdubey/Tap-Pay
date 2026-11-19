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
import {reverseResolveAddress} from './registry';
import {createSessionIdHash} from '../utils/paymentSession';

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
): Promise<{recipient?: TapRecipient; error?: string}> {
  const readResult = await readReceiverAddress();

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
