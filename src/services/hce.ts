/**
 * HCE Service — Host Card Emulation session management for One-Way NFC
 *
 * Receiver acts as Card (HCE) broadcasting their address.
 */

import {HCESession, NFCTagType4, NFCTagType4NDEFContentType} from 'react-native-hce';
import {SESSION_TIMEOUT_MS} from '../config/monad';
import {encodeReceiverAddress} from '../utils/apdu';

let _activeSession: HCESession | null = null;
let _sessionTimer: ReturnType<typeof setTimeout> | null = null;

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
 * Start an HCE session broadcasting the receiver's address.
 */
export async function startHceReceiverSession(
  receiverAddress: string,
): Promise<boolean> {
  try {
    await stopHceSession();

    const tag = new NFCTagType4({
      type: NFCTagType4NDEFContentType.Text,
      content: encodeReceiverAddress(receiverAddress),
      writable: false,
    });

    const session = await ensureSession();

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
 * Stop the active HCE session.
 */
export async function stopHceSession(): Promise<void> {
  try {
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
  stopHceSession();
}

export {HCESession};
