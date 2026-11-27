/**
 * NFC Reader Service — Reads HCE-emulated Type 4 tags for One-Way NFC
 *
 * Sender acts as Terminal (Reader) reading the Receiver's address.
 */

import NfcManager from 'react-native-nfc-manager';
import {readType4HceTextWithTimeout} from '../utils/type4Nfc';
import {
  startNativeReaderMode,
  stopNativeReaderMode,
  subscribeNativeTagRead,
  isNativeTapReaderAvailable,
  formatNfcErrorHint,
  type TapNfcErrorEvent,
} from './tapNfcNative';
import {decodeReceiverPayload} from '../utils/apdu';

export type NfcReadStatus =
  | 'SUCCESS'
  | 'DISCONNECTED'
  | 'INVALID_PAYLOAD'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'ERROR';

export interface NfcReadResponse {
  status: NfcReadStatus;
  receiverAddress: string | null;
  sessionNonce?: string;
  requestedAmount?: string;
  requestedToken?: string;
  errorMessage?: string;
}

export interface ReadReceiverOptions {
  onHint?: (hint: string, event: TapNfcErrorEvent) => void;
  timeoutMs?: number;
}

const SCAN_TIMEOUT_MS = 15_000;

let _continuousUnsubscribe: (() => void) | null = null;
let _nativeReaderRunning = false;
let _scanResolver: ((text: string) => void) | null = null;
let _scanTimer: ReturnType<typeof setTimeout> | null = null;
let _lastScanError: TapNfcErrorEvent | null = null;
let _scanHintHandler: ((hint: string, event: TapNfcErrorEvent) => void) | null = null;

export {isNativeTapReaderAvailable} from './tapNfcNative';

function clearScanWaiter() {
  if (_scanTimer) {
    clearTimeout(_scanTimer);
    _scanTimer = null;
  }
  _scanResolver = null;
  _scanHintHandler = null;
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
 * Start continuous native reader mode (Android).
 * This is the ONLY function that should set _nativeReaderRunning = true.
 */
export async function startContinuousHceScan(): Promise<boolean> {
  if (!isNativeTapReaderAvailable()) {
    return false;
  }

  // Always stop first to get a clean state
  await stopContinuousHceScan();

  _lastScanError = null;
  _continuousUnsubscribe = subscribeNativeTagRead(
    text => {
      if (_scanResolver) {
        const resolve = _scanResolver;
        clearScanWaiter();
        resolve(text);
      }
    },
    event => {
      // Recoverable scan error — record and surface hint while keeping reader listening.
      _lastScanError = event;
      if (_scanHintHandler) {
        _scanHintHandler(formatNfcErrorHint(event), event);
      }
    },
  );

  const started = await startNativeReaderMode();
  _nativeReaderRunning = started;
  return started;
}

/**
 * Stop continuous native reader mode.
 * This is the ONLY function that should set _nativeReaderRunning = false.
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
}

/**
 * Wait for next HCE tag read (uses native reader if available)
 */
async function waitForHceNdefText(
  timeoutMs = SCAN_TIMEOUT_MS,
  onHint?: (hint: string, event: TapNfcErrorEvent) => void,
): Promise<string> {
  if (isNativeTapReaderAvailable()) {
    // Always (re)start reader mode to ensure clean state
    const started = await startContinuousHceScan();
    if (!started) {
      throw new Error('Failed to start native NFC reader mode');
    }

    return await new Promise<string>((resolve, reject) => {
      _scanResolver = resolve;
      _scanHintHandler = onHint ?? null;
      _scanTimer = setTimeout(() => {
        const lastErr = _lastScanError;
        clearScanWaiter();
        const err = new Error(
          lastErr ? `NFC scan timeout: ${formatNfcErrorHint(lastErr)}` : 'NFC scan timeout',
        ) as Error & {lastNfcError?: TapNfcErrorEvent};
        if (lastErr) {
          err.lastNfcError = lastErr;
        }
        reject(err);
      }, timeoutMs);
    });
  }

  // Fallback: use react-native-nfc-manager IsoDep reader
  const text = await readType4HceTextWithTimeout(timeoutMs);
  if (!text) {
    throw new Error('NFC scan timeout');
  }
  return text;
}

/**
 * Read the receiver's address from their HCE card
 */
export async function readReceiverAddress(
  options?: ReadReceiverOptions,
): Promise<NfcReadResponse> {
  try {
    const text = await waitForHceNdefText(
      options?.timeoutMs ?? SCAN_TIMEOUT_MS,
      options?.onHint,
    );
    
    const payload = decodeReceiverPayload(text);
    if (!payload) {
      return {
        status: 'INVALID_PAYLOAD',
        receiverAddress: null,
        errorMessage: 'Invalid payload received. The other device must be on the Receive screen.',
      };
    }

    return {
      status: 'SUCCESS',
      receiverAddress: payload.receiverAddress,
      sessionNonce: payload.sessionNonce,
      requestedAmount: payload.amount,
      requestedToken: payload.tokenSymbol,
    };
  } catch (error: any) {
    if (isUserCancelled(error)) {
      return {status: 'CANCELLED', receiverAddress: null};
    }
    if (isTimeout(error)) {
      const lastErr: TapNfcErrorEvent | undefined = error?.lastNfcError;
      return {
        status: 'TIMEOUT',
        receiverAddress: null,
        errorMessage: lastErr
          ? formatNfcErrorHint(lastErr)
          : 'No NFC signal. Hold phones back-to-back at the top for 3 seconds.',
      };
    }
    if (isDisconnect(error)) {
      return {
        status: 'DISCONNECTED',
        receiverAddress: null,
        errorMessage: 'Tap interrupted. Keep phones still and try again.',
      };
    }
    console.error('NFC read error:', error);
    return {
      status: 'ERROR',
      receiverAddress: null,
      errorMessage: error?.message || 'NFC read failed. Retry the tap.',
    };
  }
}

/**
 * Cancel any ongoing NFC read operations.
 * Only touches react-native-nfc-manager if native reader is NOT active
 * (avoids the two libraries fighting over the NFC adapter).
 */
export async function cancelNfcRead(): Promise<void> {
  if (!_nativeReaderRunning) {
    try {
      await NfcManager.cancelTechnologyRequest({delayMsAndroid: 200});
    } catch {
      // Ignore
    }
  }
}

export function teardownNfc(): void {
  stopContinuousHceScan();
  cancelNfcRead();
}
