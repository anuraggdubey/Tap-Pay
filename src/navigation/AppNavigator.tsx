/**
 * AppNavigator — Modern Floating Capsule Tab Navigation + Clean Stack
 * Inspired by Apple & iOS floating navigation bars (Image 1).
 * 100% responsive across Google Pixel, Samsung One UI, Xiaomi/Redmi, and iOS.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

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
import {HomeIcon, PayIcon, HistoryIcon, SettingsIcon} from '../components/AppIcons';
import {triggerHaptic} from '../utils/haptics';

export type RootStackParamList = {
  WalletSetup: undefined;
  MainTabs: undefined;
  SendTap: undefined;
  ReceiveTap: undefined;
  SendPayment: undefined;
  TransactionStatus: {
    txHash: string;
    amount: string;
    recipient: string;
    direction?: 'sent' | 'received';
    counterpartyUsername?: string;
    waitForBalance?: boolean;
    expectedAmountWei?: string;
  };
  AccountInfo: undefined;
  AboutTapPay: undefined;
  NetworkInfo: undefined;
  History: undefined;
  Settings: undefined;
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
    background: '#09090D',
    card: '#14141C',
    text: '#FFFFFF',
    border: '#1F1F2C',
    primary: '#FFFFFF',
  },
};

/**
 * FloatingTabBar — Capsule navigation floating in the air (Image 1)
 * Uses dynamic insets so it will NEVER collide with Android 3-button nav or iOS gesture pill.
 */
function FloatingTabBar({state, descriptors, navigation}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // Lift above system navigation bar (3-button nav on Android is ~48dp, gesture pill is ~16-24dp)
  const bottomOffset = Math.max(insets.bottom, 12) + 8;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.floatingContainer, {bottom: bottomOffset}]}>
      <View style={styles.capsulePill}>
        {state.routes.map((route, index) => {
          const {options} = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            triggerHaptic.selection();
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? {selected: true} : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={`tab-${route.name.toLowerCase()}`}
              onPress={onPress}
              activeOpacity={0.7}
              style={[
                styles.tabItem,
                isFocused && styles.tabItemFocused,
              ]}>
              <View style={styles.iconWrapper}>
                {route.name === 'Home' && <HomeIcon size={20} focused={isFocused} />}
                {route.name === 'Pay' && <PayIcon size={20} focused={isFocused} />}
                {route.name === 'History' && <HistoryIcon size={20} focused={isFocused} />}
                {route.name === 'Settings' && <SettingsIcon size={20} focused={isFocused} />}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isFocused ? styles.tabLabelFocused : styles.tabLabelMuted,
                ]}>
                {label as string}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{tabBarLabel: 'Home'}}
      />
      <Tab.Screen
        name="Pay"
        component={SendPaymentScreen}
        options={{tabBarLabel: 'Pay'}}
      />
      <Tab.Screen
        name="History"
        component={TransactionHistoryScreen}
        options={{tabBarLabel: 'History'}}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{tabBarLabel: 'Settings'}}
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
          headerStyle: {backgroundColor: '#0F0F16'},
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {fontWeight: '700', fontSize: 17},
          contentStyle: {backgroundColor: '#09090D'},
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
          options={{title: 'Send via Tap', headerBackTitle: 'Back'}}
        />
        <Stack.Screen
          name="ReceiveTap"
          component={ReceiveTapScreen}
          options={{title: 'Receive via Tap', headerBackTitle: 'Back'}}
        />
        <Stack.Screen
          name="SendPayment"
          component={SendPaymentScreen}
          options={{title: 'Send Payment', headerBackTitle: 'Back'}}
        />
        <Stack.Screen
          name="TransactionStatus"
          component={TransactionStatusScreen}
          options={{title: 'Transaction', headerBackVisible: false}}
        />
        <Stack.Screen
          name="AccountInfo"
          component={AccountInfoScreen}
          options={{title: 'Account Info', headerBackTitle: 'Back'}}
        />
        <Stack.Screen
          name="AboutTapPay"
          component={AboutScreen}
          options={{title: 'About TapPay', headerBackTitle: 'Back'}}
        />
        <Stack.Screen
          name="NetworkInfo"
          component={NetworkScreen}
          options={{title: 'Network', headerBackTitle: 'Back'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(20, 20, 28, 0.94)',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '92%',
    maxWidth: 420,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 10},
        shadowOpacity: 0.45,
        shadowRadius: 18,
      },
      android: {
        elevation: 14,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 24,
  },
  tabItemFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  iconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  tabLabelFocused: {
    color: '#FFFFFF',
  },
  tabLabelMuted: {
    color: '#8E8E93',
  },
});
