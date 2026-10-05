/**
 * TapPay App Root
 * Phone-to-phone NFC tap & username payments on Monad Mainnet
 *
 * ⚠️ TEMPORARY: Showing MeraTestScreen for passkey testing.
 * REVERT THIS after testing — restore AppNavigator.
 */

import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import {WalletProvider} from './src/context/WalletContext';
import {assertMainnetOnlyConfig} from './src/config/networkGuard';

function App() {
  useEffect(() => {
    assertMainnetOnlyConfig();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#EEF3FA" />
      <WalletProvider>
        <AppNavigator />
      </WalletProvider>
    </SafeAreaProvider>
  );
}

export default App;
