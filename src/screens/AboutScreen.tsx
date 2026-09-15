/**
 * AboutScreen — App information, version, features, and architecture
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {triggerHaptic} from '../utils/haptics';
import BrandLogo from '../components/BrandLogo';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AboutTapPay'>;
};

export default function AboutScreen({navigation}: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* App Header */}
      <View style={styles.appHeader}>
        <BrandLogo size={76} style={{marginBottom: 14}} />
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
          <View style={[styles.featureTagBadge, {backgroundColor: 'rgba(131, 110, 249, 0.15)'}]}>
            <Text style={[styles.featureTagText, {color: '#836EF9'}]}>NFC</Text>
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
          <View style={[styles.featureTagBadge, {backgroundColor: 'rgba(59, 130, 246, 0.15)'}]}>
            <Text style={[styles.featureTagText, {color: '#3B82F6'}]}>@</Text>
          </View>
          <View style={styles.featureMeta}>
            <Text style={styles.featureTitle}>Username Pay</Text>
            <Text style={styles.featureDesc}>
              Pay direct to human-readable handles registered on Monad Testnet
            </Text>
          </View>
        </View>

        <View style={styles.featureDivider} />

        <View style={styles.featureRow}>
          <View style={[styles.featureTagBadge, {backgroundColor: 'rgba(16, 185, 129, 0.15)'}]}>
            <Text style={[styles.featureTagText, {color: '#10B981'}]}>KEY</Text>
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
          <View style={[styles.featureTagBadge, {backgroundColor: 'rgba(245, 158, 11, 0.15)'}]}>
            <Text style={[styles.featureTagText, {color: '#F59E0B'}]}>TPS</Text>
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

      {/* Built On */}
      <Text style={styles.sectionHeader}>BUILT ON</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.linkRow}
          activeOpacity={0.7}
          onPress={() => {
            triggerHaptic.impactMedium();
            Linking.openURL('https://monad.xyz');
          }}>
          <View style={styles.linkLeft}>
            <View style={[styles.featureTagBadge, {backgroundColor: 'rgba(131, 110, 249, 0.15)'}]}>
              <Text style={[styles.featureTagText, {color: '#836EF9'}]}>MND</Text>
            </View>
            <View>
              <Text style={styles.linkTitle}>Monad Blockchain</Text>
              <Text style={styles.linkSubtitle}>monad.xyz</Text>
            </View>
          </View>
          <Text style={styles.chevron}>↗</Text>
        </TouchableOpacity>

        <View style={styles.featureDivider} />

        <TouchableOpacity
          style={styles.linkRow}
          activeOpacity={0.7}
          onPress={() => {
            triggerHaptic.impactMedium();
            Linking.openURL('https://docs.monad.xyz');
          }}>
          <View style={styles.linkLeft}>
            <View style={[styles.featureTagBadge, {backgroundColor: 'rgba(59, 130, 246, 0.15)'}]}>
              <Text style={[styles.featureTagText, {color: '#3B82F6'}]}>DOC</Text>
            </View>
            <View>
              <Text style={styles.linkTitle}>Monad Documentation</Text>
              <Text style={styles.linkSubtitle}>docs.monad.xyz</Text>
            </View>
          </View>
          <Text style={styles.chevron}>↗</Text>
        </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090D',
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
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#1E1E2D',
    borderWidth: 1,
    borderColor: '#6E54FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  logoMonogram: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  appName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 14,
  },
  tagline: {
    backgroundColor: '#15151E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#242433',
  },
  taglineText: {
    fontSize: 13,
    color: '#D0D0E8',
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#15151E',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#242433',
    marginBottom: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 6,
  },
  featureTagBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTagText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  featureMeta: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: '#8888AA',
    lineHeight: 16,
  },
  featureDivider: {
    height: 1,
    backgroundColor: '#1E1E30',
    marginVertical: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E30',
  },
  infoKey: {
    color: '#8888AA',
    fontSize: 14,
  },
  infoVal: {
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    marginBottom: 2,
  },
  linkSubtitle: {
    fontSize: 12,
    color: '#836EF9',
  },
  chevron: {
    fontSize: 18,
    color: '#836EF9',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  footerText: {
    fontSize: 13,
    color: '#555566',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#444455',
  },
});
