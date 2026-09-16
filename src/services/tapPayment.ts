/**
 * Tap Payment Orchestrator — End-to-end NFC contactless payment flow
 *
 * Flow:
 * 1. Sender arms HCE with signed payment offer
 * 2. Receiver reads offer via NFC
 * 3. Receiver accepts → broadcasts accept HCE with their address
 * 4. Sender detects offer read → reads accept → broadcasts on-chain payment
 */

import {ethers} from 'ethers';
import {
  startHceSession,
  startHceAcceptSession,
  stopHceSession,
  waitForHceRead,
} from './hce';
import {pollForAcceptResponse, cancelNfcRead} from './nfcReader';
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
 * Arm sender HCE with the signed payment offer
 */
export async function armSenderTap(
  encodedPayload: Uint8Array,
): Promise<boolean> {
  return await startHceSession(encodedPayload);
}

/**
 * Sender: wait until receiver reads the payment offer, then poll for accept
 */
export async function completeSenderTap(
  session: ArmedTapSession,
  onPhaseChange?: (phase: TapSenderPhase) => void,
): Promise<{txHash: string | null; receiverAddress: string | null; error?: string}> {
  onPhaseChange?.('armed');

  const offerRead = await waitForHceRead();
  if (!offerRead) {
    onPhaseChange?.('failed');
    return {txHash: null, receiverAddress: null, error: 'No device read your payment offer.'};
  }

  onPhaseChange?.('offer_read');
  onPhaseChange?.('waiting_accept');

  await stopHceSession();
  await cancelNfcRead();

  const accept = await pollForAcceptResponse(session.sessionId);
  if (accept.status !== 'SUCCESS' || !accept.receiverAddress) {
    onPhaseChange?.('failed');
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
    return {
      txHash: null,
      receiverAddress: accept.receiverAddress,
      error: result.error || 'Transaction could not be broadcast.',
    };
  }

  onPhaseChange?.('completed');
  await stopHceSession();

  return {
    txHash: result.txHash,
    receiverAddress: accept.receiverAddress,
  };
}

/**
 * Receiver: broadcast accept response over HCE for sender to read
 */
export async function broadcastReceiverAccept(
  receiverAddress: string,
  sessionId: string,
): Promise<boolean> {
  return await startHceAcceptSession(receiverAddress, sessionId);
}

/**
 * Cancel any active tap session resources
 */
export async function cancelTapSession(): Promise<void> {
  await cancelNfcRead();
  await stopHceSession();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Receiver: wait until on-chain balance reflects the incoming payment
 */
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
      // Keep polling through transient RPC errors
    }
    await sleep(2000);
  }

  return false;
}
