/**
 * APDU Binary Encoding/Decoding Utilities
 *
 * Android HostApduService has a hard ~250-byte limit per APDU response.
 * All NFC payloads use binary encoding (NOT JSON) to stay within limits.
 *
 * Payment Offer Payload (134 bytes):
 * ┌──────────────┬───────────────┬──────────────┬───────────┬────────────┐
 * │ version (1B) │ amount (32B)  │ sender addr  │ sessionId │ signature  │
 * │   0x01       │ uint256 wei   │ (20 bytes)   │ (16B UUID)│ (65 bytes) │
 * └──────────────┴───────────────┴──────────────┴───────────┴────────────┘
 */

import {APDU_VERSION} from '../config/monad';

export const PAYLOAD_SIZE = 134; // 1 + 32 + 20 + 16 + 65

export interface PaymentOffer {
  version: number;
  amountWei: bigint;
  senderAddress: string; // 0x-prefixed, 42 chars
  sessionId: string; // UUID string
  signature: string; // 0x-prefixed hex, 130 chars (65 bytes)
}

/**
 * Encode a PaymentOffer into a binary Uint8Array (134 bytes)
 */
export function encodePaymentOffer(offer: PaymentOffer): Uint8Array {
  const buffer = new Uint8Array(PAYLOAD_SIZE);
  let offset = 0;

  // Version (1 byte)
  buffer[offset] = offer.version;
  offset += 1;

  // Amount as uint256 big-endian (32 bytes)
  const amountHex = offer.amountWei.toString(16).padStart(64, '0');
  for (let i = 0; i < 32; i++) {
    buffer[offset + i] = parseInt(amountHex.substring(i * 2, i * 2 + 2), 16);
  }
  offset += 32;

  // Sender address (20 bytes, strip 0x prefix)
  const addrHex = offer.senderAddress.replace('0x', '');
  for (let i = 0; i < 20; i++) {
    buffer[offset + i] = parseInt(addrHex.substring(i * 2, i * 2 + 2), 16);
  }
  offset += 20;

  // Session ID as UUID bytes (16 bytes, strip dashes)
  const uuidHex = offer.sessionId.replace(/-/g, '');
  for (let i = 0; i < 16; i++) {
    buffer[offset + i] = parseInt(uuidHex.substring(i * 2, i * 2 + 2), 16);
  }
  offset += 16;

  // Signature (65 bytes, strip 0x prefix)
  const sigHex = offer.signature.replace('0x', '');
  for (let i = 0; i < 65; i++) {
    buffer[offset + i] = parseInt(sigHex.substring(i * 2, i * 2 + 2), 16);
  }

  return buffer;
}

/**
 * Decode a binary Uint8Array (134 bytes) into a PaymentOffer
 */
export function decodePaymentOffer(data: Uint8Array): PaymentOffer | null {
  if (data.length < PAYLOAD_SIZE) {
    return null;
  }

  let offset = 0;

  // Version
  const version = data[offset];
  if (version !== APDU_VERSION) {
    return null;
  }
  offset += 1;

  // Amount (32 bytes big-endian → bigint)
  let amountHex = '0x';
  for (let i = 0; i < 32; i++) {
    amountHex += data[offset + i].toString(16).padStart(2, '0');
  }
  const amountWei = BigInt(amountHex);
  offset += 32;

  // Sender address (20 bytes → 0x-prefixed hex)
  let addrHex = '0x';
  for (let i = 0; i < 20; i++) {
    addrHex += data[offset + i].toString(16).padStart(2, '0');
  }
  const senderAddress = addrHex;
  offset += 20;

  // Session ID (16 bytes → UUID string with dashes)
  let uuidHex = '';
  for (let i = 0; i < 16; i++) {
    uuidHex += data[offset + i].toString(16).padStart(2, '0');
  }
  const sessionId = [
    uuidHex.substring(0, 8),
    uuidHex.substring(8, 12),
    uuidHex.substring(12, 16),
    uuidHex.substring(16, 20),
    uuidHex.substring(20, 32),
  ].join('-');
  offset += 16;

  // Signature (65 bytes → 0x-prefixed hex)
  let sigHex = '0x';
  for (let i = 0; i < 65; i++) {
    sigHex += data[offset + i].toString(16).padStart(2, '0');
  }
  const signature = sigHex;

  return {version, amountWei, senderAddress, sessionId, signature};
}

/**
 * Encode a receiver's accept response (20 bytes — just their address)
 */
export function encodeAcceptResponse(receiverAddress: string): Uint8Array {
  const buffer = new Uint8Array(20);
  const addrHex = receiverAddress.replace('0x', '');
  for (let i = 0; i < 20; i++) {
    buffer[i] = parseInt(addrHex.substring(i * 2, i * 2 + 2), 16);
  }
  return buffer;
}

/**
 * Decode a receiver's accept response (20 bytes → 0x-prefixed address)
 */
export function decodeAcceptResponse(data: Uint8Array): string | null {
  if (data.length < 20) {
    return null;
  }
  let addrHex = '0x';
  for (let i = 0; i < 20; i++) {
    addrHex += data[i].toString(16).padStart(2, '0');
  }
  return addrHex;
}

// APDU Status Words
export const SW_SUCCESS = new Uint8Array([0x90, 0x00]);
export const SW_AID_NOT_FOUND = new Uint8Array([0x6a, 0x82]);
export const SW_NO_SESSION = new Uint8Array([0x69, 0x85]);
export const SW_SESSION_EXPIRED = new Uint8Array([0x69, 0x84]);

// Custom APDU command identifiers
export const CMD_GET_PAYMENT_OFFER = {cla: 0x80, ins: 0x01};
export const CMD_SEND_ACCEPT = {cla: 0x80, ins: 0x02};
export const CMD_SEND_REJECT = {cla: 0x80, ins: 0x03};
