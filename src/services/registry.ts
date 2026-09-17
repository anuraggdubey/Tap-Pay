/**
 * Registry Service — Centralized Backend Interactions
 *
 * Handles username registration, resolution, and reverse lookup
 * via the TapPay centralized backend.
 */

import {ethers} from 'ethers';
import {getProvider, loadPrivateKey} from './wallet';
import {MONAD_CONFIG} from '../config/monad';

/**
 * Register a username on the backend
 * @returns Object with username on success, or error/suggestions on failure
 */
export async function registerUsername(
  username: string,
): Promise<{username?: string; address?: string; error?: string; suggestions?: string[]}> {
  try {
    const key = await loadPrivateKey();
    if (!key) {
      return {error: 'Wallet not found'};
    }
    const provider = getProvider();
    const wallet = new ethers.Wallet(key, provider);
    const address = wallet.address;

    const response = await fetch(`${MONAD_CONFIG.apiBaseUrl}/username/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({username, address}),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.error || 'Registration failed',
        suggestions: data.suggestions || undefined,
      };
    }

    return {username: data.username, address: data.address};
  } catch (error: any) {
    return {error: error.message || 'Network error'};
  }
}

/**
 * Release your current username (Mocked - needs backend support if desired later)
 */
export async function releaseUsername(): Promise<{error?: string}> {
  return {error: 'Releasing usernames is not currently supported'};
}

/**
 * Resolve a username to a wallet address
 * @returns The address, or null if not found
 */
export async function resolveUsername(username: string): Promise<string | null> {
  try {
    const response = await fetch(`${MONAD_CONFIG.apiBaseUrl}/username/resolve/${username}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.address || null;
  } catch {
    return null;
  }
}

/**
 * Reverse-resolve an address to a username
 * @returns The username, or null if not registered
 */
export async function reverseResolveAddress(address: string): Promise<string | null> {
  try {
    const response = await fetch(`${MONAD_CONFIG.apiBaseUrl}/username/reverse/${address}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.username || null;
  } catch {
    return null;
  }
}

/**
 * Alias for reverseResolveAddress
 */
export const reverseResolve = reverseResolveAddress;
