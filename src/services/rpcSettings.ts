/**
 * User-chosen RPC endpoint (issue #43).
 *
 * By default TapPay talks to a few public RPC providers. Each one sees the sender's IP together
 * with the from / to / amount of a payment, so privacy-conscious users can point the app at their
 * own node instead. When a custom endpoint is set it is the ONLY endpoint used: no silent
 * fallback to the public providers.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const CUSTOM_RPC_STORAGE_KEY = '@tappay_custom_rpc';

export type RpcUrlCheck = {ok: true; url: string} | {ok: false; error: string};

/** Accepts only plain https URLs: no credentials, query or fragment, and a real hostname. */
export function validateRpcUrl(input: string): RpcUrlCheck {
  const raw = (input || '').trim();
  if (!raw) {
    return {ok: false, error: 'Enter an RPC URL.'};
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return {ok: false, error: 'That is not a valid URL.'};
  }
  if (url.protocol !== 'https:') {
    return {ok: false, error: 'The RPC URL must start with https://'};
  }
  if (url.username || url.password) {
    return {ok: false, error: 'Do not put a username or password in the URL.'};
  }
  if (url.search || url.hash) {
    return {ok: false, error: 'The URL cannot contain a query string or fragment.'};
  }
  const host = url.hostname.toLowerCase();
  if (!host.includes('.') || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes('[')) {
    return {ok: false, error: 'Use a public hostname (not localhost or an IP address).'};
  }
  const normalized = `${url.protocol}//${url.host}${url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '')}`;
  return {ok: true, url: normalized};
}

export async function readStoredCustomRpc(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(CUSTOM_RPC_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const check = validateRpcUrl(stored);
    return check.ok ? check.url : null;
  } catch {
    return null;
  }
}

export async function storeCustomRpc(url: string | null): Promise<void> {
  if (url === null) {
    await AsyncStorage.removeItem(CUSTOM_RPC_STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(CUSTOM_RPC_STORAGE_KEY, url);
}

/** Host only, for display. Never shows a path that might hold an API key. */
export function describeRpc(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'unknown';
  }
}
