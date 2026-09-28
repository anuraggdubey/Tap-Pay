/**
 * Mera Passkey Authentication Service
 *
 * Handles user onboarding via Face ID / Fingerprint using the Mera SDK.
 * This creates a standard EVM account from a passkey — no smart contracts needed.
 *
 * Flow:
 *   1. User taps "Create Account" → register() → Face ID prompt → new wallet
 *   2. User returns later → login() → Face ID prompt → recovers same wallet
 *   3. App uses getAddress() and getSession() for transactions
 *
 * NOTE: This is a NEW file. Does NOT modify wallet.ts or any existing service.
 *       It lives alongside wallet.ts as an alternative authentication method.
 *
 * Mera docs: https://mera.category.xyz
 * Package: @category-labs/mera
 */

import {
  createPasskeyWithPrfOutput,
  getPasskeyPrfOutput,
} from '@category-labs/mera';
import { reactNativeWebAuthnClient } from '@category-labs/mera/react-native-webauthn-client';
import { ethers } from 'ethers';

// ─── Types ────────────────────────────────────────────────────────

export interface MeraAccountResult {
  address: string;
  isNewAccount: boolean;
  error?: string;
}

export type MeraAuthState =
  | {status: 'idle'}
  | {status: 'loading'; action: 'register' | 'login'}
  | {status: 'authenticated'; address: string}
  | {status: 'error'; message: string};

// ─── Constants ────────────────────────────────────────────────────

const MERA_RP_ID = 'web-seven-beta-29.vercel.app';
const MERA_RP_NAME = 'TapPay';

// ─── State ────────────────────────────────────────────────────────

let _meraSession: any = null;
let _meraAddress: string | null = null;
let _meraInitialized = false;

// ─── Core Functions ───────────────────────────────────────────────

export async function register(
  username: string = 'TapPay User',
): Promise<MeraAccountResult> {
  try {
    const result = await createPasskeyWithPrfOutput({
      rp: {
        id: MERA_RP_ID,
        name: MERA_RP_NAME,
      },
      user: {
        name: username,
        displayName: username,
      },
      webAuthnClient: reactNativeWebAuthnClient,
    });

    if (result && result.prfOutput) {
      const privateKeyHex = ethers.hexlify(result.prfOutput);
      const wallet = new ethers.Wallet(privateKeyHex);
      const address = wallet.address;
      _meraAddress = address;
      _meraSession = { privateKey: result.prfOutput, credentialId: result.credentialId, privateKeyHex };
      _meraInitialized = true;

      return {
        address,
        isNewAccount: true,
      };
    }

    return {
      address: '',
      isNewAccount: false,
      error: 'Passkey registration failed — no address returned.',
    };
  } catch (error: any) {
    console.error('[MeraAuth] Registration failed:', error);
    return {
      address: '',
      isNewAccount: false,
      error: parseMeraError(error),
    };
  }
}

export async function login(): Promise<MeraAccountResult> {
  try {
    const result = await getPasskeyPrfOutput({
      rpId: MERA_RP_ID,
      webAuthnClient: reactNativeWebAuthnClient,
    });

    if (result && result.prfOutput) {
      const privateKeyHex = ethers.hexlify(result.prfOutput);
      const wallet = new ethers.Wallet(privateKeyHex);
      const address = wallet.address;
      _meraAddress = address;
      _meraSession = { privateKey: result.prfOutput, credentialId: result.credentialId, privateKeyHex };
      _meraInitialized = true;

      return {
        address,
        isNewAccount: false,
      };
    }

    return {
      address: '',
      isNewAccount: false,
      error: 'Passkey login failed — no address returned.',
    };
  } catch (error: any) {
    console.error('[MeraAuth] Login failed:', error);
    return {
      address: '',
      isNewAccount: false,
      error: parseMeraError(error),
    };
  }
}

export function getAddress(): string | null {
  return _meraAddress;
}

export function getSession(): any {
  return _meraSession;
}

export function isAuthenticated(): boolean {
  return _meraInitialized && _meraAddress !== null;
}

export function logout(): void {
  _meraSession = null;
  _meraAddress = null;
  _meraInitialized = false;
}

export function getSessionPrivateKey(): Uint8Array | null {
  if (!_meraSession) {
    return null;
  }
  return _meraSession.privateKey || _meraSession.secret || null;
}

// ─── Internal Helpers ─────────────────────────────────────────────

function parseMeraError(error: any): string {
  const message = error?.message || error?.toString() || 'Unknown error';

  if (message.includes('NotAllowedError') || message.includes('user cancelled')) {
    return 'Authentication was cancelled. Please try again.';
  }
  if (message.includes('NotSupportedError')) {
    return 'Passkeys are not supported on this device. Android 9+ or iOS 18+ required.';
  }
  if (message.includes('SecurityError') || message.includes('rpId')) {
    return 'Security configuration error. Please contact support.';
  }
  if (message.includes('InvalidStateError')) {
    return 'A passkey already exists for this account. Try logging in instead.';
  }
  if (message.includes('AbortError')) {
    return 'The operation timed out. Please try again.';
  }

  return `Passkey error: ${message}`;
}
