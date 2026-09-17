/**
 * NFC Reader Service — Reads HCE-emulated Type 4 tags
 *
 * Android: uses native TapNfcReaderModule (enableReaderMode) for phone-to-phone.
 * Fallback: IsoDep APDU reader via react-native-nfc-manager.
 */

import NfcManager from 'react-native-nfc-manager';
import {SESSION_TIMEOUT_MS} from '../config/monad';
import {readType4HceTextWithTimeout} from '../utils/type4Nfc';
import {
  startNativeReaderMode,
  stopNativeReaderMode,
  subscribeNativeTagRead,
  isNativeTapReaderAvailable,
  prepareSenderNfc,
} from './tapNfcNative';
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

const SCAN_TIMEOUT_MS = 15_000;

let _continuousUnsubscribe: (() => void) | null = null;
let _nativeReaderRunning = false;
let _scanResolver: ((text: string) => void) | null = null;
let _scanRejecter: ((error: Error) => void) | null = null;
let _scanTimer: ReturnType<typeof setTimeout> | null = null;

export {isNativeTapReaderAvailable} from './tapNfcNative';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function clearScanWaiter() {
  if (_scanTimer) {
    clearTimeout(_scanTimer);
    _scanTimer = null;
  }
  _scanResolver = null;
  _scanRejecter = null;
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
 * Prepare sender phone — disable reader mode so HCE can broadcast
 */
export async function prepareSenderForHce(): Promise<void> {
  await prepareSenderNfc();
  await cancelNfcRead();
}

/**
 * Start continuous native reader mode (Android) — call once on Receive screen
 */
export async function startContinuousHceScan(): Promise<boolean> {
  if (!isNativeTapReaderAvailable()) {
    return false;
  }

  if (_nativeReaderRunning) {
    return true;
  }

  _continuousUnsubscribe = subscribeNativeTagRead(
    text => {
      if (_scanResolver) {
        const resolve = _scanResolver;
        clearScanWaiter();
        resolve(text);
      }
    },
    () => {
      // Non-fatal scan errors — keep listening
    },
  );

  const started = await startNativeReaderMode();
  _nativeReaderRunning = started;
  return started;
}

/**
 * Stop continuous native reader mode
 */
export async function stopContinuousHceScan(): Promise<void> {
  clearScanWaiter();
  if (_continuousUnsubscribe) {
    _continuousUnsubscribe();
    _continuousUnsubscribe = null;
  }
  if (_nativeReaderRunning) {
    await stopNativeReaderMode();
    _nativeReaderRunning = false;
  }
  await cancelNfcRead();
}

/**
 * Wait for next HCE tag read (uses native reader if available)
 */
async function waitForHceNdefText(timeoutMs = SCAN_TIMEOUT_MS): Promise<string> {
  if (isNativeTapReaderAvailable()) {
    if (!_nativeReaderRunning) {
      const started = await startContinuousHceScan();
      if (!started) {
        throw new Error('Failed to start native NFC reader mode');
      }
    }

    return await new Promise<string>((resolve, reject) => {
      _scanResolver = resolve;
      _scanRejecter = reject;
      _scanTimer = setTimeout(() => {
        clearScanWaiter();
        reject(new Error('NFC scan timeout'));
      }, timeoutMs);
    });
  }

  const text = await readType4HceTextWithTimeout(timeoutMs);
  if (!text) {
    throw new Error('NFC scan timeout');
  }
  return text;
}

function parsePaymentOfferFromText(text: string): NfcReadResponse {
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
}

/**
 * Read a payment offer from sender's HCE card
 */
export async function readPaymentOffer(): Promise<NfcReadResponse> {
  try {
    const text = await waitForHceNdefText();
    return parsePaymentOfferFromText(text);
  } catch (error: any) {
    if (isUserCancelled(error)) {
      return {status: 'CANCELLED', offer: null};
    }
    if (isTimeout(error)) {
      return {
        status: 'TIMEOUT',
        offer: null,
        errorMessage: 'No NFC signal. Hold phones back-to-back at the top for 3 seconds.',
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
  }
}

/**
 * Read receiver accept response from HCE card (sender side)
 */
export async function readAcceptResponse(
  expectedSessionId: string,
): Promise<NfcAcceptResponse> {
  try {
    const text = await waitForHceNdefText();

    if (!text) {
      return {
        status: 'INVALID_PAYLOAD',
        receiverAddress: null,
        sessionId: null,
        errorMessage: 'No accept signal. Receiver must tap Accept first.',
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
    return {
      status: 'ERROR',
      receiverAddress: null,
      sessionId: null,
      errorMessage: error?.message || 'Failed to read accept response.',
    };
  }
}

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
    await sleep(500);
  }

  return {
    status: 'TIMEOUT',
    receiverAddress: null,
    sessionId: null,
    errorMessage:
      'Timed out waiting for receiver. They must tap Accept, then hold phones together again.',
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
  stopContinuousHceScan();
  NfcManager.cancelTechnologyRequest({delayMsAndroid: 200}).catch(() => {});
}
