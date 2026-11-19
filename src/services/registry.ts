/**
 * Registry Service — Supabase Architecture
 *
 * Handles username registration, resolution, and reverse lookup
 * securely over Supabase.
 */

import {ethers} from 'ethers';
import {loadPrivateKey} from './wallet';
import {supabase} from '../config/supabase';
import {MONAD_CONFIG} from '../config/monad';
import {buildUsernameAuthMessage, UsernameAction} from './usernameAuth';

const ACTIVE_CHAIN_ID = MONAD_CONFIG.chainId;

/**
 * Sign an ownership proof with `wallet` and send it to the register-username Edge Function.
 * The wallet key never leaves the device; only the signature is sent. The server recovers the
 * signer and refuses to write or delete a row for any wallet the caller cannot sign for.
 */
async function invokeUsernameAction(
  action: UsernameAction,
  username: string,
  wallet: ethers.Wallet,
): Promise<{data?: any; error?: string}> {
  const walletAddress = wallet.address.toLowerCase();
  const issuedAt = new Date().toISOString();
  const message = buildUsernameAuthMessage({
    action,
    username,
    walletAddress,
    chainId: ACTIVE_CHAIN_ID,
    issuedAt,
  });
  const signature = await wallet.signMessage(message);

  const {data, error} = await supabase.functions.invoke('register-username', {
    body: {
      action,
      username: username.toLowerCase(),
      walletAddress,
      chainId: ACTIVE_CHAIN_ID,
      issuedAt,
      signature,
    },
  });

  if (error) {
    // supabase-js exposes the function's JSON body on error.context for non-2xx responses.
    let body: any;
    try {
      body = await error.context?.json?.();
    } catch {
      body = undefined;
    }
    return {error: body?.error || error.message || 'Request failed', data: body};
  }
  return {data};
}

/**
 * Register a username, proving ownership of the wallet with a signature.
 * @returns Object with username on success, or error/suggestions on failure
 */
export async function registerUsername(
  username: string,
): Promise<{username?: string; address?: string; error?: string; suggestions?: string[]}> {
  try {
    const key = await loadPrivateKey('Authenticate to claim this username');
    if (!key) {
      return {error: 'Authentication cancelled or wallet not found'};
    }
    const wallet = new ethers.Wallet(key);
    const result = await invokeUsernameAction('register', username, wallet);
    if (result.error) {
      if (result.data?.reason === 'taken') {
        return {error: 'Username taken', suggestions: await suggestUsernames(username)};
      }
      if (result.data?.reason === 'wallet_taken') {
        return {error: 'This address already has a registered username'};
      }
      return {error: result.error};
    }
    return {username, address: wallet.address.toLowerCase()};
  } catch (error: any) {
    return {error: error?.message || 'Network error'};
  }
}

/** Suggest up to 3 available variants of a taken username (public reads only). */
async function suggestUsernames(username: string): Promise<string[]> {
  const suggestions: string[] = [];
  let counter = 0;
  while (suggestions.length < 3 && counter < 50) {
    const suffix = Math.floor(Math.random() * 1000).toString();
    const candidate = `${username}${suffix}`.slice(0, 20).toLowerCase();
    counter++;
    if (!suggestions.includes(candidate) && !(await resolveUsername(candidate))) {
      suggestions.push(candidate);
    }
  }
  return suggestions;
}

/**
 * Release the username held by the current wallet (signature-proved).
 */
export async function releaseUsername(): Promise<{error?: string}> {
  try {
    const key = await loadPrivateKey('Authenticate to release your username');
    if (!key) {
      return {error: 'Authentication cancelled or wallet not found'};
    }
    const wallet = new ethers.Wallet(key);
    const current = await reverseResolveAddress(wallet.address);
    if (!current) {
      return {error: 'This wallet has no registered username'};
    }
    const result = await invokeUsernameAction('release', current, wallet);
    return result.error ? {error: result.error} : {};
  } catch (error: any) {
    return {error: error?.message || 'Network error'};
  }
}

/**
 * Resolve a username to a wallet address
 * @returns The address, or null if not found
 */
export async function resolveUsername(username: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('usernames')
      .select('wallet_address')
      .eq('username', username)
      .eq('chain_id', ACTIVE_CHAIN_ID)
      .maybeSingle();
    
    return data?.wallet_address || null;
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
    const { data } = await supabase
      .from('usernames')
      .select('username')
      .eq('wallet_address', address.toLowerCase())
      .eq('chain_id', ACTIVE_CHAIN_ID)
      .maybeSingle();
      
    return data?.username || null;
  } catch {
    return null;
  }
}

/**
 * Alias for reverseResolveAddress
 */
export const reverseResolve = reverseResolveAddress;
