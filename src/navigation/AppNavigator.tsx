/**
 * AppNavigator — Modern Floating Capsule Tab Navigation + Clean Stack
 * Inspired by Apple & iOS floating navigation bars (Image 1).
 * 100% responsive across Google Pixel, Samsung One UI, Xiaomi/Redmi, and iOS.
 */

import React, {useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import {NavigationContainer, DefaultTheme, DarkTheme, useNavigation} from '@react-navigation/native';
import {createNativeStackNavigator, NativeStackNavigationProp} from '@react-navigation/native-stack';
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
import PasskeyRecoveryScreen from '../screens/PasskeyRecoveryScreen';
import NetworkScreen from '../screens/NetworkScreen';
import {useWallet} from '../context/WalletContext';
import {useTheme} from '../context/ThemeContext';
import {HomeIcon, PayIcon, HistoryIcon, SettingsIcon} from '../components/AppIcons';
import TapFab from '../components/TapFab';
import GlassSurface from '../components/GlassSurface';
import SendMethodSheet, {SendMethod} from '../components/SendMethodSheet';
import {triggerHaptic} from '../utils/haptics';
import PressableScale from '../components/PressableScale';
import {shadows} from '../theme';
import type {AppColors, AppGlass} from '../theme';

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
    tokenSymbol?: string;
    /** When opening from History, prefer the stored outcome over live waiting UI */
    initialStatus?: 'confirmed' | 'pending' | 'failed';
    completedAt?: string;
  };
  AccountInfo: undefined;
  PasskeyRecovery: undefined;
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

/**
 * FloatingTabBar — floating dock with a pulsing center Tap button.
 * Tap opens the "how do you want to send" sheet (NFC / @username / address).
 */
function FloatingTabBar({state, descriptors, navigation}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const {colors, glass, isDark} = useTheme();
  const styles = useMemo(
    () => createTabStyles(colors, glass, isDark),
    [colors, glass, isDark],
  );
  const stackNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [sheet, setSheet] = useState(false);
  const bottomOffset = Math.max(insets.bottom, 12) + 8;
  // Layout: Home, History, [Tap], Pay, Settings
  const order = ['Home', 'History', 'TAP', 'Pay', 'Settings'];

  const onSelect = (method: SendMethod) => {
    setSheet(false);
    setTimeout(() => {
      stackNav.navigate(method === 'nfc' ? 'SendTap' : 'SendPayment');
    }, 120);
  };

  return (
    <>
      <View pointerEvents="box-none" style={[styles.floatingContainer, {bottom: bottomOffset}]}>
        <GlassSurface radius={33} strength={1.6} style={styles.capsulePill}>
          {order.map(name => {
            if (name === 'TAP') {
              return (
                <TapFab
                  key="tap"
                  onPress={() => {
                    triggerHaptic.impactMedium();
                    setSheet(true);
                  }}
                />
              );
            }
            const index = state.routes.findIndex(r => r.name === name);
            if (index < 0) {
              return null;
            }
            const route = state.routes[index];
            const {options} = descriptors[route.key];
            const label = (options.tabBarLabel ?? options.title ?? route.name) as string;
            const isFocused = state.index === index;
            const onPress = () => {
              triggerHaptic.selection();
              const event = navigation.emit({type: 'tabPress', target: route.key, canPreventDefault: true});
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };
            const iconColor = isFocused ? colors.accent : colors.textMuted;
            return (
              <PressableScale
                key={route.key}
                accessibilityState={{selected: isFocused}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={`tab-${route.name.toLowerCase()}`}
                onPress={onPress}
                style={[styles.tabItem, isFocused && styles.tabItemFocused]}
                contentStyle={styles.tabItemContent}
                scaleTo={0.94}>
                <View style={styles.iconWrapper}>
                  {route.name === 'Home' && <HomeIcon size={22} color={iconColor} focused={isFocused} />}
                  {route.name === 'Pay' && <PayIcon size={22} color={iconColor} focused={isFocused} />}
                  {route.name === 'History' && <HistoryIcon size={22} color={iconColor} focused={isFocused} />}
                  {route.name === 'Settings' && <SettingsIcon size={22} color={iconColor} focused={isFocused} />}
                </View>
                <Text style={[styles.tabLabel, isFocused ? styles.tabLabelFocused : styles.tabLabelMuted]}>
                  {label}
                </Text>
                {isFocused && <View style={styles.activeDot} />}
              </PressableScale>
            );
          })}
        </GlassSurface>
      </View>
      <SendMethodSheet visible={sheet} onClose={() => setSheet(false)} onSelect={onSelect} />
    </>
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
  const {isInitialized, backupVerified, isLoading} = useWallet();
  const {colors, glass, isDark} = useTheme();

  const navTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        background: colors.background,
        card: colors.surfaceSolid,
        text: colors.text,
        border: glass.borderSubtle,
        primary: colors.accent,
      },
    }),
    [colors, glass, isDark],
  );

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        // A wallet whose recovery phrase is not yet backed up must finish onboarding first.
        initialRouteName={isInitialized && backupVerified ? 'MainTabs' : 'WalletSetup'}
        screenOptions={{
          headerStyle: {backgroundColor: colors.background},
          headerTintColor: colors.accent,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 17,
            color: colors.text,
          },
          headerShadowVisible: false,
          contentStyle: {backgroundColor: colors.background},
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
          name="PasskeyRecovery"
          component={PasskeyRecoveryScreen}
          options={{title: 'Passkey Recovery', headerBackTitle: 'Back'}}
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

function createTabStyles(colors: AppColors, glass: AppGlass, isDark: boolean) {
  return StyleSheet.create({
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
      paddingHorizontal: 8,
      height: 66,
      width: '92%',
      maxWidth: 420,
      ...shadows.heavy,
    },
    tabItem: {
      flex: 1,
      borderRadius: 28,
    },
    tabItemContent: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    tabItemFocused: {backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 28},
    activeDot: {
      position: 'absolute',
      bottom: 3,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.accent,
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
      letterSpacing: -0.1,
    },
    tabLabelFocused: {
      color: colors.accent,
    },
    tabLabelMuted: {
      color: colors.textMuted,
    },
  });
}
