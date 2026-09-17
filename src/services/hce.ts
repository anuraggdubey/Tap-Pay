/**
 * HCE Service — Host Card Emulation session management
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
    stopHceSession(true);
  }, SESSION_TIMEOUT_MS);
}

async function ensureSession(): Promise<HCESession> {
  if (!_activeSession) {
    _activeSession = await HCESession.getInstance();
  }
  return _activeSession;
}

/**
 * Start an HCE session broadcasting a signed payment offer.
 * Pass onRead to detect when another phone reads this card.
 */
export async function startHceSession(
  payloadBytes: Uint8Array,
  onRead?: () => void,
): Promise<boolean> {
  try {
    await stopHceSession(false);

    const tag = new NFCTagType4({
      type: NFCTagType4NDEFContentType.Text,
      content: encodeOfferNdefContent(payloadBytes),
      writable: false,
    });

    const session = await ensureSession();

    if (onRead) {
      const cancel = session.on(HCESession.Events.HCE_STATE_READ, onRead);
      _listenerCancels.push(cancel);
    }

    await session.setApplication(tag);
    await session.setEnabled(true);

    // Brief pause for Android to register HCE service
    await new Promise(resolve => setTimeout(resolve, 300));

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
  onRead?: () => void,
): Promise<boolean> {
  try {
    await stopHceSession(false);

    const tag = new NFCTagType4({
      type: NFCTagType4NDEFContentType.Text,
      content: encodeAcceptNdefContent(receiverAddress, sessionId),
      writable: false,
    });

    const session = await ensureSession();

    if (onRead) {
      const cancel = session.on(HCESession.Events.HCE_STATE_READ, onRead);
      _listenerCancels.push(cancel);
    }

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
 * Listen for a specific HCE lifecycle event
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
 * Wait until the emulated tag has been read by another device.
 * Register this BEFORE enabling HCE to avoid missing fast reads.
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
 * Stop the active HCE session.
 * @param clearEvents When true, removes event listeners (use on cancel/unmount).
 */
export async function stopHceSession(clearEvents = false): Promise<void> {
  try {
    if (clearEvents) {
      clearListeners();
    }

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

export function isHceActive(): boolean {
  return _activeSession?.enabled ?? false;
}

export function teardownHce(): void {
  stopHceSession(true);
}

export {HCESession};
