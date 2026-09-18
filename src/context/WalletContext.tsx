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
  savePrivateKey,
  loadPrivateKey,
  getWalletAddress,
  getBalance,
  hasWallet,
  deleteWallet,
} from '../services/wallet';
import {reverseResolve} from '../services/registry';

const USERNAME_STORAGE_KEY = '@tappay_username';

interface WalletState {
  isLoading: boolean;
  isInitialized: boolean;
  address: string | null;
  balance: bigint;
  username: string | null;
  // Actions
  createWallet: () => Promise<{address: string; privateKey: string} | null>;
  importWallet: (privateKey: string) => Promise<boolean>;
  refreshBalance: () => Promise<void>;
  getPrivateKey: (promptTitle?: string) => Promise<string | null>;
  resetWallet: () => Promise<boolean>;
  saveUsername: (name: string) => Promise<void>;
}

const WalletContext = createContext<WalletState | undefined>(undefined);

export function WalletProvider({children}: {children: ReactNode}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<bigint>(0n);
  const [username, setUsername] = useState<string | null>(null);

  // Load stored username from AsyncStorage
  const loadStoredUsername = useCallback(async (addr: string | null) => {
    try {
      // First try local storage
      const storedUsername = await AsyncStorage.getItem(USERNAME_STORAGE_KEY);
      if (storedUsername) {
        setUsername(storedUsername);
        return;
      }

      // Fallback: try on-chain reverse resolve if address is available
      if (addr) {
        const onChainUsername = await reverseResolve(addr);
        if (onChainUsername) {
          setUsername(onChainUsername);
          // Cache it locally for next time
          await AsyncStorage.setItem(USERNAME_STORAGE_KEY, onChainUsername);
        }
      }
    } catch {
      // Silently fail — username display is non-critical
    }
  }, []);

  // Check for existing wallet on mount
  useEffect(() => {
    (async () => {
      try {
        const exists = await hasWallet();
        if (exists) {
          const addr = await getWalletAddress();
          setAddress(addr);
          setIsInitialized(true);

          // Load username
          await loadStoredUsername(addr);

          if (addr) {
            try {
              const bal = await getBalance(addr);
              setBalance(bal);
            } catch {
              // Network error — balance stays 0
            }
          }
        }
      } catch (error) {
        console.error('Wallet init error:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [loadStoredUsername]);

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

  const createWallet = useCallback(async () => {
    try {
      const wallet = generateWallet();
      const saved = await savePrivateKey(wallet.privateKey);
      if (saved) {
        setAddress(wallet.address);
        setIsInitialized(true);
        return wallet;
      }
      return null;
    } catch (error) {
      console.error('Create wallet error:', error);
      return null;
    }
  }, []);

  const importWallet = useCallback(async (privateKey: string) => {
    try {
      const saved = await savePrivateKey(privateKey);
      if (saved) {
        const addr = await getWalletAddress();
        setAddress(addr);
        setIsInitialized(true);

        // Recover existing username from Supabase (assigned during original wallet creation)
        if (addr) {
          await loadStoredUsername(addr);
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error('Import wallet error:', error);
      return false;
    }
  }, [loadStoredUsername]);

  const refreshBalance = useCallback(async () => {
    if (!address) {
      return;
    }
    try {
      const bal = await getBalance(address);
      setBalance(bal);
    } catch {
      // Keep last known balance
    }
  }, [address]);

  const getPrivateKeyFn = useCallback(async (promptTitle?: string) => {
    return await loadPrivateKey(promptTitle);
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
        setAddress(null);
        setBalance(0n);
        setIsInitialized(false);
        setUsername(null);
        // Clear stored username
        await AsyncStorage.removeItem(USERNAME_STORAGE_KEY);
        return true;
      }
      return false;
    } catch (error) {
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
        username,
        createWallet,
        importWallet,
        refreshBalance,
        getPrivateKey: getPrivateKeyFn,
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
