/**
 * Tap Payment Orchestrator — End-to-end NFC contactless payment flow
 */

import {ethers} from 'ethers';
import {
  startHceSession,
  startHceAcceptSession,
  stopHceSession,
  waitForHceRead,
} from './hce';
import {pollForAcceptResponse, cancelNfcRead, prepareSenderForHce, stopContinuousHceScan} from './nfcReader';
import {getBalance, sendPayment} from './wallet';
import {encodePaymentOffer, PaymentOffer} from '../utils/apdu';

export type TapSenderPhase =
  | 'idle'
  | 'armed'
  | 'offer_read'
  | 'waiting_accept'
  | 'broadcasting'
  | 'completed'
  | 'failed';

export interface ArmedTapSession {
  sessionId: string;
  amountWei: bigint;
  amountDisplay: string;
  encodedPayload: Uint8Array;
  offer: PaymentOffer;
}

export function createSessionId(): string {
  const sessionIdHex = ethers.hexlify(ethers.randomBytes(16)).replace('0x', '');
  return `${sessionIdHex.slice(0, 8)}-${sessionIdHex.slice(8, 12)}-4${sessionIdHex.slice(13, 16)}-8${sessionIdHex.slice(17, 20)}-${sessionIdHex.slice(20, 32)}`;
}

export function buildPaymentOffer(
  version: number,
  amountWei: bigint,
  senderAddress: string,
  sessionId: string,
  signature: string,
): {offer: PaymentOffer; encodedPayload: Uint8Array} {
  const offer: PaymentOffer = {
    version,
    amountWei,
    senderAddress,
    sessionId,
    signature,
  };

  return {
    offer,
    encodedPayload: encodePaymentOffer(offer),
  };
}

/**
 * Arm sender HCE. Returns a promise that resolves when receiver reads the offer.
 * IMPORTANT: readPromise must be created BEFORE calling this (see completeSenderTap).
 */
export async function armSenderTap(
  encodedPayload: Uint8Array,
): Promise<boolean> {
  return await startHceSession(encodedPayload);
}

/**
 * Sender: wait for offer read, then accept, then broadcast payment.
 * Creates the HCE read listener BEFORE arming to avoid race conditions.
 */
export async function completeSenderTap(
  session: ArmedTapSession,
  onPhaseChange?: (phase: TapSenderPhase) => void,
): Promise<{txHash: string | null; receiverAddress: string | null; error?: string}> {
  // Sender must NOT be in reader mode — only HCE card emulation
  await prepareSenderForHce();
  await stopContinuousHceScan();

  // Register read listener BEFORE enabling HCE (prevents missing fast reads)
  const offerReadPromise = waitForHceRead();

  onPhaseChange?.('armed');

  const armed = await startHceSession(session.encodedPayload);
  if (!armed) {
    onPhaseChange?.('failed');
    return {
      txHash: null,
      receiverAddress: null,
      error: 'Failed to start NFC card emulation. Is NFC enabled?',
    };
  }

  const offerRead = await offerReadPromise;
  if (!offerRead) {
    onPhaseChange?.('failed');
    await stopHceSession(true);
    return {
      txHash: null,
      receiverAddress: null,
      error: 'No device read your payment offer. Hold phones back-to-back near the top.',
    };
  }

  onPhaseChange?.('offer_read');
  onPhaseChange?.('waiting_accept');

  // Must disable HCE before this phone can act as NFC reader
  await stopHceSession(false);
  await cancelNfcRead();

  const accept = await pollForAcceptResponse(session.sessionId);
  if (accept.status !== 'SUCCESS' || !accept.receiverAddress) {
    onPhaseChange?.('failed');
    await stopHceSession(true);
    return {
      txHash: null,
      receiverAddress: null,
      error: accept.errorMessage || 'Receiver did not accept the payment.',
    };
  }

  if (
    accept.receiverAddress.toLowerCase() === session.offer.senderAddress.toLowerCase()
  ) {
    onPhaseChange?.('failed');
    await stopHceSession(true);
    return {
      txHash: null,
      receiverAddress: null,
      error: 'Cannot send payment to your own address.',
    };
  }

  onPhaseChange?.('broadcasting');

  const sessionIdHash = ethers.keccak256(
    ethers.solidityPacked(['string'], [session.sessionId]),
  );

  const result = await sendPayment(
    accept.receiverAddress,
    session.amountWei,
    sessionIdHash,
    'Confirm Biometrics to Complete Tap Payment',
  );

  if (!result.txHash) {
    onPhaseChange?.('failed');
    await stopHceSession(true);
    return {
      txHash: null,
      receiverAddress: accept.receiverAddress,
      error: result.error || 'Transaction could not be broadcast.',
    };
  }

  onPhaseChange?.('completed');
  await stopHceSession(true);

  return {
    txHash: result.txHash,
    receiverAddress: accept.receiverAddress,
  };
}

export async function broadcastReceiverAccept(
  receiverAddress: string,
  sessionId: string,
): Promise<boolean> {
  return await startHceAcceptSession(receiverAddress, sessionId);
}

export async function cancelTapSession(): Promise<void> {
  await cancelNfcRead();
  await stopHceSession(true);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function waitForIncomingPayment(
  address: string,
  previousBalance: bigint,
  amountWei: bigint,
  timeoutMs = 30_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const balance = await getBalance(address);
      if (balance >= previousBalance + amountWei) {
        return true;
      }
    } catch {
      // Keep polling
    }
    await sleep(2000);
  }

  return false;
}
