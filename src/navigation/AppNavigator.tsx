/**
 * AppNavigator — Bottom tab navigation + stack screens
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import WalletSetupScreen from '../screens/WalletSetupScreen';
import HomeScreen from '../screens/HomeScreen';
import SendTapScreen from '../screens/SendTapScreen';
import ReceiveTapScreen from '../screens/ReceiveTapScreen';
import SendPaymentScreen from '../screens/SendPaymentScreen';
import TransactionStatusScreen from '../screens/TransactionStatusScreen';
import TransactionHistoryScreen from '../screens/TransactionHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AccountInfoScreen from '../screens/AccountInfoScreen';
import AboutScreen from '../screens/AboutScreen';
import NetworkScreen from '../screens/NetworkScreen';
import {useWallet} from '../context/WalletContext';

export type RootStackParamList = {
  WalletSetup: undefined;
  MainTabs: undefined;
  SendTap: undefined;
  ReceiveTap: undefined;
  SendPayment: undefined;
  TransactionStatus: {txHash: string; amount: string; recipient: string};
  AccountInfo: undefined;
  AboutTapPay: undefined;
  NetworkInfo: undefined;
};

export type TabParamList = {
  Home: undefined;
  Pay: undefined;
  History: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TapPayTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0A0A0F',
    card: '#12121A',
    text: '#FFFFFF',
    border: '#1E1E2E',
    primary: '#836EF9',
  },
};

// Custom tab bar icon components (no emojis)
function TabIcon({label, focused}: {label: string; focused: boolean}) {
  const color = focused ? '#836EF9' : '#4A4A66';

  const iconMap: Record<string, {char: string; bg: string}> = {
    Home: {char: 'H', bg: focused ? '#836EF918' : 'transparent'},
    Pay: {char: 'P', bg: focused ? '#836EF918' : 'transparent'},
    History: {char: 'T', bg: focused ? '#836EF918' : 'transparent'},
    Settings: {char: 'S', bg: focused ? '#836EF918' : 'transparent'},
  };

  const icon = iconMap[label] || {char: '?', bg: 'transparent'};

  return (
    <View style={[tabIconStyles.container, {backgroundColor: icon.bg}]}>
      <Text style={[tabIconStyles.icon, {color}]}>{icon.char}</Text>
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  container: {
    width: 36,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: '#12121A'},
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {fontWeight: '700'},
        tabBarStyle: {
          backgroundColor: '#0E0E18',
          borderTopColor: '#1A1A2A',
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: 8,
          height: 60,
        },
        tabBarActiveTintColor: '#836EF9',
        tabBarInactiveTintColor: '#4A4A66',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'TapPay',
          tabBarLabel: 'Home',
          tabBarIcon: ({focused}) => <TabIcon label="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Pay"
        component={SendPaymentScreen}
        options={{
          title: 'Send Payment',
          tabBarLabel: 'Pay',
          tabBarIcon: ({focused}) => <TabIcon label="Pay" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={TransactionHistoryScreen}
        options={{
          title: 'Transactions',
          tabBarLabel: 'History',
          tabBarIcon: ({focused}) => <TabIcon label="History" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({focused}) => <TabIcon label="Settings" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const {isInitialized, isLoading} = useWallet();

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer theme={TapPayTheme}>
      <Stack.Navigator
        initialRouteName={isInitialized ? 'MainTabs' : 'WalletSetup'}
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
          name="MainTabs"
          component={MainTabs}
          options={{headerShown: false}}
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
          name="SendPayment"
          component={SendPaymentScreen}
          options={{title: 'Send Payment'}}
        />
        <Stack.Screen
          name="TransactionStatus"
          component={TransactionStatusScreen}
          options={{title: 'Transaction', headerBackVisible: false}}
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
