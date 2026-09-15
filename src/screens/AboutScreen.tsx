/**
 * AboutScreen — App information, version, features, and credits
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

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AboutTapPay'>;
};

export default function AboutScreen({navigation}: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* App Header */}
      <View style={styles.appHeader}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>⚡</Text>
        </View>
        <Text style={styles.appName}>TapPay</Text>
        <Text style={styles.appVersion}>Version 0.0.1 (Alpha)</Text>
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
          <View style={styles.featureIconCircle}>
            <Text style={styles.featureIcon}>📱</Text>
          </View>
          <View style={styles.featureMeta}>
            <Text style={styles.featureTitle}>NFC Tap-to-Pay</Text>
            <Text style={styles.featureDesc}>
              Send crypto by tapping phones via NFC HCE
            </Text>
          </View>
        </View>

        <View style={styles.featureDivider} />

        <View style={styles.featureRow}>
          <View style={styles.featureIconCircle}>
            <Text style={styles.featureIcon}>@</Text>
          </View>
          <View style={styles.featureMeta}>
            <Text style={styles.featureTitle}>Username Pay</Text>
            <Text style={styles.featureDesc}>
              Send to human-readable @usernames instead of addresses
            </Text>
          </View>
        </View>

        <View style={styles.featureDivider} />

        <View style={styles.featureRow}>
          <View style={styles.featureIconCircle}>
            <Text style={styles.featureIcon}>🔐</Text>
          </View>
          <View style={styles.featureMeta}>
            <Text style={styles.featureTitle}>Hardware Security</Text>
            <Text style={styles.featureDesc}>
              Keys protected by Android Keystore + Biometrics
            </Text>
          </View>
        </View>

        <View style={styles.featureDivider} />

        <View style={styles.featureRow}>
          <View style={styles.featureIconCircle}>
            <Text style={styles.featureIcon}>⚡</Text>
          </View>
          <View style={styles.featureMeta}>
            <Text style={styles.featureTitle}>Monad Speed</Text>
            <Text style={styles.featureDesc}>
              ~1 second block times with 10,000 TPS throughput
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
            <View style={[styles.featureIconCircle, {backgroundColor: '#836EF920'}]}>
              <Text style={styles.featureIcon}>🟣</Text>
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
            <View style={[styles.featureIconCircle, {backgroundColor: '#3B82F620'}]}>
              <Text style={styles.featureIcon}>📚</Text>
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
          TapPay is an open-source project
        </Text>
        <Text style={styles.footerSubtext}>
          Built for the Monad ecosystem 🟣
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  appHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 8,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#836EF920',
    borderWidth: 2,
    borderColor: '#836EF960',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 40,
  },
  appName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#8888AA',
    fontWeight: '500',
    marginBottom: 16,
  },
  tagline: {
    backgroundColor: '#161622',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#222235',
  },
  taglineText: {
    fontSize: 13,
    color: '#C4B5FD',
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8888AA',
    letterSpacing: 1.5,
    marginTop: 12,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#161622',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#222235',
    marginBottom: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 6,
  },
  featureIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#1E1A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 20,
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
