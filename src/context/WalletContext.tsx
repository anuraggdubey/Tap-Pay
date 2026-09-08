/**
 * WalletContext — Global wallet state provider
 *
 * Exposes wallet address, balance, loading status, and actions
 * to all screens via React Context.
 */

import React, {createContext, useContext, useState, useEffect, useCallback, ReactNode} from 'react';
import {
  generateWallet,
  savePrivateKey,
  loadPrivateKey,
  getWalletAddress,
  getBalance,
  hasWallet,
  deleteWallet,
} from '../services/wallet';

interface WalletState {
  isLoading: boolean;
  isInitialized: boolean;
  address: string | null;
  balance: bigint;
  // Actions
  createWallet: () => Promise<{address: string; privateKey: string} | null>;
  importWallet: (privateKey: string) => Promise<boolean>;
  refreshBalance: () => Promise<void>;
  getPrivateKey: () => Promise<string | null>;
  resetWallet: () => Promise<boolean>;
}

const WalletContext = createContext<WalletState | undefined>(undefined);

export function WalletProvider({children}: {children: ReactNode}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<bigint>(0n);

  // Check for existing wallet on mount
  useEffect(() => {
    (async () => {
      try {
        const exists = await hasWallet();
        if (exists) {
          const addr = await getWalletAddress();
          setAddress(addr);
          setIsInitialized(true);

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
  }, []);

  // Periodic balance refresh (every 10 seconds)
  useEffect(() => {
    if (!address) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const bal = await getBalance(address);
        setBalance(bal);
      } catch {
        // Silently fail — keep last known balance
      }
    }, 10_000);

    return () => clearInterval(interval);
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
        return true;
      }
      return false;
    } catch (error) {
      console.error('Import wallet error:', error);
      return false;
    }
  }, []);

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

  const getPrivateKey = useCallback(async () => {
    return await loadPrivateKey();
  }, []);

  const resetWallet = useCallback(async () => {
    try {
      const deleted = await deleteWallet();
      if (deleted) {
        setAddress(null);
        setBalance(0n);
        setIsInitialized(false);
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
        createWallet,
        importWallet,
        refreshBalance,
        getPrivateKey,
        resetWallet,
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
