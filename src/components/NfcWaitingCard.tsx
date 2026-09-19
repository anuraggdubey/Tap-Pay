/**
 * NfcWaitingCard — MoonPay-style waiting modal over a frosted dark backdrop.
 * Pure UI; no NFC / payment logic.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {WalletCardIcon, CrossIcon} from './AppIcons';
import {colors} from '../theme';

type Props = {
  title: string;
  subtitle: string;
  accent?: 'purple' | 'green';
  showSpinner?: boolean;
  onClose?: () => void;
  footer?: React.ReactNode;
};

export default function NfcWaitingCard({
  title,
  subtitle,
  accent = 'purple',
  showSpinner = false,
  onClose,
  footer,
}: Props) {
  const insets = useSafeAreaInsets();
  const accentColor = accent === 'green' ? colors.success : '#7C5CFF';

  return (
    <View style={styles.root}>
      {/* Soft “blurred wallet” backdrop */}
      <View style={styles.backdrop} pointerEvents="none">
        <View style={[styles.blob, styles.blobTL]} />
        <View style={[styles.blob, styles.blobTR]} />
        <View style={[styles.blob, styles.blobBR]} />
        <View style={[styles.blob, styles.blobCenter]} />
        <View style={styles.frost} />
      </View>

      {!!onClose && (
        <TouchableOpacity
          style={[styles.closeBtn, {top: insets.top + 10}]}
          onPress={onClose}
          activeOpacity={0.8}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <CrossIcon size={14} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <View style={[styles.center, {paddingBottom: insets.bottom + 24}]}>
        <View style={styles.card}>
          <View style={[styles.iconRing, {borderColor: `${accentColor}55`}]}>
            <View style={[styles.iconCircle, {backgroundColor: accentColor}]}>
              <WalletCardIcon size={22} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {showSpinner && (
            <ActivityIndicator
              color={accentColor}
              style={{marginTop: 18}}
            />
          )}
        </View>

        {footer}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobTL: {
    width: 220,
    height: 220,
    top: -40,
    left: -60,
    backgroundColor: 'rgba(110, 84, 255, 0.35)',
  },
  blobTR: {
    width: 180,
    height: 180,
    top: 80,
    right: -50,
    backgroundColor: 'rgba(48, 209, 88, 0.18)',
  },
  blobBR: {
    width: 260,
    height: 260,
    bottom: 40,
    right: -80,
    backgroundColor: 'rgba(110, 84, 255, 0.28)',
  },
  blobCenter: {
    width: 300,
    height: 160,
    top: '32%',
    left: '10%',
    backgroundColor: 'rgba(28, 28, 40, 0.9)',
    borderRadius: 28,
  },
  frost: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 8, 12, 0.62)',
  },
  closeBtn: {
    position: 'absolute',
    left: 18,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingTop: 36,
    paddingBottom: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 16},
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 16,
  },
  iconRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});
