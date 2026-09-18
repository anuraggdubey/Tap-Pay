/**
 * Tap Payment Orchestrator — End-to-end One-Way NFC contactless payment flow
 */

import {ethers} from 'ethers';
import {
  startHceReceiverSession,
  stopHceSession,
} from './hce';
import {
  readReceiverAddress,
  cancelNfcRead,
  stopContinuousHceScan,
} from './nfcReader';
import {getBalance, sendPayment} from './wallet';

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

export async function waitForIncomingPayment(
  address: string,
  previousBalance: bigint,
  amountWei: bigint | null,
  timeoutMs = 60_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  // fast aggressive polling every 500ms
  while (Date.now() < deadline) {
    try {
      const balance = await getBalance(address);
      if (amountWei) {
        if (balance >= previousBalance + amountWei) {
          return true;
        }
      } else {
        if (balance > previousBalance) {
          return true;
        }
      }
    } catch {
      // Keep polling
    }
    await sleep(500);
  }

  return false;
}
