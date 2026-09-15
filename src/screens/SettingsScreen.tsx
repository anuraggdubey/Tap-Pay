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
import {triggerHaptic} from '../utils/haptics';
import {truncateAddress} from '../utils/format';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

interface MenuItemProps {
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  isDestructive?: boolean;
}

function MenuItem({
  icon,
  iconBg,
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
        <View style={[styles.menuIconCircle, {backgroundColor: iconBg}]}>
          <Text style={styles.menuIcon}>{icon}</Text>
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
              {username ? `@${username}` : 'No Username'}
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
          icon="👤"
          iconBg="#836EF920"
          title="Account Info"
          subtitle="Username, address & secret key"
          onPress={() => navigation.navigate('AccountInfo')}
        />
      </View>

      {/* App Section */}
      <Text style={styles.sectionHeader}>APP</Text>
      <View style={styles.menuGroup}>
        <MenuItem
          icon="⚡"
          iconBg="#F59E0B20"
          title="About TapPay"
          subtitle="Version, features & security info"
          onPress={() => navigation.navigate('AboutTapPay')}
        />
        <View style={styles.menuDivider} />
        <MenuItem
          icon="🌐"
          iconBg="#10B98120"
          title="Network"
          subtitle={`${MONAD_CONFIG.chainName} • Chain ${MONAD_CONFIG.chainId}`}
          onPress={() => navigation.navigate('NetworkInfo')}
        />
      </View>

      {/* Danger Zone */}
      <Text style={[styles.sectionHeader, styles.sectionHeaderDanger]}>
        DANGER ZONE
      </Text>
      <View style={[styles.menuGroup, styles.menuGroupDanger]}>
        <MenuItem
          icon="⚠️"
          iconBg="#FF333320"
          title="Reset Wallet"
          subtitle="Remove all wallet data from device"
          onPress={handleResetWallet}
          isDestructive
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>TapPay v0.0.1 • Monad Testnet</Text>
      </View>
    </ScrollView>
  );
}

// Import MONAD_CONFIG for display in menu subtitle
import {MONAD_CONFIG} from '../config/monad';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#161622',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#222235',
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
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#836EF925',
    borderWidth: 2,
    borderColor: '#836EF9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileMeta: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  profileAddress: {
    fontSize: 13,
    color: '#8888AA',
    fontFamily: 'monospace',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8888AA',
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionHeaderDanger: {
    color: '#FF5252',
  },
  menuGroup: {
    backgroundColor: '#161622',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#222235',
    marginBottom: 10,
    overflow: 'hidden',
  },
  menuGroupDanger: {
    borderColor: '#3A1515',
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
    gap: 14,
    flex: 1,
  },
  menuIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
  },
  menuMeta: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  menuTitleDanger: {
    color: '#FF5252',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#8888AA',
  },
  menuSubtitleDanger: {
    color: '#AA4444',
  },
  menuChevron: {
    fontSize: 24,
    color: '#555566',
    fontWeight: '300',
  },
  menuChevronDanger: {
    color: '#AA4444',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#1E1E30',
    marginHorizontal: 16,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#444455',
    fontWeight: '500',
  },
});
