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
import MeraTestScreen from './src/screens/MeraTestScreen';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <MeraTestScreen />
    </SafeAreaProvider>
  );
}

export default App;
