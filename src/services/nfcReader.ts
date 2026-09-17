/**
 * NFC Reader Service — Reads HCE-emulated Type 4 tags via IsoDep APDUs
 */

import NfcManager from 'react-native-nfc-manager';
import {SESSION_TIMEOUT_MS} from '../config/monad';
import {readType4HceTextWithTimeout} from '../utils/type4Nfc';
import {
  decodePaymentOffer,
  decodeAcceptNdefContent,
  decodeOfferNdefContent,
  verifyPaymentOffer,
  PaymentOffer,
} from '../utils/apdu';

export type NfcReadStatus =
  | 'SUCCESS'
  | 'DISCONNECTED'
  | 'INVALID_PAYLOAD'
  | 'SIGNATURE_INVALID'
  | 'SESSION_MISMATCH'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'ERROR';

export interface NfcReadResponse {
  status: NfcReadStatus;
  offer: PaymentOffer | null;
  errorMessage?: string;
}

export interface NfcAcceptResponse {
  status: NfcReadStatus;
  receiverAddress: string | null;
  sessionId: string | null;
  errorMessage?: string;
}

const SCAN_TIMEOUT_MS = 12_000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isUserCancelled(error: any): boolean {
  const errorStr = error?.message || error?.toString() || '';
  return errorStr.includes('cancelled') || errorStr.includes('user cancelled');
}

function isDisconnect(error: any): boolean {
  const errorStr = error?.message || error?.toString() || '';
  return (
    errorStr.includes('Tag was lost') ||
    errorStr.includes('disconnect') ||
    errorStr.includes('transceive fail') ||
    errorStr.includes('Tag connection lost')
  );
}

function isTimeout(error: any): boolean {
  const errorStr = error?.message || error?.toString() || '';
  return errorStr.includes('timeout') || errorStr.includes('Timeout');
}

/**
 * Initialize NFC Manager
 */
export async function initNfc(): Promise<boolean> {
  try {
    await NfcManager.start();
    return true;
  } catch (error) {
    console.error('Failed to init NFC:', error);
    return false;
  }
}

export async function isNfcSupported(): Promise<boolean> {
  try {
    return await NfcManager.isSupported();
  } catch {
    return false;
  }
}

export async function isNfcEnabled(): Promise<boolean> {
  try {
    return await NfcManager.isEnabled();
  } catch {
    return false;
  }
}

export async function openNfcSettings(): Promise<void> {
  try {
    await NfcManager.goToNfcSetting();
  } catch {
    console.error('Could not open NFC settings');
  }
}

/**
 * Read NDEF text from an HCE-emulated Type 4 card (IsoDep + APDU)
 */
async function readHceNdefText(): Promise<string | null> {
  return await readType4HceTextWithTimeout(SCAN_TIMEOUT_MS);
}

/**
 * Read a payment offer from sender's HCE card
 */
export async function readPaymentOffer(): Promise<NfcReadResponse> {
  try {
    const text = await readHceNdefText();

    if (!text) {
      return {
        status: 'INVALID_PAYLOAD',
        offer: null,
        errorMessage: 'No data received. Make sure sender tapped "Ready to Tap" first.',
      };
    }

    const bytes = decodeOfferNdefContent(text);
    if (!bytes) {
      return {
        status: 'INVALID_PAYLOAD',
        offer: null,
        errorMessage: 'Received data is not a payment offer. Hold phones still and retry.',
      };
    }

    const offer = decodePaymentOffer(bytes);
    if (!offer) {
      return {
        status: 'INVALID_PAYLOAD',
        offer: null,
        errorMessage: 'Invalid payment structure. Ensure both phones use the latest app.',
      };
    }

    if (!verifyPaymentOffer(offer)) {
      return {
        status: 'SIGNATURE_INVALID',
        offer: null,
        errorMessage: 'Could not verify sender signature. Payment rejected.',
      };
    }

    return {status: 'SUCCESS', offer};
  } catch (error: any) {
    if (isUserCancelled(error)) {
      return {status: 'CANCELLED', offer: null};
    }
    if (isTimeout(error)) {
      return {
        status: 'TIMEOUT',
        offer: null,
        errorMessage: 'No NFC signal detected. Hold phones back-to-back, near the top.',
      };
    }
    if (isDisconnect(error)) {
      return {
        status: 'DISCONNECTED',
        offer: null,
        errorMessage: 'Tap interrupted. Keep phones still and try again.',
      };
    }
    console.error('NFC read error:', error);
    return {
      status: 'ERROR',
      offer: null,
      errorMessage: error?.message || 'NFC read failed. Retry the tap.',
    };
  } finally {
    NfcManager.cancelTechnologyRequest({delayMsAndroid: 200}).catch(() => {});
  }
}

/**
 * Read receiver accept response from HCE card (sender side)
 */
export async function readAcceptResponse(
  expectedSessionId: string,
): Promise<NfcAcceptResponse> {
  try {
    const text = await readHceNdefText();

    if (!text) {
      return {
        status: 'INVALID_PAYLOAD',
        receiverAddress: null,
        sessionId: null,
        errorMessage: 'No accept signal. Receiver must tap Accept, then hold phones together.',
      };
    }

    const accept = decodeAcceptNdefContent(text);
    if (!accept) {
      return {
        status: 'INVALID_PAYLOAD',
        receiverAddress: null,
        sessionId: null,
        errorMessage: 'Invalid accept response. Receiver should tap Accept first.',
      };
    }

    if (accept.sessionId.toLowerCase() !== expectedSessionId.toLowerCase()) {
      return {
        status: 'SESSION_MISMATCH',
        receiverAddress: null,
        sessionId: accept.sessionId,
        errorMessage: 'Accept response does not match this tap session.',
      };
    }

    return {
      status: 'SUCCESS',
      receiverAddress: accept.receiverAddress,
      sessionId: accept.sessionId,
    };
  } catch (error: any) {
    if (isUserCancelled(error)) {
      return {status: 'CANCELLED', receiverAddress: null, sessionId: null};
    }
    if (isTimeout(error)) {
      return {
        status: 'TIMEOUT',
        receiverAddress: null,
        sessionId: null,
        errorMessage: 'No accept signal. Hold phones together after receiver taps Accept.',
      };
    }
    if (isDisconnect(error)) {
      return {
        status: 'DISCONNECTED',
        receiverAddress: null,
        sessionId: null,
        errorMessage: 'Tap interrupted while reading accept.',
      };
    }
    return {
      status: 'ERROR',
      receiverAddress: null,
      sessionId: null,
      errorMessage: error?.message || 'Failed to read accept response.',
    };
  } finally {
    NfcManager.cancelTechnologyRequest({delayMsAndroid: 200}).catch(() => {});
  }
}

/**
 * Poll until accept response is received
 */
export async function pollForAcceptResponse(
  expectedSessionId: string,
  timeoutMs = SESSION_TIMEOUT_MS,
): Promise<NfcAcceptResponse> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await readAcceptResponse(expectedSessionId);
    if (response.status === 'SUCCESS') {
      return response;
    }
    if (response.status === 'CANCELLED') {
      return response;
    }
    await sleep(600);
  }

  return {
    status: 'TIMEOUT',
    receiverAddress: null,
    sessionId: null,
    errorMessage: 'Timed out waiting for receiver to accept. Ask them to tap Accept, then tap phones again.',
  };
}

export async function cancelNfcRead(): Promise<void> {
  try {
    await NfcManager.cancelTechnologyRequest({delayMsAndroid: 200});
  } catch {
    // Ignore
  }
}

export function teardownNfc(): void {
  NfcManager.cancelTechnologyRequest({delayMsAndroid: 200}).catch(() => {});
}
