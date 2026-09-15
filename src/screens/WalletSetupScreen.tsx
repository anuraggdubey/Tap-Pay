/**
 * WalletSetupScreen — 3-Step Onboarding Flow
 * 1. Create or Import Wallet (Android Keystore hardware-backed)
 * 2. Claim Username (Monad on-chain identity)
 * 3. Private Key Backup Warning & Verification
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Clipboard,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useWallet} from '../context/WalletContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {validateUsername} from '../utils/validation';
import {resolveUsername, registerUsername} from '../services/registry';
import {triggerHaptic} from '../utils/haptics';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WalletSetup'>;
};

export default function WalletSetupScreen({navigation}: Props) {
  const {createWallet, importWallet, saveUsername} = useWallet();
  const [step, setStep] = useState<'welcome' | 'import' | 'username' | 'backup'>('welcome');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [newPrivateKey, setNewPrivateKey] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Step 1: Create New Wallet
  const handleCreate = async () => {
    triggerHaptic.impactMedium();
    setLoading(true);
    const wallet = await createWallet();
    setLoading(false);

    if (wallet) {
      setNewPrivateKey(wallet.privateKey);
      setNewAddress(wallet.address);
      // Advance to Step 2: Username Claim
      setStep('username');
    } else {
      triggerHaptic.notificationError();
      Alert.alert('Error', 'Failed to generate secure wallet. Please try again.');
    }
  };

  // Step 1 Alternate: Import Existing Wallet
  const handleImport = async () => {
    if (!privateKeyInput.trim()) {
      Alert.alert('Error', 'Please enter a valid private key.');
      return;
    }

    triggerHaptic.impactMedium();
    setLoading(true);
    const success = await importWallet(privateKeyInput.trim());
    setLoading(false);

    if (success) {
      setNewPrivateKey(privateKeyInput.trim());
      // Advance to Step 2: Username Claim
      setStep('username');
    } else {
      triggerHaptic.notificationError();
      Alert.alert('Error', 'Invalid private key. Please check and try again.');
    }
  };

  // Step 2: Username Claim or Skip
  const handleClaimUsername = async () => {
    const trimmed = usernameInput.trim().toLowerCase();
    const validation = validateUsername(trimmed);
    if (!validation.valid) {
      triggerHaptic.notificationError();
      Alert.alert('Invalid Username', validation.error);
      return;
    }

    triggerHaptic.impactMedium();
    setLoading(true);
    try {
      // Check availability on-chain
      const existing = await resolveUsername(trimmed);
      if (existing) {
        setLoading(false);
        triggerHaptic.notificationError();
        Alert.alert('Username Taken', `@${trimmed} is already registered on Monad. Please choose another.`);
        return;
      }

      // Try to register on-chain
      try {
        await registerUsername(trimmed);
      } catch {
        // On-chain registration failed (contract not deployed, no gas yet, etc.)
        // We'll still save locally
      }

      // Always save username locally so it persists
      await saveUsername(trimmed);

      setLoading(false);
      triggerHaptic.notificationSuccess();
      setStep('backup');
    } catch {
      setLoading(false);
      // Save username locally even if on-chain lookup failed
      if (trimmed) {
        await saveUsername(trimmed);
      }
      setStep('backup');
    }
  };

  const handleSkipUsername = () => {
    triggerHaptic.impactMedium();
    setStep('backup');
  };

  // Step 3: Copy Key & Finish Onboarding
  const handleCopyKey = () => {
    triggerHaptic.impactMedium();
    Clipboard.setString(newPrivateKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleFinishOnboarding = () => {
    triggerHaptic.notificationSuccess();
    navigation.replace('MainTabs');
  };

  // Step 1: Import View
  if (step === 'import') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>IMPORT WALLET</Text>
        </View>
        <Text style={styles.title}>Enter Private Key</Text>
        <Text style={styles.subtitle}>Paste your 64-character hexadecimal key to restore your wallet</Text>

        <TextInput
          style={styles.input}
          placeholder="0x..."
          placeholderTextColor="#555"
          value={privateKeyInput}
          onChangeText={setPrivateKeyInput}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleImport}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Import & Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => setStep('welcome')}>
          <Text style={styles.linkText}>Back to Welcome</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Step 2: Username Claim View
  if (step === 'username') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>STEP 2 OF 3</Text>
        </View>
        <Text style={styles.title}>Claim Your @handle</Text>
        <Text style={styles.subtitle}>
          Choose your unique identity for instant, zero-address payments on Monad.
        </Text>

        <View style={styles.usernameInputWrapper}>
          <Text style={styles.atSymbol}>@</Text>
          <TextInput
            style={styles.usernameInput}
            placeholder="alice"
            placeholderTextColor="#555"
            value={usernameInput}
            onChangeText={setUsernameInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleClaimUsername}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Claim Username</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={handleSkipUsername}>
          <Text style={styles.linkText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Step 3: Private Key Backup Warning View
  if (step === 'backup') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>STEP 3 OF 3</Text>
        </View>
        <Text style={styles.title}>Back Up Secret Key</Text>
        <Text style={styles.subtitle}>
          Your private key is protected by Android Keystore. Save this key offline — if you lose this device, funds cannot be recovered.
        </Text>

        {newAddress ? (
          <View style={styles.keyBox}>
            <Text style={styles.keyLabel}>Your Address</Text>
            <Text style={styles.keyValue} selectable>{newAddress}</Text>
          </View>
        ) : null}

        <View style={styles.keyBox}>
          <Text style={styles.keyLabel}>Your Private Key (Never Share)</Text>
          <Text style={styles.keyValue} selectable>{newPrivateKey}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyKey}>
            <Text style={styles.copyBtnText}>
              {copiedKey ? 'Copied to Clipboard' : 'Copy Private Key'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.warningCard}>
          <View style={styles.warningDot} />
          <Text style={styles.warningText}>
            Store this offline. TapPay never logs or transmits your private key.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleFinishOnboarding}>
          <Text style={styles.buttonText}>I've Saved It — Enter TapPay</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Step 1: Welcome View
  return (
    <View style={styles.container}>
      <View style={styles.welcomeContent}>
        {/* Monad TapPay Brand Emblem */}
        <View style={styles.brandEmblemContainer}>
          <View style={styles.brandOuterRing}>
            <View style={styles.brandInnerCircle}>
              <Text style={styles.brandMonogram}>T</Text>
            </View>
          </View>
        </View>

        <Text style={styles.brandTitle}>TapPay</Text>
        <Text style={styles.brandSubtitle}>
          Near-instant contactless crypto on Monad
        </Text>

        <View style={styles.featurePills}>
          <View style={styles.featurePill}>
            <Text style={styles.featurePillText}>~1s Monad Finality</Text>
          </View>
          <View style={styles.featurePill}>
            <Text style={styles.featurePillText}>NFC HCE & @handle</Text>
          </View>
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleCreate}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Create New Wallet</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => setStep('import')}>
            <Text style={styles.secondaryButtonText}>
              Import Private Key
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  brandEmblemContainer: {
    marginBottom: 24,
  },
  brandOuterRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(131, 110, 249, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(131, 110, 249, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandInnerCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#836EF9',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#836EF9',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  brandMonogram: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  brandSubtitle: {
    fontSize: 15,
    color: '#8A8A9E',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  featurePills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 48,
  },
  featurePill: {
    backgroundColor: 'rgba(131, 110, 249, 0.1)',
    borderColor: 'rgba(131, 110, 249, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  featurePillText: {
    fontSize: 12,
    color: '#A290FB',
    fontWeight: '600',
  },
  actionSection: {
    width: '100%',
  },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(131, 110, 249, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 16,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#836EF9',
    letterSpacing: 1,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(131, 110, 249, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 16,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#836EF9',
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#8A8A9E',
    marginBottom: 28,
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#161622',
    borderRadius: 14,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#242436',
    marginBottom: 24,
    fontFamily: 'monospace',
  },
  usernameInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161622',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#242436',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  atSymbol: {
    fontSize: 20,
    color: '#836EF9',
    fontWeight: '700',
    marginRight: 6,
  },
  usernameInput: {
    flex: 1,
    paddingVertical: 16,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#836EF9',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(131, 110, 249, 0.4)',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#A290FB',
  },
  linkButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  linkText: {
    color: '#8A8A9E',
    fontSize: 14,
    fontWeight: '600',
  },
  keyBox: {
    backgroundColor: '#161622',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#242436',
  },
  keyLabel: {
    fontSize: 12,
    color: '#8A8A9E',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    fontWeight: '600',
  },
  keyValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  copyBtn: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(131, 110, 249, 0.15)',
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 13,
    color: '#836EF9',
    fontWeight: '600',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    gap: 10,
  },
  warningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#F87171',
    lineHeight: 18,
  },
});
