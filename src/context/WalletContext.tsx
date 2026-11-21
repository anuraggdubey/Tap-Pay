/**
 * WalletContext — Global wallet state provider
 *
 * Exposes wallet address, balance, username, loading status, and actions
 * to all screens via React Context.
 */

import React, {createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  generateWallet,
  storeWallet,
  loadRecoveryPhrase,
  getWalletAddress,
  getBalance,
  hasWallet,
  hasRecoveryPhrase,
  deleteWallet,
  WalletError,
} from '../services/wallet';
import {
  isPrivateKeyHex,
  isValidRecoveryPhrase,
  normalizeMnemonic,
  walletFromRecoveryPhrase,
} from '../utils/recovery';
import {reverseResolve} from '../services/registry';
import {getTokenBalance} from '../services/tokens/tokenBalance';
import {setHistoryWallet} from '../services/walletHistory';
import {discardLegacyHistory} from '../services/secureHistoryStore';

const USERNAME_STORAGE_KEY = '@tappay_username';
const BACKUP_VERIFIED_KEY = '@tappay_backup_verified';

async function discardOrphanedHistory(): Promise<void> {
  if (!(await hasWallet(true))) {
    await discardLegacyHistory();
  }
}

interface WalletState {
  isLoading: boolean;
  isInitialized: boolean;
  address: string | null;
  balance: bigint;
  ausdBalance: bigint;
  username: string | null;
  /** True once the user has proven they saved the recovery phrase (or no phrase exists). */
  backupVerified: boolean;
  /** A wallet exists on this device but could not be unlocked (auth cancelled or key invalidated). */
  walletLocked: boolean;
  /** Re-attempt unlocking the existing wallet (prompts for phone authentication). */
  unlockWallet: () => Promise<void>;
  // Actions
  /** Creates the one wallet allowed on this device. Throws WalletError. Returns the recovery phrase to show once. */
  createWallet: () => Promise<{address: string; mnemonic: string}>;
  /** Restores from a 12-word phrase onto a device with no wallet. Throws WalletError. */
  restoreFromPhrase: (phrase: string) => Promise<string>;
  /** Restores from a raw private key (advanced; no phrase backup is possible). Throws WalletError. */
  importPrivateKey: (privateKey: string) => Promise<string>;
  markBackupVerified: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  revealRecoveryPhrase: (promptTitle?: string) => Promise<string | null>;
  resetWallet: () => Promise<boolean>;
  saveUsername: (name: string) => Promise<void>;
}

const WalletContext = createContext<WalletState | undefined>(undefined);

export function WalletProvider({children}: {children: ReactNode}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<bigint>(0n);
  const [ausdBalance, setAusdBalance] = useState<bigint>(0n);
  const [username, setUsername] = useState<string | null>(null);
  const [backupVerified, setBackupVerified] = useState(false);
  const [walletLocked, setWalletLocked] = useState(false);

  // Load the username: show the local cache instantly, then reconcile with the server so a
  // stale or imported-from-another-wallet cache never keeps showing the wrong name.
  const loadStoredUsername = useCallback(async (addr: string | null) => {
    try {
      const storedUsername = await AsyncStorage.getItem(USERNAME_STORAGE_KEY);
      if (storedUsername) {
        setUsername(storedUsername);
      }

      if (addr) {
        const serverUsername = await reverseResolve(addr);
        if (serverUsername) {
          if (serverUsername !== storedUsername) {
            setUsername(serverUsername);
            await AsyncStorage.setItem(USERNAME_STORAGE_KEY, serverUsername);
          }
        }
        // If the server returns null we keep the local value: it may just be offline, and a
        // released username clears the cache through resetWallet / release flows instead.
      }
    } catch {
      // Silently fail — username display is non-critical
    }
  }, []);

  // Load the wallet from secure storage (on mount, and when the user retries unlocking)
  const initWallet = useCallback(async () => {
    setHistoryWallet(null);
    setWalletLocked(false);
    try {
      const exists = await hasWallet(true);
      if (exists) {
        const addr = await getWalletAddress();
        if (!addr) {
          // Wallet exists but could not be unlocked (cancelled / key invalidated): do not
          // pretend it is usable. The user must authenticate again or reset the wallet.
          setIsInitialized(false);
          setWalletLocked(true);
          return;
        }
        setHistoryWallet(addr);
        setAddress(addr);
        setIsInitialized(true);

        // Backup status: wallets without a stored phrase (older key-only wallets) cannot be
        // backed up by phrase, so they are not blocked.
        const flag = await AsyncStorage.getItem(BACKUP_VERIFIED_KEY);
        if (flag === '1') {
          setBackupVerified(true);
        } else if (!(await hasRecoveryPhrase())) {
          await AsyncStorage.setItem(BACKUP_VERIFIED_KEY, '1');
          setBackupVerified(true);
        } else {
          setBackupVerified(false);
        }

        // Load username
        await loadStoredUsername(addr);

        try {
          const bal = await getBalance(addr);
          setBalance(bal);
          const ausdBal = await getTokenBalance(addr, 'AUSD');
          setAusdBalance(ausdBal.balanceRaw);
        } catch {
          // Network error — balance stays 0
        }
      } else {
        await discardLegacyHistory();
      }
    } catch (error) {
      console.error('Wallet init error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadStoredUsername]);

  useEffect(() => {
    initWallet();
  }, [initWallet]);

  // Periodic balance refresh (every 10 seconds) — pauses when app is backgrounded
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    if (!address) {
      return;
    }

    let interval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(async () => {
        try {
          const bal = await getBalance(address);
          setBalance(bal);
          const ausdBal = await getTokenBalance(address, 'AUSD');
          setAusdBalance(ausdBal.balanceRaw);
        } catch {
          // Silently fail — keep last known balance
        }
      }, 10_000);
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (appState.current?.match(/inactive|background/) && nextState === 'active') {
        // App came to foreground — resume polling
        startPolling();
      } else if (nextState.match(/inactive|background/)) {
        // App went to background — stop polling to save battery & RPC calls
        stopPolling();
      }
      appState.current = nextState;
    };

    startPolling();
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [address]);

  const markBackupVerified = useCallback(async () => {
    await AsyncStorage.setItem(BACKUP_VERIFIED_KEY, '1');
    setBackupVerified(true);
  }, []);

  const activateWallet = useCallback(
    async (newAddress: string, verified: boolean) => {
      if (verified) {
        await AsyncStorage.setItem(BACKUP_VERIFIED_KEY, '1');
      } else {
        await AsyncStorage.removeItem(BACKUP_VERIFIED_KEY);
      }
      setHistoryWallet(newAddress);
      setBackupVerified(verified);
      setAddress(newAddress);
      setIsInitialized(true);
    },
    [],
  );

  const createWallet = useCallback(async () => {
    const wallet = generateWallet();
    await discardOrphanedHistory();
    const newAddress = await storeWallet({
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic,
    });
    await activateWallet(newAddress, false);
    return {address: newAddress, mnemonic: wallet.mnemonic};
  }, [activateWallet]);

  const restoreFromPhrase = useCallback(
    async (phrase: string) => {
      if (!isValidRecoveryPhrase(phrase)) {
        throw new WalletError(
          'INVALID_SECRET',
          'That is not a valid 12-word recovery phrase. Check the words and their order.',
        );
      }
      const normalized = normalizeMnemonic(phrase);
      const wallet = walletFromRecoveryPhrase(normalized);
      await discardOrphanedHistory();
      const newAddress = await storeWallet({
        privateKey: wallet.privateKey,
        mnemonic: normalized,
      });
      await activateWallet(newAddress, true);
      await loadStoredUsername(newAddress);
      return newAddress;
    },
    [activateWallet, loadStoredUsername],
  );

  const importPrivateKey = useCallback(
    async (privateKey: string) => {
      const key = privateKey.trim();
      if (!isPrivateKeyHex(key)) {
        throw new WalletError('INVALID_SECRET', 'Invalid private key. It must be 0x followed by 64 hex characters.');
      }
      await discardOrphanedHistory();
      const newAddress = await storeWallet({privateKey: key});
      await activateWallet(newAddress, true);
      await loadStoredUsername(newAddress);
      return newAddress;
    },
    [activateWallet, loadStoredUsername],
  );

  const refreshBalance = useCallback(async () => {
    if (!address) {
      return;
    }
    try {
      const bal = await getBalance(address);
      setBalance(bal);
      const ausdBal = await getTokenBalance(address, 'AUSD');
      setAusdBalance(ausdBal.balanceRaw);
    } catch {
      // Keep last known balance
    }
  }, [address]);

  const revealRecoveryPhrase = useCallback(async (promptTitle?: string) => {
    return await loadRecoveryPhrase(promptTitle);
  }, []);

  const saveUsernameFn = useCallback(async (name: string) => {
    try {
      await AsyncStorage.setItem(USERNAME_STORAGE_KEY, name);
      setUsername(name);
    } catch (error) {
      console.error('Failed to save username:', error);
    }
  }, []);

  const resetWallet = useCallback(async () => {
    try {
      const deleted = await deleteWallet();
      if (deleted) {
        setHistoryWallet(null);
        setAddress(null);
        setBalance(0n);
        setAusdBalance(0n);
        setIsInitialized(false);
        setBackupVerified(false);
        setWalletLocked(false);
        setUsername(null);
        await Promise.allSettled([
          discardLegacyHistory(),
          AsyncStorage.removeItem(USERNAME_STORAGE_KEY),
          AsyncStorage.removeItem(BACKUP_VERIFIED_KEY),
        ]);
        return true;
      }
      return false;
    } catch (error) {
      if (error instanceof WalletError) {
        throw error;
      }
      console.error('Reset wallet error:', error);
      return false;
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        isLoading,
        isInitialized,
        address,
        balance,
        ausdBalance,
        username,
        backupVerified,
        walletLocked,
        unlockWallet: initWallet,
        createWallet,
        restoreFromPhrase,
        importPrivateKey,
        markBackupVerified,
        refreshBalance,
        revealRecoveryPhrase,
        resetWallet,
        saveUsername: saveUsernameFn,
      }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
