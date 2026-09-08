/**
 * NFC Reader Service — Receiver-side NFC tag discovery
 *
 * Uses react-native-nfc-manager to discover and read the sender's
 * HCE-emulated card, extracting the binary payment payload.
 */

import NfcManager, {NfcTech, Ndef} from 'react-native-nfc-manager';
import {decodePaymentOffer, PaymentOffer} from '../utils/apdu';

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
 * Check if NFC is supported and enabled on this device
 */
export async function isNfcSupported(): Promise<boolean> {
  try {
    const supported = await NfcManager.isSupported();
    return supported;
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
 * Reads the sender's HCE payload and decodes the binary PaymentOffer
 *
 * @returns The decoded PaymentOffer, or null if read failed
 */
export async function readPaymentOffer(): Promise<PaymentOffer | null> {
  try {
    // Request NFC Ndef technology
    await NfcManager.requestTechnology(NfcTech.Ndef);

    const tag = await NfcManager.getTag();

    if (!tag?.ndefMessage || tag.ndefMessage.length === 0) {
      return null;
    }

    // Extract the text payload from the NDEF message
    const record = tag.ndefMessage[0];
    const text = Ndef.text.decodePayload(new Uint8Array(record.payload));

    if (!text) {
      return null;
    }

    // The HCE service stores the payload as hex string
    // Decode hex back to bytes
    const bytes = new Uint8Array(
      text.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || [],
    );

    // Decode binary payload to PaymentOffer
    return decodePaymentOffer(bytes);
  } catch (error) {
    console.error('NFC read error:', error);
    return null;
  } finally {
    // Always clean up the NFC session
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
