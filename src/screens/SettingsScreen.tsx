/**
 * SettingsScreen — Minimalist Inset-Grouped Settings
 * Strictly inspired by user reference Image 2 (Opal / Apple iOS Settings).
 * Clean monochromatic icons, inset rounded cards, hairlineWidth dividers,
 * and zero colored tag boxes.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useWallet} from '../context/WalletContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {triggerHaptic} from '../utils/haptics';
import {truncateAddress} from '../utils/format';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

interface SettingsRowProps {
  iconGlyph: string;
  title: string;
  value?: string;
  onPress: () => void;
  isDestructive?: boolean;
}

function SettingsRow({
  iconGlyph,
  title,
  value,
  onPress,
  isDestructive = false,
}: SettingsRowProps) {
  return (
    <TouchableOpacity
      style={styles.rowItem}
      activeOpacity={0.65}
      onPress={() => {
        triggerHaptic.selection();
        onPress();
      }}>
      <View style={styles.rowLeft}>
        <View
          style={[
            styles.iconContainer,
            isDestructive && styles.iconContainerDestructive,
          ]}>
          <Text
            style={[
              styles.iconGlyph,
              isDestructive && styles.iconGlyphDestructive,
            ]}>
            {iconGlyph}
          </Text>
        </View>
        <Text
          style={[styles.rowTitle, isDestructive && styles.rowTitleDestructive]}>
          {title}
        </Text>
      </View>

      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        <Text
          style={[
            styles.rowChevron,
            isDestructive && styles.rowChevronDestructive,
          ]}>
          ›
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const {address, username, resetWallet} = useWallet();

  const handleResetWallet = () => {
    triggerHaptic.notificationError();
    Alert.alert(
      'Reset Wallet',
      'This will remove your wallet credentials and username from this device. Ensure you have backed up your private key.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset Wallet',
          style: 'destructive',
          onPress: async () => {
            await resetWallet();
            navigation.reset({
              index: 0,
              routes: [{name: 'WalletSetup'}],
            });
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 12, paddingBottom: 120},
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Large Clean Title */}
        <Text style={styles.pageTitle}>Settings</Text>

        {/* Network Status Card (Image 2 Top Card) */}
        <View style={styles.statusCard}>
          <View style={styles.statusCardLeft}>
            <View style={styles.statusLiveDot} />
            <View>
              <Text style={styles.statusTitle}>Monad Testnet</Text>
              <Text style={styles.statusSubtitle}>
                Chain ID 10143 • ~1s Finality
              </Text>
            </View>
          </View>
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>ACTIVE</Text>
          </View>
        </View>

        {/* Inset Group 1: ACCOUNT */}
        <Text style={styles.groupHeading}>ACCOUNT</Text>
        <View style={styles.groupCard}>
          <SettingsRow
            iconGlyph="👤"
            title="Profile & Identity"
            value={username ? `@${username}` : 'Claim handle'}
            onPress={() => navigation.navigate('AccountInfo')}
          />
          <View style={styles.divider} />
          <SettingsRow
            iconGlyph="💳"
            title="Wallet Address"
            value={address ? truncateAddress(address, 5, 4) : 'Not linked'}
            onPress={() => navigation.navigate('AccountInfo')}
          />
          <View style={styles.divider} />
          <SettingsRow
            iconGlyph="🔑"
            title="Secret Key"
            value="Encrypted"
            onPress={() => navigation.navigate('AccountInfo')}
          />
        </View>

        {/* Inset Group 2: NETWORK & SYSTEM */}
        <Text style={styles.groupHeading}>NETWORK & SYSTEM</Text>
        <View style={styles.groupCard}>
          <SettingsRow
            iconGlyph="🌐"
            title="Network Details"
            value="RPC Live"
            onPress={() => navigation.navigate('NetworkInfo')}
          />
          <View style={styles.divider} />
          <SettingsRow
            iconGlyph="ℹ"
            title="About TapPay"
            value="v0.0.1"
            onPress={() => navigation.navigate('AboutTapPay')}
          />
        </View>

        {/* Inset Group 3: SECURITY */}
        <Text style={styles.groupHeading}>SECURITY</Text>
        <View style={styles.groupCard}>
          <SettingsRow
            iconGlyph="⏻"
            title="Reset Wallet"
            onPress={handleResetWallet}
            isDestructive={true}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#09090D',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    marginBottom: 16,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#14141E',
    borderWidth: 1,
    borderColor: '#222232',
    borderRadius: 16,
    padding: 16,
    marginBottom: 26,
  },
  statusCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#30D158',
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  activePill: {
    backgroundColor: 'rgba(48, 209, 88, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activePillText: {
    color: '#30D158',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  groupHeading: {
    fontSize: 11,
    fontWeight: '600',
    color: '#636366',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 12,
  },
  groupCard: {
    backgroundColor: '#14141E',
    borderWidth: 1,
    borderColor: '#222232',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerDestructive: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
  },
  iconGlyph: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  iconGlyphDestructive: {
    color: '#FF453A',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  rowTitleDestructive: {
    color: '#FF453A',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowValue: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  rowChevron: {
    fontSize: 20,
    color: '#545458',
    fontWeight: '300',
  },
  rowChevronDestructive: {
    color: '#FF453A',
    opacity: 0.7,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#222232',
    marginLeft: 60,
  },
});
