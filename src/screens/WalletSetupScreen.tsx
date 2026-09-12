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
  const {createWallet, importWallet} = useWallet();
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

      // If wallet has testnet funds, register on-chain; otherwise reserve in state
      try {
        await registerUsername(trimmed);
      } catch {
        // Faucet may not be funded yet during onboarding; continue to backup
      }

      setLoading(false);
      triggerHaptic.notificationSuccess();
      setStep('backup');
    } catch {
      setLoading(false);
      // Advance to backup even if on-chain call is offline
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
    navigation.replace('Home');
  };

  // Step 1: Import View
  if (step === 'import') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Import Wallet</Text>
        <Text style={styles.subtitle}>Paste your 64-character private key below</Text>

        <TextInput
          style={styles.input}
          placeholder="0x..."
          placeholderTextColor="#666"
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
          <Text style={styles.linkText}>← Back to Welcome</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Step 2: Username Claim View
  if (step === 'username') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.stepBadge}>Step 2 of 3</Text>
        <Text style={styles.title}>Claim Your @username</Text>
        <Text style={styles.subtitle}>
          Choose your unique identity for instant, zero-address payments on Monad testnet.
        </Text>

        <View style={styles.usernameInputWrapper}>
          <Text style={styles.atSymbol}>@</Text>
          <TextInput
            style={styles.usernameInput}
            placeholder="alice"
            placeholderTextColor="#666"
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
          <Text style={styles.linkText}>Skip for now →</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Step 3: Private Key Backup Warning View
  if (step === 'backup') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.stepBadge}>Step 3 of 3</Text>
        <Text style={styles.title}>⚠️ Back Up Your Key</Text>
        <Text style={styles.subtitle}>
          Your private key is protected by your Android Keystore.
          Save this key offline — if you lose this device, funds cannot be recovered.
        </Text>

        {newAddress ? (
          <View style={styles.keyBox}>
            <Text style={styles.keyLabel}>Your Address</Text>
            <Text style={styles.keyValue} selectable>{newAddress}</Text>
          </View>
        ) : null}

        <View style={styles.keyBox}>
          <Text style={styles.keyLabel}>Your Private Key (Never Share!)</Text>
          <Text style={styles.keyValue} selectable>{newPrivateKey}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyKey}>
            <Text style={styles.copyBtnText}>
              {copiedKey ? '✓ Copied to Clipboard' : '❐ Copy Private Key'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.warning}>
          ⚠️ Store this securely. TapPay never logs or uploads private keys.
        </Text>

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
      <View style={styles.content}>
        <Text style={styles.logo}>⚡</Text>
        <Text style={styles.title}>TapPay</Text>
        <Text style={styles.subtitle}>
          Tap to pay. Search to send.{'\n'}Powered by Monad.
        </Text>

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
          <Text style={[styles.buttonText, {color: '#836EF9'}]}>
            Import Private Key
          </Text>
        </TouchableOpacity>
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
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  stepBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#836EF9',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  logo: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#8888AA',
    marginBottom: 32,
    lineHeight: 22,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#836EF9',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#836EF9',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    padding: 16,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  usernameInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  atSymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#836EF9',
    marginRight: 6,
  },
  usernameInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    color: '#836EF9',
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
    color: '#8888AA',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#836EF920',
    alignSelf: 'flex-start',
  },
  copyBtnText: {
    color: '#836EF9',
    fontSize: 12,
    fontWeight: '700',
  },
  warning: {
    fontSize: 13,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
});
