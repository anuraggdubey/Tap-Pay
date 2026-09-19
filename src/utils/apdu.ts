/**
 * APDU Binary Encoding/Decoding Utilities for One-Way NFC Architecture
 *
 * Receiver broadcasts their address as a hex string via NDEF.
 */

export const RECEIVER_NDEF_PREFIX = 'RECV';

/**
 * Encode a receiver's address into an NDEF content string (hex).
 */
export function encodeReceiverAddress(receiverAddress: string): string {
  const addrHex = receiverAddress.replace('0x', '');
  return `${RECEIVER_NDEF_PREFIX}${addrHex}`;
}

/**
 * Decode a receiver's address from an NDEF content string.
 */
export function decodeReceiverAddress(text: string): string | null {
  if (!text || !text.startsWith(RECEIVER_NDEF_PREFIX)) {
    return null;
  }

  const hex = text.slice(RECEIVER_NDEF_PREFIX.length);
  if (hex.length !== 40) {
    return null; // A valid Ethereum address is 40 hex characters (20 bytes)
  }

  return `0x${hex}`;
}
