/**
 * WalletSetupScreen — Minimalist High-End Wallet Onboarding
 * Strictly inspired by user reference Image 3 (Fuse Web3 onboarding style).
 * Features massive typography, pure obsidian canvas, freestanding logo,
 * solid white CTA pill, and clean unhighlighted backup verification.
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
import {useSafeAreaInsets} from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const {createWallet, importWallet, saveUsername} = useWallet();
  const [step, setStep] = useState<'welcome' | 'import' | 'username' | 'backup'>('welcome');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [newPrivateKey, setNewPrivateKey] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Step 1: Create New Wallet
  const handleCreate = async () => {
    triggerHaptic.impactMedium();
    setLoading(true);
    const wallet = await createWallet();
    setLoading(false);

    if (wallet) {
      setNewPrivateKey(wallet.privateKey);
      setNewAddress(wallet.address);
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
      setStep('username');
    } else {
      triggerHaptic.notificationError();
      Alert.alert('Error', 'Invalid private key. Please check and try again.');
    }
  };

  // Step 2: Username Claim
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
      const existing = await resolveUsername(trimmed);
      if (existing) {
        setLoading(false);
        triggerHaptic.notificationError();
        Alert.alert('Username Taken', `@${trimmed} is already registered on Monad. Please choose another.`);
        return;
      }

      try {
        await registerUsername(trimmed);
      } catch {
        // On-chain registration fallback
      }

      await saveUsername(trimmed);
      setLoading(false);
      triggerHaptic.notificationSuccess();
      setStep('backup');
    } catch {
      setLoading(false);
      if (trimmed) {
        await saveUsername(trimmed);
      }
      setStep('backup');
    }
  };

  const handleSkipUsername = () => {
    triggerHaptic.selection();
    setStep('backup');
  };

  // Step 3: Copy Key & Finish Onboarding
  const handleCopyKey = () => {
    triggerHaptic.impactMedium();
    Clipboard.setString(newPrivateKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyAddress = () => {
    triggerHaptic.impactMedium();
    Clipboard.setString(newAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleFinishOnboarding = () => {
    triggerHaptic.notificationSuccess();
    navigation.replace('MainTabs');
  };

  // 1. Import Key Screen
  if (step === 'import') {
    return (
      <View style={[styles.screenWrapper, {paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20}]}>
        <ScrollView contentContainerStyle={styles.innerContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep('welcome')}
            activeOpacity={0.7}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>

          <Text style={styles.viewTitle}>Import Wallet</Text>
          <Text style={styles.viewSubtitle}>
            Enter your 64-character private key to restore your wallet on Monad.
          </Text>

          <TextInput
            style={styles.textInput}
            placeholder="0x..."
            placeholderTextColor="#545458"
            value={privateKeyInput}
            onChangeText={setPrivateKeyInput}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.primaryPillButton}
            onPress={handleImport}
            disabled={loading}
            activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.primaryPillText}>Import & Continue</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // 2. Username Claim Screen
  if (step === 'username') {
    return (
      <View style={[styles.screenWrapper, {paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20}]}>
        <ScrollView contentContainerStyle={styles.innerContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepIndicator}>STEP 1 OF 2</Text>
          <Text style={styles.viewTitle}>Choose Username</Text>
          <Text style={styles.viewSubtitle}>
            Your unique Web3 handle on Monad. Friends can send funds directly to @username without messy hex addresses.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.atSymbol}>@</Text>
            <TextInput
              style={styles.usernameInput}
              placeholder="alex"
              placeholderTextColor="#545458"
              value={usernameInput}
              onChangeText={setUsernameInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={styles.primaryPillButton}
            onPress={handleClaimUsername}
            disabled={loading}
            activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.primaryPillText}>Claim Username</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryTextButton}
            onPress={handleSkipUsername}
            activeOpacity={0.7}>
            <Text style={styles.secondaryText}>Skip for now</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // 3. Private Key Backup Screen (Clean, unhighlighted, high-legibility)
  if (step === 'backup') {
    return (
      <View style={[styles.screenWrapper, {paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20}]}>
        <ScrollView contentContainerStyle={styles.innerContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepIndicator}>STEP 2 OF 2</Text>
          <Text style={styles.viewTitle}>Back Up Credentials</Text>
          <Text style={styles.viewSubtitle}>
            Your keys are secured in Android Keystore. Save your credentials offline. If you lose access to this device, funds cannot be restored.
          </Text>

          {newAddress ? (
            <View style={styles.credentialCard}>
              <View style={styles.credentialHeader}>
                <Text style={styles.credentialLabel}>PUBLIC ADDRESS</Text>
                <TouchableOpacity onPress={handleCopyAddress} activeOpacity={0.7}>
                  <Text style={styles.copyActionText}>
                    {copiedAddress ? 'COPIED' : 'COPY'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.credentialValueMono} selectable>
                {newAddress}
              </Text>
            </View>
          ) : null}

          <View style={styles.credentialCard}>
            <View style={styles.credentialHeader}>
              <Text style={styles.credentialLabel}>PRIVATE KEY (NEVER SHARE)</Text>
              <TouchableOpacity onPress={handleCopyKey} activeOpacity={0.7}>
                <Text style={styles.copyActionText}>
                  {copiedKey ? 'COPIED' : 'COPY'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.credentialValueMono} selectable>
              {newPrivateKey}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryPillButton}
            onPress={handleFinishOnboarding}
            activeOpacity={0.85}>
            <Text style={styles.primaryPillText}>I've Saved It — Enter TapPay</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Step 0: Welcome Screen (Strictly matching Image 3 — Fuse style)
  return (
    <View style={[styles.screenWrapper, {paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20}]}>
      <View style={styles.welcomeHeroContainer}>
        {/* Freestanding Unboxed Minimalist Brand Logo (Top Center) */}
        <BrandLogo size={56} style={{marginBottom: 30}} />

        {/* Massive Fuse-style typography */}
        <Text style={styles.welcomeSubtitle}>Welcome to</Text>
        <Text style={styles.welcomeTitle}>TapPay</Text>
      </View>

      {/* Bottom Action Section */}
      <View style={styles.bottomCtaSection}>
        <TouchableOpacity
          style={styles.primaryPillButton}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={styles.primaryPillText}>Create New Wallet</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryTextButton}
          onPress={() => setStep('import')}
          activeOpacity={0.7}>
          <Text style={styles.secondaryText}>Recover Existing Wallet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  welcomeHeroContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  welcomeTitle: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1.5,
  },
  bottomCtaSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryPillButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  primaryPillText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  secondaryTextButton: {
    paddingVertical: 10,
  },
  secondaryText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
  },
  innerContent: {
    paddingTop: 10,
    paddingBottom: 30,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '600',
  },
  stepIndicator: {
    fontSize: 11,
    fontWeight: '700',
    color: '#636366',
    letterSpacing: 1,
    marginBottom: 8,
  },
  viewTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  viewSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 28,
  },
  textInput: {
    backgroundColor: '#121216',
    borderWidth: 1,
    borderColor: '#22222C',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'monospace',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121216',
    borderWidth: 1,
    borderColor: '#22222C',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 24,
  },
  atSymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },
  usernameInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    padding: 0,
  },
  credentialCard: {
    backgroundColor: '#121216',
    borderWidth: 1,
    borderColor: '#22222C',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
  },
  credentialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  credentialLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#636366',
    letterSpacing: 0.8,
  },
  copyActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#30D158',
    letterSpacing: 0.6,
  },
  credentialValueMono: {
    color: '#E5E7EB',
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});
