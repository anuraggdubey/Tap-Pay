/**
 * APDU Binary Encoding/Decoding Utilities for One-Way NFC Architecture
 *
 * Receiver broadcasts their address as a hex string via NDEF.
 */

export const RECEIVER_NDEF_PREFIX = 'tappay://tap/';
const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;
const SESSION_NONCE_REGEX = /^[0-9a-fA-F]{16,64}$/;

export interface TapNdefPayload {
  receiverAddress: string;
  sessionNonce?: string;
}

/**
 * Encode a receiver's address (and optional per-tap session nonce) into an NDEF URI.
 */
export function encodeReceiverAddress(
  receiverAddress: string,
  sessionNonce?: string,
): string {
  const addrHex = receiverAddress.startsWith('0x') ? receiverAddress : `0x${receiverAddress}`;
  if (sessionNonce && SESSION_NONCE_REGEX.test(sessionNonce)) {
    return `${RECEIVER_NDEF_PREFIX}${addrHex}?s=${sessionNonce}`;
  }
  return `${RECEIVER_NDEF_PREFIX}${addrHex}`;
}

/**
 * Decode a receiver's address and optional session nonce from an NDEF URI.
 * Backward compatible with bare `tappay://tap/0x...` payloads without query params.
 */
export function decodeReceiverPayload(text: string): TapNdefPayload | null {
  if (!text || !text.startsWith(RECEIVER_NDEF_PREFIX)) {
    return null;
  }

  const rest = text.slice(RECEIVER_NDEF_PREFIX.length);
  const queryIdx = rest.indexOf('?');
  const hex = queryIdx === -1 ? rest : rest.slice(0, queryIdx);
  if (!ADDRESS_REGEX.test(hex)) {
    return null;
  }

  if (queryIdx === -1) {
    return {receiverAddress: hex};
  }

  const queryStr = rest.slice(queryIdx + 1);
  let sessionNonce: string | undefined;
  for (const part of queryStr.split('&')) {
    if (!part) continue;
    const eqIdx = part.indexOf('=');
    const key = eqIdx === -1 ? part : part.slice(0, eqIdx);
    const val = eqIdx === -1 ? '' : part.slice(eqIdx + 1);
    if (key === 's') {
      if (!SESSION_NONCE_REGEX.test(val)) {
        return null;
      }
      sessionNonce = val;
    }
  }

  return sessionNonce ? {receiverAddress: hex, sessionNonce} : {receiverAddress: hex};
}

/**
 * Decode a receiver's address from an NDEF content string.
 */
export function decodeReceiverAddress(text: string): string | null {
  return decodeReceiverPayload(text)?.receiverAddress ?? null;
}
