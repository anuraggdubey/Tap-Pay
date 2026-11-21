/**
 * InsufficientBalanceModal — iOS-style alert shown when the MON balance is lower than
 * amount + gas. Offers the Monad faucet (when configured) and copying the wallet address.
 */

import React, {useMemo} from 'react';
import {View, Text, Modal, StyleSheet, Linking, Alert} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {MONAD_CONFIG} from '../config/monad';
import {formatMon, truncateAddress} from '../utils/format';
import {useTheme} from '../context/ThemeContext';
import PressableScale from './PressableScale';
import type {AppColors} from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  requiredWei: bigint;
  currentBalanceWei: bigint;
  userAddress: string;
}

export default function InsufficientBalanceModal({
  visible,
  onClose,
  requiredWei,
  currentBalanceWei,
  userAddress,
}: Props) {
  const {colors, isDark} = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const faucetUrl = MONAD_CONFIG.faucetUrl?.trim();

  const handleOpenFaucet = () => {
    if (!faucetUrl) {
      return;
    }
    Linking.openURL(faucetUrl).catch(() => {
      Alert.alert('Error', 'Unable to open faucet URL.');
    });
  };

  const handleCopyAddress = () => {
    Clipboard.setString(userAddress);
    Alert.alert(
      'Address Copied',
      'Your wallet address was copied. Use it to receive MON on Monad Mainnet.',
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>!</Text>
          </View>

          <Text style={styles.title}>Not Enough MON</Text>
          <Text style={styles.subtitle}>
            You do not have enough MON on {MONAD_CONFIG.chainName} to cover this payment and the network fee.
          </Text>

          <View style={styles.breakdown}>
            <View style={styles.row}>
              <Text style={styles.label}>Needed (amount + fee)</Text>
              <Text style={styles.value}>{formatMon(requiredWei)}</Text>
            </View>
            <View style={styles.sep} />
            <View style={styles.row}>
              <Text style={styles.label}>You have</Text>
              <Text style={[styles.value, {color: colors.danger}]}>{formatMon(currentBalanceWei)}</Text>
            </View>
            <View style={styles.sep} />
            <View style={styles.row}>
              <Text style={styles.label}>Your address</Text>
              <Text style={styles.mono}>{truncateAddress(userAddress)}</Text>
            </View>
          </View>

          {faucetUrl ? (
            <PressableScale style={styles.primary} contentStyle={styles.buttonInner} onPress={handleOpenFaucet}>
              <Text style={styles.primaryText}>Get MON (Faucet)</Text>
            </PressableScale>
          ) : null}

          <PressableScale style={styles.secondary} contentStyle={styles.buttonInner} onPress={handleCopyAddress}>
            <Text style={styles.secondaryText}>Copy Wallet Address</Text>
          </PressableScale>

          <PressableScale onPress={onClose} contentStyle={styles.dismiss}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(c: AppColors, isDark: boolean) {
  const glass = isDark ? 'rgba(255,255,255,0.08)' : c.surfaceElevated;
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      backgroundColor: isDark ? 'rgba(40,40,44,0.97)' : '#FFFFFF',
      borderRadius: 32,
      width: '100%',
      maxWidth: 380,
      padding: 22,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.2)' : c.border,
    },
    iconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.danger,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
    },
    iconText: {fontSize: 26, fontWeight: '700', color: '#FFFFFF'},
    title: {fontSize: 22, fontWeight: '700', color: c.text, marginBottom: 6, textAlign: 'center', letterSpacing: 0.3},
    subtitle: {fontSize: 15, color: c.textMuted, textAlign: 'center', lineHeight: 21, marginBottom: 18},
    breakdown: {width: '100%', backgroundColor: glass, borderRadius: 22, paddingHorizontal: 16, marginBottom: 18},
    row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13},
    sep: {height: StyleSheet.hairlineWidth, backgroundColor: c.separator},
    label: {fontSize: 14, color: c.textMuted},
    value: {fontSize: 15, fontWeight: '600', color: c.text},
    mono: {fontSize: 13, color: c.text, fontFamily: 'monospace'},
    primary: {width: '100%', borderRadius: 26, backgroundColor: c.text, marginBottom: 10, overflow: 'hidden'},
    primaryText: {fontSize: 17, fontWeight: '600', color: c.background},
    secondary: {width: '100%', borderRadius: 26, backgroundColor: glass, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.18)' : c.border, marginBottom: 6, overflow: 'hidden'},
    secondaryText: {fontSize: 17, fontWeight: '600', color: c.text},
    buttonInner: {height: 52, alignItems: 'center', justifyContent: 'center'},
    dismiss: {paddingVertical: 10},
    dismissText: {fontSize: 17, color: c.accent},
  });
}
