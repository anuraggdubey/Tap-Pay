/**
 * APDU Binary Encoding/Decoding Utilities for One-Way NFC Architecture
 *
 * Receiver broadcasts their address as a hex string via NDEF.
 */

export const RECEIVER_NDEF_PREFIX = 'tappay://tap/';

/**
 * Encode a receiver's address into an NDEF content string (hex).
 */
export function encodeReceiverAddress(receiverAddress: string): string {
  const addrHex = receiverAddress.startsWith('0x') ? receiverAddress : `0x${receiverAddress}`;
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
  if (!/^0x[0-9a-fA-F]{40}$/.test(hex)) {
    return null;
  }
  return hex;
}
