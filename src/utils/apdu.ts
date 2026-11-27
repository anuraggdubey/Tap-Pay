/**
 * APDU Binary Encoding/Decoding Utilities for One-Way NFC Architecture
 *
 * Receiver broadcasts their address (with optional session nonce and payment request) as a URI via NDEF.
 */

import {ethers} from 'ethers';
import {SUPPORTED_TOKENS} from '../config/tokens';

export const RECEIVER_NDEF_PREFIX = 'tappay://tap/';
const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;
const SESSION_NONCE_REGEX = /^[0-9a-fA-F]{16,64}$/;
const DECIMAL_AMOUNT_REGEX = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

export interface TapPaymentRequest {
  amount: string;
  tokenSymbol: string;
}

export interface TapEncodeOptions {
  sessionNonce?: string;
  paymentRequest?: TapPaymentRequest;
}

export interface TapNdefPayload {
  receiverAddress: string;
  sessionNonce?: string;
  amount?: string;
  tokenSymbol?: string;
}

/**
 * Strictly validate an optional payment request (amount + supported token).
 * Returns normalized {amount, tokenSymbol, amountWei} or null if invalid.
 */
export function validateTapPaymentRequest(
  amount: string,
  tokenSymbol: string,
): {amount: string; tokenSymbol: string; amountWei: bigint} | null {
  const trimmedAmount = amount.trim();
  const normalizedToken = tokenSymbol.trim().toUpperCase();
  const token = SUPPORTED_TOKENS[normalizedToken];
  if (!token) {
    return null;
  }
  if (!DECIMAL_AMOUNT_REGEX.test(trimmedAmount)) {
    return null;
  }
  const dotIdx = trimmedAmount.indexOf('.');
  if (dotIdx !== -1 && trimmedAmount.length - dotIdx - 1 > token.decimals) {
    return null;
  }
  try {
    const amountWei = ethers.parseUnits(trimmedAmount, token.decimals);
    if (amountWei <= 0n) {
      return null;
    }
    return {amount: trimmedAmount, tokenSymbol: token.symbol, amountWei};
  } catch {
    return null;
  }
}

function isTapPaymentRequest(
  value: TapPaymentRequest | TapEncodeOptions,
): value is TapPaymentRequest {
  return 'amount' in value && 'tokenSymbol' in value;
}

/**
 * Encode a receiver's address (and optional per-tap session nonce / merchant payment request)
 * into an NDEF URI.
 */
export function encodeReceiverAddress(
  receiverAddress: string,
  options?: string | TapPaymentRequest | TapEncodeOptions,
): string {
  const addrHex = receiverAddress.startsWith('0x') ? receiverAddress : `0x${receiverAddress}`;
  let sessionNonce: string | undefined;
  let paymentRequest: TapPaymentRequest | undefined;

  if (typeof options === 'string') {
    sessionNonce = options;
  } else if (options) {
    if (isTapPaymentRequest(options)) {
      paymentRequest = options;
    } else {
      sessionNonce = options.sessionNonce;
      paymentRequest = options.paymentRequest;
    }
  }

  const params: string[] = [];
  if (sessionNonce && SESSION_NONCE_REGEX.test(sessionNonce)) {
    params.push(`s=${sessionNonce}`);
  }
  if (paymentRequest) {
    const validated = validateTapPaymentRequest(
      paymentRequest.amount,
      paymentRequest.tokenSymbol,
    );
    if (!validated) {
      throw new Error('Invalid payment request amount or token.');
    }
    params.push(`amt=${validated.amount}`, `tok=${validated.tokenSymbol}`);
  }

  if (params.length === 0) {
    return `${RECEIVER_NDEF_PREFIX}${addrHex}`;
  }
  return `${RECEIVER_NDEF_PREFIX}${addrHex}?${params.join('&')}`;
}

/**
 * Decode a receiver's address, optional session nonce, and optional payment request from an NDEF URI.
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
  let amt: string | undefined;
  let tok: string | undefined;
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
    } else if (key === 'amt') {
      amt = val;
    } else if (key === 'tok') {
      tok = val;
    }
  }

  const payload: TapNdefPayload = {receiverAddress: hex};
  if (sessionNonce) {
    payload.sessionNonce = sessionNonce;
  }
  if (amt !== undefined || tok !== undefined) {
    if (amt === undefined || tok === undefined) {
      return null;
    }
    const validated = validateTapPaymentRequest(amt, tok);
    if (!validated) {
      return null;
    }
    payload.amount = validated.amount;
    payload.tokenSymbol = validated.tokenSymbol;
  }

  return payload;
}

/**
 * Decode a receiver's address from an NDEF content string.
 */
export function decodeReceiverAddress(text: string): string | null {
  return decodeReceiverPayload(text)?.receiverAddress ?? null;
}
