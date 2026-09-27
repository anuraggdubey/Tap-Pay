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

// ─── Types ────────────────────────────────────────────────────────

/**
 * Result of a Mera passkey operation.
 * Contains the derived EVM address and session info.
 */
export interface MeraAccountResult {
  /** The EVM address derived from the passkey (0x...) */
  address: string;
  /** Whether this is a new registration or an existing login */
  isNewAccount: boolean;
  /** Error message if the operation failed */
  error?: string;
}

/**
 * Current state of the Mera authentication.
 */
export type MeraAuthState =
  | {status: 'idle'}
  | {status: 'loading'; action: 'register' | 'login'}
  | {status: 'authenticated'; address: string}
  | {status: 'error'; message: string};

// ─── Constants ────────────────────────────────────────────────────

/**
 * Relying Party ID for passkey association.
 * Must match a domain you control for production.
 * For testnet/hackathon, we use the app's package name domain.
 */
const MERA_RP_ID = 'tappay.app';

/**
 * Display name shown during the passkey ceremony.
 */
const MERA_RP_NAME = 'TapPay';

// ─── State ────────────────────────────────────────────────────────

let _meraSession: any = null;
let _meraAddress: string | null = null;
let _meraInitialized = false;

// ─── Core Functions ───────────────────────────────────────────────

/**
 * Register a new account using a passkey (Face ID / Fingerprint).
 *
 * This triggers the device's biometric prompt, creates a new passkey,
 * and derives a standard EVM account from it.
 *
 * The account is automatically backed up via the device's passkey sync
 * (iCloud Keychain on iOS, Google Password Manager on Android).
 *
 * @param username - Optional display name for the passkey credential
 * @returns MeraAccountResult with the derived address
 */
export async function register(
  username: string = 'TapPay User',
): Promise<MeraAccountResult> {
  try {
    // Dynamic import to avoid crashes if the package isn't installed yet
    const mera = await importMera();
    if (!mera) {
      return {
        address: '',
        isNewAccount: false,
        error: 'Mera SDK not available. Please install @category-labs/mera.',
      };
    }

    // Create a new passkey and derive an EVM account from it
    const result = await mera.create({
      rp: {
        id: MERA_RP_ID,
        name: MERA_RP_NAME,
      },
      user: {
        name: username,
        displayName: username,
      },
    });

    if (result && result.address) {
      _meraAddress = result.address;
      _meraSession = result.session || null;
      _meraInitialized = true;

      return {
        address: result.address,
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

/**
 * Login with an existing passkey (Face ID / Fingerprint).
 *
 * This recovers the same EVM account that was created during registration.
 * Works on any device that has access to the synced passkey.
 *
 * @returns MeraAccountResult with the recovered address
 */
export async function login(): Promise<MeraAccountResult> {
  try {
    const mera = await importMera();
    if (!mera) {
      return {
        address: '',
        isNewAccount: false,
        error: 'Mera SDK not available.',
      };
    }

    // Authenticate with an existing passkey
    const result = await mera.get({
      rp: {
        id: MERA_RP_ID,
      },
    });

    if (result && result.address) {
      _meraAddress = result.address;
      _meraSession = result.session || null;
      _meraInitialized = true;

      return {
        address: result.address,
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

/**
 * Get the currently authenticated address.
 * Returns null if not authenticated.
 */
export function getAddress(): string | null {
  return _meraAddress;
}

/**
 * Get the current signing session.
 * Returns null if not authenticated or session expired.
 */
export function getSession(): any {
  return _meraSession;
}

/**
 * Check if the user is currently authenticated via Mera passkey.
 */
export function isAuthenticated(): boolean {
  return _meraInitialized && _meraAddress !== null;
}

/**
 * Clear the current Mera session (logout).
 * Does NOT delete the passkey from the device — user can still login again.
 */
export function logout(): void {
  _meraSession = null;
  _meraAddress = null;
  _meraInitialized = false;
}

/**
 * Get the private key bytes from the current session for ethers.js signing.
 * This is used by meraSigner.ts to create an ethers.js-compatible signer.
 *
 * IMPORTANT: These bytes are held in memory only for the session duration.
 * They are derived from the passkey and are NOT stored anywhere on disk.
 */
export function getSessionPrivateKey(): Uint8Array | null {
  if (!_meraSession) {
    return null;
  }
  // Mera derives 32 bytes from the passkey PRF extension
  // These bytes serve as the private key for the EVM account
  return _meraSession.privateKey || _meraSession.secret || null;
}

// ─── Internal Helpers ─────────────────────────────────────────────

/**
 * Dynamically import Mera to handle cases where the package isn't installed.
 * This prevents crashes during development / testing.
 */
async function importMera(): Promise<any> {
  try {
    const meraModule = await import('@category-labs/mera');
    return meraModule.default || meraModule;
  } catch (error) {
    console.warn(
      '[MeraAuth] @category-labs/mera not installed. ' +
        'Run: npm install @category-labs/mera',
    );
    return null;
  }
}

/**
 * Parse Mera-specific errors into human-readable messages.
 */
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
