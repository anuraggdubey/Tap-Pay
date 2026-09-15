/**
 * AppNavigator — Main navigation stack
 */

import React from 'react';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import WalletSetupScreen from '../screens/WalletSetupScreen';
import HomeScreen from '../screens/HomeScreen';
import SendTapScreen from '../screens/SendTapScreen';
import ReceiveTapScreen from '../screens/ReceiveTapScreen';
import UsernamePayScreen from '../screens/UsernamePayScreen';
import TransactionStatusScreen from '../screens/TransactionStatusScreen';
import TransactionHistoryScreen from '../screens/TransactionHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AccountInfoScreen from '../screens/AccountInfoScreen';
import AboutScreen from '../screens/AboutScreen';
import NetworkScreen from '../screens/NetworkScreen';
import {useWallet} from '../context/WalletContext';

export type RootStackParamList = {
  WalletSetup: undefined;
  Home: undefined;
  SendTap: undefined;
  ReceiveTap: undefined;
  UsernamePay: undefined;
  TransactionStatus: {txHash: string; amount: string; recipient: string};
  TransactionHistory: undefined;
  Settings: undefined;
  AccountInfo: undefined;
  AboutTapPay: undefined;
  NetworkInfo: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const TapPayTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0A0A0F',
    card: '#12121A',
    text: '#FFFFFF',
    border: '#1E1E2E',
    primary: '#7C5CFC',
  },
};

export default function AppNavigator() {
  const {isInitialized, isLoading} = useWallet();

  if (isLoading) {
    return null; // Splash screen would go here
  }

  return (
    <NavigationContainer theme={TapPayTheme}>
      <Stack.Navigator
        initialRouteName={isInitialized ? 'Home' : 'WalletSetup'}
        screenOptions={{
          headerStyle: {backgroundColor: '#12121A'},
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {fontWeight: '700'},
          contentStyle: {backgroundColor: '#0A0A0F'},
          animation: 'slide_from_right',
        }}>
        <Stack.Screen
          name="WalletSetup"
          component={WalletSetupScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{title: 'TapPay', headerBackVisible: false}}
        />
        <Stack.Screen
          name="SendTap"
          component={SendTapScreen}
          options={{title: 'Send via Tap'}}
        />
        <Stack.Screen
          name="ReceiveTap"
          component={ReceiveTapScreen}
          options={{title: 'Receive via Tap'}}
        />
        <Stack.Screen
          name="UsernamePay"
          component={UsernamePayScreen}
          options={{title: 'Pay by Username'}}
        />
        <Stack.Screen
          name="TransactionStatus"
          component={TransactionStatusScreen}
          options={{title: 'Transaction'}}
        />
        <Stack.Screen
          name="TransactionHistory"
          component={TransactionHistoryScreen}
          options={{title: 'History'}}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{title: 'Settings'}}
        />
        <Stack.Screen
          name="AccountInfo"
          component={AccountInfoScreen}
          options={{title: 'Account Info'}}
        />
        <Stack.Screen
          name="AboutTapPay"
          component={AboutScreen}
          options={{title: 'About TapPay'}}
        />
        <Stack.Screen
          name="NetworkInfo"
          component={NetworkScreen}
          options={{title: 'Network'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
