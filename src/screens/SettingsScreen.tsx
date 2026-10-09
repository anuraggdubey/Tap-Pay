/**
 * SettingsScreen — Minimalist Inset-Grouped Settings
 * Strictly inspired by user reference Image 2 (Opal / Apple iOS Settings).
 * Pure geometric vector icons, inset rounded cards, hairlineWidth dividers,
 * and absolutely ZERO emojis or colored tag boxes.
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Clipboard from '@react-native-clipboard/clipboard';

import {useWallet} from '../context/WalletContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {triggerHaptic} from '../utils/haptics';
import {truncateAddress} from '../utils/format';
import {MONAD_CONFIG} from '../config/monad';
import {
  UserIcon,
  WalletCardIcon,
  KeyIcon,
  GlobeIcon,
  InfoIcon,
  PowerIcon,
} from '../components/AppIcons';
import PressableScale from '../components/PressableScale';
import FadeInView from '../components/FadeInView';
import LivePulseDot from '../components/LivePulseDot';
import {colors, glass} from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

interface SettingsRowProps {
  renderIcon: () => React.ReactNode;
  title: string;
  value?: string;
  onPress: () => void;
  isDestructive?: boolean;
}

function SettingsRow({
  renderIcon,
  title,
  value,
  onPress,
  isDestructive = false,
}: SettingsRowProps) {
  return (
    <PressableScale
      style={styles.rowItem}
      contentStyle={styles.rowItemInner}
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
          {renderIcon()}
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
    </PressableScale>
  );
}

export default function SettingsScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const {address, username, resetWallet} = useWallet();
  const [addressCopied, setAddressCopied] = useState(false);

  const copyAddress = () => {
    if (!address) return;
    triggerHaptic.selection();
    Clipboard.setString(address);
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 1800);
  };

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
          {paddingTop: insets.top + 10},
        ]}
        showsVerticalScrollIndicator={false}>
        <FadeInView delay={0} translateY={6}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.pageEyebrow}>TAPPAY</Text>
              <Text style={styles.pageTitle}>Settings</Text>
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={30} translateY={8}>
          <View style={styles.walletCard}>
            <PressableScale
              style={styles.walletCardTop}
              contentStyle={styles.walletCardTopInner}
              onPress={() => navigation.navigate('AccountInfo')}>
              <View style={styles.walletAvatar}>
                <Text style={styles.walletAvatarText}>
                  {(username || 'T').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.walletIdentity}>
                <Text style={styles.walletName} numberOfLines={1}>
                  {username ? `@${username}` : 'TapPay Wallet'}
                </Text>
                <Text style={styles.walletCaption} numberOfLines={1}>
                  Your wallet and identity
                </Text>
              </View>
              <Text style={styles.walletChevron}>›</Text>
            </PressableScale>

            <View style={styles.walletCardDivider} />
            <View style={styles.walletAddressRow}>
              <View style={styles.walletAddressCopy}>
                <Text style={styles.walletAddressLabel}>WALLET ADDRESS</Text>
                <Text style={styles.walletAddressValue} numberOfLines={1}>
                  {address ? truncateAddress(address, 8, 6) : 'Not connected'}
                </Text>
              </View>
              <PressableScale
                style={styles.copyAddressButton}
                contentStyle={styles.copyAddressButtonInner}
                onPress={copyAddress}
                disabled={!address}
                accessibilityLabel="Copy wallet address">
                <Text style={styles.copyAddressButtonText}>
                  {addressCopied ? 'Copied' : 'Copy'}
                </Text>
              </PressableScale>
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={60} translateY={8}>
          <View style={styles.statusCard}>
            <View style={styles.statusCardLeft}>
              <LivePulseDot active size={8} />
              <View>
                <Text style={styles.statusTitle}>{MONAD_CONFIG.chainName}</Text>
                <Text style={styles.statusSubtitle}>
                  Chain ID {MONAD_CONFIG.chainId} • ~1s Finality
                </Text>
              </View>
            </View>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>ACTIVE</Text>
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={80} translateY={8}>
          <Text style={styles.groupHeading}>ACCOUNT</Text>
          <View style={styles.groupCard}>
            <SettingsRow
              renderIcon={() => <UserIcon size={16} color={colors.accent} />}
              title="Profile & Identity"
              value={username ? `@${username}` : 'Claim handle'}
              onPress={() => navigation.navigate('AccountInfo')}
            />
            <View style={styles.divider} />
            <SettingsRow
              renderIcon={() => <WalletCardIcon size={16} color={colors.accent} />}
              title="Wallet Address"
              value={address ? truncateAddress(address, 5, 4) : 'Not linked'}
              onPress={() => navigation.navigate('AccountInfo')}
            />
            <View style={styles.divider} />
            <SettingsRow
              renderIcon={() => <KeyIcon size={16} color={colors.accent} />}
              title="Secret Key"
              value="Encrypted"
              onPress={() => navigation.navigate('AccountInfo')}
            />
          </View>
        </FadeInView>

        <FadeInView delay={120} translateY={8}>
          <Text style={styles.groupHeading}>NETWORK & SYSTEM</Text>
          <View style={styles.groupCard}>
            <SettingsRow
              renderIcon={() => <GlobeIcon size={16} color={colors.accent} />}
              title="Network Details"
              value="RPC Live"
              onPress={() => navigation.navigate('NetworkInfo')}
            />
            <View style={styles.divider} />
            <SettingsRow
              renderIcon={() => <InfoIcon size={16} color={colors.accent} />}
              title="About TapPay"
              value="v0.0.1"
              onPress={() => navigation.navigate('AboutTapPay')}
            />
          </View>
        </FadeInView>

        <FadeInView delay={160} translateY={8}>
          <Text style={styles.groupHeading}>SECURITY</Text>
          <View style={styles.groupCard}>
            <SettingsRow
              renderIcon={() => <PowerIcon size={16} color="#FF453A" />}
              title="Reset Wallet"
              onPress={handleResetWallet}
              isDestructive={true}
            />
          </View>
        </FadeInView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 17,
  },
  pageEyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.8,
  },
  walletCard: {
    backgroundColor: colors.accent,
    borderRadius: 23,
    marginBottom: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0A4C9A',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.16,
        shadowRadius: 16,
      },
      android: {elevation: 4},
      default: {},
    }),
  },
  walletCardTop: {
    minHeight: 78,
  },
  walletCardTopInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    paddingVertical: 15,
    gap: 12,
  },
  walletAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  walletIdentity: {
    flex: 1,
  },
  walletName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  walletCaption: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    marginTop: 3,
  },
  walletChevron: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 25,
    fontWeight: '300',
  },
  walletCardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.27)',
    marginHorizontal: 17,
  },
  walletAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 13,
    gap: 12,
  },
  walletAddressCopy: {
    flex: 1,
    minWidth: 0,
  },
  walletAddressLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.9,
    marginBottom: 3,
  },
  walletAddressValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  copyAddressButton: {
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  copyAddressButtonInner: {
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  copyAddressButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: glass.fillElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderBright,
    borderRadius: 20,
    padding: 16,
    marginBottom: 26,
  },
  statusCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  statusSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  activePill: {
    backgroundColor: colors.accentWash,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.4,
  },
  groupHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSubtle,
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: glass.fillElevated,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
    marginBottom: 22,
    overflow: 'hidden',
  },
  rowItem: {
    minHeight: 52,
  },
  rowItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerDestructive: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  rowTitleDestructive: {
    color: colors.danger,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '400',
  },
  rowChevron: {
    fontSize: 18,
    color: colors.accent,
    fontWeight: '400',
  },
  rowChevronDestructive: {
    color: colors.danger,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginLeft: 56,
  },
});
