/**
 * HCE Service — Host Card Emulation session management
 *
 * Manages the sender-side NFC card emulation, setting the binary payment
 * payload that the receiver reads via APDU exchange.
 */

import {HCESession, NFCTagType4, NFCTagType4NDEFContentType} from 'react-native-hce';
import {SESSION_TIMEOUT_MS} from '../config/monad';

let _activeSession: any = null;
let _sessionTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Start an HCE session with the given payment payload
 * The payload should be the binary-encoded PaymentOffer from apdu.ts
 */
export async function startHceSession(payloadBytes: Uint8Array): Promise<boolean> {
  try {
    // Stop any existing session
    await stopHceSession();

    // Convert binary payload to a content string for react-native-hce
    // react-native-hce's NFCTagType4 works with content strings
    const hexPayload = Array.from(payloadBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const tag = new NFCTagType4({
      type: NFCTagType4NDEFContentType.Text,
      content: hexPayload,
      writable: false,
    });

    _activeSession = await HCESession.getInstance();
    _activeSession.setApplication(tag);
    await _activeSession.setEnabled(true);

    // Auto-expire after SESSION_TIMEOUT_MS (120 seconds)
    _sessionTimer = setTimeout(() => {
      stopHceSession();
    }, SESSION_TIMEOUT_MS);

    return true;
  } catch (error) {
    console.error('Failed to start HCE session:', error);
    return false;
  }
}

/**
 * Stop the active HCE session and clear the payload
 */
export async function stopHceSession(): Promise<void> {
  try {
    if (_sessionTimer) {
      clearTimeout(_sessionTimer);
      _sessionTimer = null;
    }

    if (_activeSession) {
      await _activeSession.setEnabled(false);
      _activeSession = null;
    }
  } catch (error) {
    console.error('Failed to stop HCE session:', error);
  }
}

/**
 * Check if an HCE session is currently active
 */
export function isHceActive(): boolean {
  return _activeSession !== null;
}
