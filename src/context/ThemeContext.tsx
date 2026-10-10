/**
 * ThemeContext — light / dark mode for TapPay (persisted).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppColors,
  AppGlass,
  darkColors,
  darkGlass,
  getPremiumCardStyle,
  lightColors,
  lightGlass,
} from '../theme/palettes';

const STORAGE_KEY = '@tappay_dark_mode';

type ThemeContextValue = {
  isDark: boolean;
  colors: AppColors;
  glass: AppGlass;
  premiumCard: ReturnType<typeof getPremiumCardStyle>;
  setDarkMode: (enabled: boolean) => void;
  toggleDarkMode: () => void;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({children}: {children: ReactNode}) {
  const [isDark, setIsDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted && stored === '1') {
          setIsDark(true);
        }
      } catch {
        // keep light default
      } finally {
        if (mounted) {
          setReady(true);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setDarkMode = useCallback((enabled: boolean) => {
    setIsDark(enabled);
    AsyncStorage.setItem(STORAGE_KEY, enabled ? '1' : '0').catch(() => {});
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(!isDark);
  }, [isDark, setDarkMode]);

  const value = useMemo<ThemeContextValue>(() => {
    const colors = isDark ? darkColors : lightColors;
    const glass = isDark ? darkGlass : lightGlass;
    return {
      isDark,
      colors,
      glass,
      premiumCard: getPremiumCardStyle(colors, isDark),
      setDarkMode,
      toggleDarkMode,
      ready,
    };
  }, [isDark, setDarkMode, toggleDarkMode, ready]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
