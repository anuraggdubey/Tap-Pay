/**
 * TapPay App Root
 * Phone-to-phone NFC tap & username payments on Monad Mainnet
 */

import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import {WalletProvider} from './src/context/WalletContext';
import {ThemeProvider, useTheme} from './src/context/ThemeContext';
import {assertMainnetOnlyConfig} from './src/config/networkGuard';

function AppStatusBar() {
  const {isDark, colors} = useTheme();
  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      backgroundColor={colors.background}
    />
  );
}

function App() {
  useEffect(() => {
    assertMainnetOnlyConfig();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppStatusBar />
        <WalletProvider>
          <AppNavigator />
        </WalletProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
