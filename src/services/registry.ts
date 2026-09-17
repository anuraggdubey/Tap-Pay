/**
 * Registry Service — Supabase Architecture
 *
 * Handles username registration, resolution, and reverse lookup
 * securely over Supabase.
 */

import {ethers} from 'ethers';
import {loadPrivateKey} from './wallet';
import {supabase} from '../config/supabase';

function normalizeUsername(username: string): string {
  return username.replace(/0/g, 'o').replace(/1/g, 'l').toLowerCase();
}

/**
 * Register a username on Supabase
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
    
    // Create wallet instance just to derive the public address securely
    const wallet = new ethers.Wallet(key);
    const address = wallet.address.toLowerCase();
    const normalized = normalizeUsername(username);

    // 1. Check if wallet already registered
    const { data: existingAddress } = await supabase
      .from('usernames')
      .select('username')
      .eq('wallet_address', address)
      .maybeSingle();

    if (existingAddress) {
      return { error: 'This address already has a registered username' };
    }

    // 2. Insert into Supabase
    const { error } = await supabase.from('usernames').insert([
      { 
        username, 
        normalized_username: normalized,
        wallet_address: address 
      }
    ]);

    if (error) {
      // 23505 is the Postgres error code for unique_violation
      if (error.code === '23505') { 
        // Generate 3 suggestions
        const suggestions: string[] = [];
        let counter = 1;
        while (suggestions.length < 3 && counter < 50) {
          const suffix = Math.floor(Math.random() * 1000).toString();
          const suggestedName = `${username}${suffix}`.slice(0, 20);
          const suggestedNormalized = normalizeUsername(suggestedName);
          
          const { data: exists } = await supabase
            .from('usernames')
            .select('username')
            .eq('normalized_username', suggestedNormalized)
            .maybeSingle();
            
          if (!exists && !suggestions.includes(suggestedName)) {
            suggestions.push(suggestedName);
          }
          counter++;
        }
        return { error: 'Username taken', suggestions };
      }
      return { error: error.message };
    }

    return { username, address };
  } catch (error: any) {
    return { error: error.message || 'Network error' };
  }
}

/**
 * Release your current username (Mocked - needs auth support if desired later)
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
    const { data } = await supabase
      .from('usernames')
      .select('wallet_address')
      .eq('username', username)
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
