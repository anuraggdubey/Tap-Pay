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
import BrandLogo from '../components/BrandLogo';

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
        {/* Freestanding Unboxed TapPay Brand Emblem */}
        <BrandLogo size={104} style={{marginBottom: 20}} />

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
    backgroundColor: '#09090D',
  },
  content: {
    padding: 22,
    paddingTop: 50,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  featurePills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 44,
  },
  featurePill: {
    backgroundColor: '#15151E',
    borderColor: '#242433',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  featurePillText: {
    fontSize: 11,
    color: '#A1A1AA',
    fontWeight: '600',
  },
  actionSection: {
    width: '100%',
  },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#15151E',
    borderWidth: 1,
    borderColor: '#242433',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 16,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6E54FF',
    letterSpacing: 1,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#15151E',
    borderWidth: 1,
    borderColor: '#242433',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 16,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6E54FF',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 24,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#15151E',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#242433',
    marginBottom: 20,
    fontFamily: 'monospace',
  },
  usernameInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15151E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242433',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  atSymbol: {
    fontSize: 18,
    color: '#6E54FF',
    fontWeight: '700',
    marginRight: 6,
  },
  usernameInput: {
    flex: 1,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#6E54FF',
  },
  secondaryButton: {
    backgroundColor: '#15151E',
    borderWidth: 1,
    borderColor: '#282836',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  linkButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkText: {
    color: '#71717A',
    fontSize: 14,
    fontWeight: '600',
  },
  keyBox: {
    backgroundColor: '#15151E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#242433',
  },
  keyLabel: {
    fontSize: 11,
    color: '#71717A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    fontWeight: '700',
  },
  keyValue: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  copyBtn: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#20202E',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2F2F44',
  },
  copyBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1414',
    borderWidth: 1,
    borderColor: '#382020',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    gap: 10,
  },
  warningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: '#EF4444',
    lineHeight: 16,
  },
});
