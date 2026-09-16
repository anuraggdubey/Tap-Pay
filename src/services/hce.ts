/**
 * HCE Service — Host Card Emulation session management
 *
 * Manages sender/receiver NFC card emulation with event listeners for
 * tap detection (HCE_STATE_READ) and accept-response broadcasting.
 */

import {HCESession, NFCTagType4, NFCTagType4NDEFContentType} from 'react-native-hce';
import {SESSION_TIMEOUT_MS} from '../config/monad';
import {
  encodeAcceptNdefContent,
  encodeOfferNdefContent,
} from '../utils/apdu';

let _activeSession: HCESession | null = null;
let _sessionTimer: ReturnType<typeof setTimeout> | null = null;
const _listenerCancels: Array<() => void> = [];

function clearListeners(): void {
  _listenerCancels.forEach(cancel => cancel());
  _listenerCancels.length = 0;
}

function scheduleExpiry(): void {
  if (_sessionTimer) {
    clearTimeout(_sessionTimer);
  }
  _sessionTimer = setTimeout(() => {
    stopHceSession();
  }, SESSION_TIMEOUT_MS);
}

async function ensureSession(): Promise<HCESession> {
  if (!_activeSession) {
    _activeSession = await HCESession.getInstance();
  }
  return _activeSession;
}

/**
 * Start an HCE session broadcasting a signed payment offer
 */
export async function startHceSession(payloadBytes: Uint8Array): Promise<boolean> {
  try {
    await stopHceSession();

    const tag = new NFCTagType4({
      type: NFCTagType4NDEFContentType.Text,
      content: encodeOfferNdefContent(payloadBytes),
      writable: false,
    });

    const session = await ensureSession();
    await session.setApplication(tag);
    await session.setEnabled(true);
    scheduleExpiry();

    return true;
  } catch (error) {
    console.error('Failed to start HCE session:', error);
    return false;
  }
}

/**
 * Start an HCE session broadcasting the receiver's accept response
 */
export async function startHceAcceptSession(
  receiverAddress: string,
  sessionId: string,
): Promise<boolean> {
  try {
    await stopHceSession();

    const tag = new NFCTagType4({
      type: NFCTagType4NDEFContentType.Text,
      content: encodeAcceptNdefContent(receiverAddress, sessionId),
      writable: false,
    });

    const session = await ensureSession();
    await session.setApplication(tag);
    await session.setEnabled(true);
    scheduleExpiry();

    return true;
  } catch (error) {
    console.error('Failed to start accept HCE session:', error);
    return false;
  }
}

/**
 * Listen for a specific HCE lifecycle event (e.g. tag read by NFC reader)
 */
export async function onHceEvent(
  event: string,
  listener: () => void,
): Promise<() => void> {
  const session = await ensureSession();
  const cancel = session.on(event, listener);
  _listenerCancels.push(cancel);
  return cancel;
}

/**
 * Wait until the emulated tag has been read by another device
 */
export function waitForHceRead(timeoutMs = SESSION_TIMEOUT_MS): Promise<boolean> {
  return new Promise(async resolve => {
    let settled = false;
    let cancelListener: (() => void) | null = null;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        cancelListener?.();
        resolve(false);
      }
    }, timeoutMs);

    try {
      cancelListener = await onHceEvent(HCESession.Events.HCE_STATE_READ, () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          cancelListener?.();
          resolve(true);
        }
      });
    } catch {
      clearTimeout(timer);
      resolve(false);
    }
  });
}

/**
 * Stop the active HCE session and clear listeners
 */
export async function stopHceSession(): Promise<void> {
  try {
    clearListeners();

    if (_sessionTimer) {
      clearTimeout(_sessionTimer);
      _sessionTimer = null;
    }

    if (_activeSession) {
      await _activeSession.setEnabled(false);
    }
  } catch (error) {
    console.error('Failed to stop HCE session:', error);
  }
}

/**
 * Check if an HCE session is currently active
 */
export function isHceActive(): boolean {
  return _activeSession?.enabled ?? false;
}

export {HCESession};
