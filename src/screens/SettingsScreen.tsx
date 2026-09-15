/**
 * SettingsScreen — Navigation hub for app settings and wallet management
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
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useWallet} from '../context/WalletContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {MONAD_CONFIG} from '../config/monad';
import {triggerHaptic} from '../utils/haptics';
import {truncateAddress} from '../utils/format';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

interface MenuItemProps {
  tag: string;
  tagColor: string;
  tagBg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  isDestructive?: boolean;
}

function MenuItem({
  tag,
  tagColor,
  tagBg,
  title,
  subtitle,
  onPress,
  isDestructive,
}: MenuItemProps) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      activeOpacity={0.6}
      onPress={() => {
        triggerHaptic.impactMedium();
        onPress();
      }}>
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuTagBadge, {backgroundColor: tagBg}]}>
          <Text style={[styles.menuTagText, {color: tagColor}]}>{tag}</Text>
        </View>
        <View style={styles.menuMeta}>
          <Text
            style={[styles.menuTitle, isDestructive && styles.menuTitleDanger]}>
            {title}
          </Text>
          <Text
            style={[
              styles.menuSubtitle,
              isDestructive && styles.menuSubtitleDanger,
            ]}>
            {subtitle}
          </Text>
        </View>
      </View>
      <Text
        style={[styles.menuChevron, isDestructive && styles.menuChevronDanger]}>
        ›
      </Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen({navigation}: Props) {
  const {address, username, resetWallet} = useWallet();

  const handleResetWallet = () => {
    triggerHaptic.notificationError();
    Alert.alert(
      'Reset Wallet',
      'This will remove your wallet credentials and username from this device. Make sure you have backed up your private key!',
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileLeft}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(username || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>
              {username ? `@${username}` : 'No Username Claimed'}
            </Text>
            <Text style={styles.profileAddress}>
              {address ? truncateAddress(address, 6, 4) : 'Not connected'}
            </Text>
          </View>
        </View>
      </View>

      {/* Account Section */}
      <Text style={styles.sectionHeader}>ACCOUNT</Text>
      <View style={styles.menuGroup}>
        <MenuItem
          tag="ID"
          tagColor="#836EF9"
          tagBg="rgba(131, 110, 249, 0.12)"
          title="Account Info"
          subtitle="Username claim, address & secret key"
          onPress={() => navigation.navigate('AccountInfo')}
        />
      </View>

      {/* App Section */}
      <Text style={styles.sectionHeader}>APP</Text>
      <View style={styles.menuGroup}>
        <MenuItem
          tag="TP"
          tagColor="#F59E0B"
          tagBg="rgba(245, 158, 11, 0.12)"
          title="About TapPay"
          subtitle="Architecture, features & security"
          onPress={() => navigation.navigate('AboutTapPay')}
        />
        <View style={styles.menuDivider} />
        <MenuItem
          tag="NET"
          tagColor="#10B981"
          tagBg="rgba(16, 185, 129, 0.12)"
          title="Network"
          subtitle={`${MONAD_CONFIG.chainName} • Chain ${MONAD_CONFIG.chainId}`}
          onPress={() => navigation.navigate('NetworkInfo')}
        />
      </View>

      {/* Danger Zone */}
      <Text style={[styles.sectionHeader, styles.sectionHeaderDanger]}>
        SECURITY ZONE
      </Text>
      <View style={[styles.menuGroup, styles.menuGroupDanger]}>
        <MenuItem
          tag="RST"
          tagColor="#EF4444"
          tagBg="rgba(239, 68, 68, 0.12)"
          title="Reset Wallet"
          subtitle="Remove wallet and credentials from device"
          onPress={handleResetWallet}
          isDestructive
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>TapPay • Monad Testnet</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090D',
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#15151E',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#242433',
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E1E2D',
    borderWidth: 1,
    borderColor: '#6E54FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileMeta: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  profileAddress: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: 'monospace',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionHeaderDanger: {
    color: '#EF4444',
  },
  menuGroup: {
    backgroundColor: '#15151E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#242433',
    marginBottom: 14,
    overflow: 'hidden',
  },
  menuGroupDanger: {
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuTagBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTagText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  menuMeta: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  menuTitleDanger: {
    color: '#EF4444',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
  },
  menuSubtitleDanger: {
    color: '#F87171',
  },
  menuChevron: {
    fontSize: 22,
    color: '#4A4A60',
    fontWeight: '300',
  },
  menuChevronDanger: {
    color: '#EF4444',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#242433',
    marginHorizontal: 16,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#525266',
    fontWeight: '500',
  },
});
