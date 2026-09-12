/**
 * NFC Reader Service — Receiver-side NFC tag discovery & verification
 *
 * Uses react-native-nfc-manager to discover and read the sender's
 * HCE-emulated card, extracting and cryptographically verifying the binary payment payload.
 */

import NfcManager, {NfcTech, Ndef} from 'react-native-nfc-manager';
import {decodePaymentOffer, verifyPaymentOffer, PaymentOffer} from '../utils/apdu';

export type NfcReadStatus =
  | 'SUCCESS'
  | 'DISCONNECTED'
  | 'INVALID_PAYLOAD'
  | 'SIGNATURE_INVALID'
  | 'CANCELLED'
  | 'ERROR';

export interface NfcReadResponse {
  status: NfcReadStatus;
  offer: PaymentOffer | null;
  errorMessage?: string;
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
 * Start listening for an NFC tag (receiver mode)
 * Reads the sender's HCE payload, decodes binary PaymentOffer, and verifies ECDSA signature
 */
export async function readPaymentOffer(): Promise<NfcReadResponse> {
  try {
    // Request NFC Ndef technology
    await NfcManager.requestTechnology(NfcTech.Ndef);

    const tag = await NfcManager.getTag();

    if (!tag?.ndefMessage || tag.ndefMessage.length === 0) {
      return {
        status: 'INVALID_PAYLOAD',
        offer: null,
        errorMessage: 'Invalid payment data received. Ask sender to retry.',
      };
    }

    // Extract text payload from NDEF message
    const record = tag.ndefMessage[0];
    const text = Ndef.text.decodePayload(new Uint8Array(record.payload));

    if (!text) {
      return {
        status: 'INVALID_PAYLOAD',
        offer: null,
        errorMessage: 'Empty payload received from card.',
      };
    }

    // Decode hex back to binary bytes
    const bytes = new Uint8Array(
      text.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || [],
    );

    // Decode binary payload to PaymentOffer
    const offer = decodePaymentOffer(bytes);
    if (!offer) {
      return {
        status: 'INVALID_PAYLOAD',
        offer: null,
        errorMessage: 'Invalid payment structure. Ensure sender app is updated.',
      };
    }

    // Cryptographic signature verification
    const isValidSignature = verifyPaymentOffer(offer);
    if (!isValidSignature) {
      return {
        status: 'SIGNATURE_INVALID',
        offer: null,
        errorMessage: 'Could not verify sender cryptographic signature. Payment rejected for safety.',
      };
    }

    return {
      status: 'SUCCESS',
      offer,
    };
  } catch (error: any) {
    const errorStr = error?.message || error?.toString() || '';
    if (errorStr.includes('cancelled') || errorStr.includes('user cancelled')) {
      return {status: 'CANCELLED', offer: null};
    }
    if (errorStr.includes('Tag was lost') || errorStr.includes('disconnect') || errorStr.includes('transceive fail')) {
      return {
        status: 'DISCONNECTED',
        offer: null,
        errorMessage: 'Tap interrupted. Move phones closer and try again.',
      };
    }
    console.error('NFC read error:', error);
    return {
      status: 'ERROR',
      offer: null,
      errorMessage: errorStr || 'NFC read failure. Please tap again.',
    };
  } finally {
    // Clean up NFC session
    NfcManager.cancelTechnologyRequest().catch(() => {});
  }
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
