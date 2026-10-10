/**
 * AboutScreen — App information, version, features, and architecture
 */

import React, {useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useTheme} from '../context/ThemeContext';
import type {AppColors} from '../theme';
import BrandLogo from '../components/BrandLogo';

import {
  ContactlessWave,
  UserIcon,
  KeyIcon,
  GlobeIcon,
} from '../components/AppIcons';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AboutTapPay'>;
};

export default function AboutScreen({navigation}: Props) {
  const {colors} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* App Header */}
      <View style={styles.appHeader}>
        <View style={styles.logoBox}>
          <BrandLogo size={44} natural />
        </View>
        <Text style={styles.appName}>TapPay</Text>
        <Text style={styles.appVersion}>Version 0.0.1 • Monad Native</Text>
        <View style={styles.tagline}>
          <Text style={styles.taglineText}>
            Tap to pay. Search to send. Powered by Monad.
          </Text>
        </View>
      </View>

      {/* Features */}
      <Text style={styles.sectionHeader}>FEATURES</Text>
      <View style={styles.card}>
        <View style={styles.featureRow}>
          <View style={styles.featureIconBox}>
            <ContactlessWave size={18} color={colors.accent} />
          </View>
          <View style={styles.featureMeta}>
            <Text style={styles.featureTitle}>Contactless Tap-to-Pay</Text>
            <Text style={styles.featureDesc}>
              Send crypto by tapping devices via ISO 7816-4 NFC Host Card Emulation
            </Text>
          </View>
        </View>

        <View style={styles.featureDivider} />

        <View style={styles.featureRow}>
          <View style={styles.featureIconBox}>
            <UserIcon size={18} color={colors.accent} />
          </View>
          <View style={styles.featureMeta}>
            <Text style={styles.featureTitle}>Username Pay</Text>
            <Text style={styles.featureDesc}>
              Pay direct to human-readable handles via TapPay username registry
            </Text>
          </View>
        </View>

        <View style={styles.featureDivider} />

        <View style={styles.featureRow}>
          <View style={styles.featureIconBox}>
            <KeyIcon size={18} color={colors.accent} />
          </View>
          <View style={styles.featureMeta}>
            <Text style={styles.featureTitle}>Hardware Keystore</Text>
            <Text style={styles.featureDesc}>
              Private keys secured in Android Hardware Keystore (TEE) with biometrics
            </Text>
          </View>
        </View>

        <View style={styles.featureDivider} />

        <View style={styles.featureRow}>
          <View style={styles.featureIconBox}>
            <GlobeIcon size={18} color={colors.accent} />
          </View>
          <View style={styles.featureMeta}>
            <Text style={styles.featureTitle}>Monad Throughput</Text>
            <Text style={styles.featureDesc}>
              Sub-second block finality with parallelized EVM execution
            </Text>
          </View>
        </View>
      </View>

      {/* Security */}
      <Text style={styles.sectionHeader}>SECURITY</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Key Storage</Text>
          <Text style={styles.infoVal}>Android Keystore (TEE)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Authentication</Text>
          <Text style={styles.infoVal}>Biometric / Device Passcode</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Encryption</Text>
          <Text style={styles.infoVal}>AES-GCM 256-bit</Text>
        </View>
        <View style={[styles.infoRow, {borderBottomWidth: 0}]}>
          <Text style={styles.infoKey}>Data Policy</Text>
          <Text style={styles.infoVal}>Keys never leave device</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          TapPay • Open-Source Contactless Payments
        </Text>
        <Text style={styles.footerSubtext}>
          Built for the Monad Ecosystem
        </Text>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  appHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 8,
  },
  logoBox: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 14,
  },
  tagline: {
    backgroundColor: colors.surfaceSolid,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  taglineText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSubtle,
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.surfaceSolid,
    borderRadius: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    marginBottom: 10,
    shadowColor: colors.accent,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 6,
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.accentWash,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureMeta: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  featureDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginVertical: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  infoKey: {
    color: colors.textMuted,
    fontSize: 14,
  },
  infoVal: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  linkSubtitle: {
    fontSize: 12,
    color: colors.accent,
  },
  chevron: {
    fontSize: 18,
    color: colors.accent,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  footerText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: colors.textSubtle,
  },
  });
}
