/**
 * TapPay App Root
 * Phone-to-phone NFC tap & username payments on Monad testnet
 *
 * ⚠️ TEMPORARY: Showing MeraTestScreen for passkey testing.
 * REVERT THIS after testing — restore AppNavigator.
 */

import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import {WalletProvider} from './src/context/WalletContext';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <WalletProvider>
        <AppNavigator />
      </WalletProvider>
    </SafeAreaProvider>
  );
}

export default App;
