/**
 * NFC Reader Service — Receiver/sender-side NFC tag discovery
 *
 * Reads payment offers and accept responses from HCE-emulated Type 4 tags.
 */

import NfcManager, {NfcTech, Ndef} from 'react-native-nfc-manager';
import {SESSION_TIMEOUT_MS} from '../config/monad';
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

const READ_TIMEOUT_MS = 15000;

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
    errorStr.includes('transceive fail')
  );
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

/**
 * Check if NFC is supported on this device
 */
export async function isNfcSupported(): Promise<boolean> {
  try {
    return await NfcManager.isSupported();
  } catch {
    return false;
  }
}

/**
 * Check if NFC is currently enabled in device settings
 */
export async function isNfcEnabled(): Promise<boolean> {
  try {
    return await NfcManager.isEnabled();
  } catch {
    return false;
  }
}

/**
 * Open the device's NFC settings (for when NFC is disabled)
 */
export async function openNfcSettings(): Promise<void> {
  try {
    await NfcManager.goToNfcSetting();
  } catch {
    console.error('Could not open NFC settings');
  }
}

/**
 * Extract plain text from the first NDEF record
 */
function decodeNdefText(tag: {ndefMessage?: Array<{payload: number[] | Uint8Array}>}): string | null {
  const record = tag?.ndefMessage?.[0];
  if (!record?.payload) {
    return null;
  }

  try {
    const payload = new Uint8Array(record.payload as number[]);
    return Ndef.text.decodePayload(payload);
  } catch {
    return null;
  }
}

/**
 * Request NFC technology with NDEF fallback to IsoDep
 */
async function requestNfcTechnology(): Promise<void> {
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef, {
      alertMessage: 'Hold phones together',
    });
  } catch {
    await NfcManager.requestTechnology(NfcTech.IsoDep, {
      alertMessage: 'Hold phones together',
    });
  }
}

/**
 * Read NDEF payload from an active NFC session
 */
async function readNdefText(): Promise<string | null> {
  await requestNfcTechnology();
  const tag = await NfcManager.getTag();
  return decodeNdefText(tag || {});
}

/**
 * Start listening for an NFC tag and read a payment offer
 */
export async function readPaymentOffer(): Promise<NfcReadResponse> {
  try {
    const text = await readNdefText();

    if (!text) {
      return {
        status: 'INVALID_PAYLOAD',
        offer: null,
        errorMessage: 'Invalid payment data received. Ask sender to retry.',
      };
    }

    const bytes = decodeOfferNdefContent(text);
    if (!bytes) {
      return {
        status: 'INVALID_PAYLOAD',
        offer: null,
        errorMessage: 'Empty or invalid payload received from sender.',
      };
    }

    const offer = decodePaymentOffer(bytes);
    if (!offer) {
      return {
        status: 'INVALID_PAYLOAD',
        offer: null,
        errorMessage: 'Invalid payment structure. Ensure sender app is updated.',
      };
    }

    const isValidSignature = verifyPaymentOffer(offer);
    if (!isValidSignature) {
      return {
        status: 'SIGNATURE_INVALID',
        offer: null,
        errorMessage:
          'Could not verify sender cryptographic signature. Payment rejected for safety.',
      };
    }

    return {
      status: 'SUCCESS',
      offer,
    };
  } catch (error: any) {
    if (isUserCancelled(error)) {
      return {status: 'CANCELLED', offer: null};
    }
    if (isDisconnect(error)) {
      return {
        status: 'DISCONNECTED',
        offer: null,
        errorMessage: 'Tap interrupted. Move phones closer and hold still.',
      };
    }
    console.error('NFC read error:', error);
    return {
      status: 'ERROR',
      offer: null,
      errorMessage: error?.message || 'NFC read failure. Please tap again.',
    };
  } finally {
    NfcManager.cancelTechnologyRequest().catch(() => {});
  }
}

/**
 * Read receiver accept response from NFC (sender side, after offer was read)
 */
export async function readAcceptResponse(
  expectedSessionId: string,
): Promise<NfcAcceptResponse> {
  try {
    const text = await readNdefText();

    if (!text) {
      return {
        status: 'INVALID_PAYLOAD',
        receiverAddress: null,
        sessionId: null,
        errorMessage: 'No accept response received. Ask receiver to accept and tap again.',
      };
    }

    const accept = decodeAcceptNdefContent(text);
    if (!accept) {
      return {
        status: 'INVALID_PAYLOAD',
        receiverAddress: null,
        sessionId: null,
        errorMessage: 'Invalid accept response from receiver.',
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
    if (isDisconnect(error)) {
      return {
        status: 'DISCONNECTED',
        receiverAddress: null,
        sessionId: null,
        errorMessage: 'Tap interrupted while reading accept. Hold phones together.',
      };
    }
    return {
      status: 'ERROR',
      receiverAddress: null,
      sessionId: null,
      errorMessage: error?.message || 'Failed to read accept response.',
    };
  } finally {
    NfcManager.cancelTechnologyRequest().catch(() => {});
  }
}

/**
 * Poll NFC reader until accept response is received or timeout expires
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
    await sleep(800);
  }

  return {
    status: 'ERROR',
    receiverAddress: null,
    sessionId: null,
    errorMessage: 'Timed out waiting for receiver to accept the payment.',
  };
}

/**
 * Cancel any ongoing NFC read operation
 */
export async function cancelNfcRead(): Promise<void> {
  try {
    await NfcManager.cancelTechnologyRequest();
  } catch {
    // Ignore — may not have an active request
  }
}

/**
 * Clean up NFC manager on app shutdown
 */
export function teardownNfc(): void {
  NfcManager.cancelTechnologyRequest().catch(() => {});
}
