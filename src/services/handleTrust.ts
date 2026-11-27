/**
 * Warnings before paying an @handle (#129). Senders recognise the handle, not the address, so a
 * handle that was just registered, or that now points to a different wallet than the one this
 * phone paid before, could belong to someone else (for example after the owner released it).
 */

import {TransactionRecord, getTransactionHistory} from './history';
import type {UsernameResolution} from './registry';

/** A handle registered more recently than this is flagged as new. */
export const NEW_HANDLE_WARNING_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const handleKey = (username: string) => username.trim().replace(/^@/, '').toLowerCase();
const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

/** The wallet this phone most recently paid under `username`, from local history. */
export function lastPaidAddressForHandle(history: TransactionRecord[], username: string): string | null {
  const wanted = handleKey(username);
  let latest: TransactionRecord | null = null;
  for (const row of history) {
    if (row.direction !== 'sent' || row.status === 'failed' || !row.counterpartyUsername) {
      continue;
    }
    if (handleKey(row.counterpartyUsername) !== wanted) {
      continue;
    }
    if (!latest || Date.parse(row.timestamp) > Date.parse(latest.timestamp)) {
      latest = row;
    }
  }
  return latest ? latest.counterparty : null;
}

/** The warning to show before paying, or null when nothing looks unusual. */
export function handleWarning(params: {
  username: string;
  address: string;
  registeredAt: string | null;
  previousAddress: string | null;
  now?: number;
}): string | null {
  const {username, address, registeredAt, previousAddress, now = Date.now()} = params;
  const handle = `@${handleKey(username)}`;
  if (previousAddress && previousAddress.toLowerCase() !== address.toLowerCase()) {
    return (
      `${handle} now points to a different wallet (${shortAddress(address)}) than the one you paid ` +
      `before (${shortAddress(previousAddress)}). The handle may have changed owner. Only continue if ` +
      'you have confirmed the new address with the person.'
    );
  }
  const registered = registeredAt ? Date.parse(registeredAt) : NaN;
  if (Number.isFinite(registered) && now - registered < NEW_HANDLE_WARNING_DAYS * DAY_MS) {
    const days = Math.max(0, Math.floor((now - registered) / DAY_MS));
    const age = days === 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`;
    return (
      `${handle} was registered ${age}. Make sure it belongs to the person you mean to pay ` +
      `(${shortAddress(address)}).`
    );
  }
  return null;
}

/** handleWarning() for a fresh lookup, compared against this phone's payment history. */
export function warningForResolvedHandle(username: string, resolution: UsernameResolution): string | null {
  return handleWarning({
    username,
    address: resolution.address,
    registeredAt: resolution.registeredAt,
    previousAddress: lastPaidAddressForHandle(getTransactionHistory(), username),
  });
}
