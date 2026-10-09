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
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useWallet} from '../context/WalletContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {validateUsername} from '../utils/validation';
import {resolveUsername, registerUsername, reverseResolveAddress} from '../services/registry';
import {triggerHaptic} from '../utils/haptics';
import BrandLogo from '../components/BrandLogo';
import {register as meraRegister, login as meraLogin, getSessionPrivateKey} from '../services/mera/meraAuth';
import {ethers} from 'ethers';

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
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Step 1: Create New Wallet (via Passkey)
  const handleCreate = async () => {
    triggerHaptic.impactMedium();
    setLoading(true);

    const result = await meraRegister('TapPay User');
    if (result.address && !result.error) {
      const pkBytes = getSessionPrivateKey();
      if (pkBytes) {
        const pkHex = ethers.hexlify(pkBytes);
        const success = await importWallet(pkHex); // Save securely to device
        if (success) {
          setNewPrivateKey(pkHex);
          setNewAddress(result.address);
          setLoading(false);
          setStep('username');
          return;
        }
      }
    }

    setLoading(false);
    triggerHaptic.notificationError();
    Alert.alert('Registration Failed', result.error || 'Could not create secure passkey wallet.');
  };

  // Step 1 Alternate: Login (via Passkey)
  const handleLogin = async () => {
    triggerHaptic.impactMedium();
    setLoading(true);

    const result = await meraLogin();
    if (result.address && !result.error) {
      const pkBytes = getSessionPrivateKey();
      if (pkBytes) {
        const pkHex = ethers.hexlify(pkBytes);
        const success = await importWallet(pkHex);
        if (success) {
          // Try to recover existing username from Supabase
          try {
            const existingUsername = await reverseResolveAddress(result.address);
            if (existingUsername) {
              await saveUsername(existingUsername);
            }
          } catch {
            // Ignore
          }
          setLoading(false);
          triggerHaptic.notificationSuccess();
          navigation.replace('MainTabs');
          return;
        }
      }
    }

    setLoading(false);
    triggerHaptic.notificationError();
    Alert.alert('Login Failed', result.error || 'Could not authenticate passkey.');
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
    setSuggestions([]);

    try {
      const result = await registerUsername(trimmed);

      if (result.error) {
        setLoading(false);
        triggerHaptic.notificationError();
        
        if (result.suggestions && result.suggestions.length > 0) {
          setSuggestions(result.suggestions);
          Alert.alert('Username Taken', `@${trimmed} is taken. Try one of the suggestions below.`);
        } else {
          Alert.alert('Registration Failed', result.error);
        }
        return;
      }

      // Always save username locally so it persists
      await saveUsername(trimmed);
      setLoading(false);
      triggerHaptic.notificationSuccess();
      setStep('backup');
    } catch {
      setLoading(false);
      // Save username locally even if network failed
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

  // 1. Manual Import Key Screen
  if (step === 'import') {
    return (
      <View style={[styles.screenWrapper, {paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20}]}>
        <ScrollView contentContainerStyle={styles.innerContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => setStep('welcome')} style={styles.backButton} activeOpacity={0.7}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.stepIndicator}>SECURE IMPORT</Text>
          <Text style={styles.viewTitle}>Import Wallet</Text>
          <Text style={styles.viewSubtitle}>
            Paste your private key below to securely restore your existing account onto this device.
          </Text>

          <TextInput
            style={styles.textInput}
            placeholder="Enter Private Key (0x...)"
            placeholderTextColor="#9AA3B2"
            value={privateKeyInput}
            onChangeText={setPrivateKeyInput}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            underlineColorAndroid="transparent"
          />

          <TouchableOpacity
            style={styles.primaryPillButton}
            onPress={async () => {
              if (!privateKeyInput) return;
              triggerHaptic.impactMedium();
              setLoading(true);
              const success = await importWallet(privateKeyInput.trim());
              setLoading(false);
              if (success) {
                triggerHaptic.notificationSuccess();
                navigation.replace('MainTabs');
              } else {
                triggerHaptic.notificationError();
                Alert.alert('Import Failed', 'Invalid private key. Please check your credentials and try again.');
              }
            }}
            disabled={loading || !privateKeyInput}
            activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryPillText}>Import & Secure</Text>
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
              placeholderTextColor="#9AA3B2"
              value={usernameInput}
              onChangeText={(text) => {
                setUsernameInput(text);
                if (suggestions.length > 0) setSuggestions([]);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              underlineColorAndroid="transparent"
            />
          </View>

          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Suggestions:</Text>
              <View style={styles.suggestionsList}>
                {suggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    style={styles.suggestionChip}
                    onPress={() => setUsernameInput(suggestion)}>
                    <Text style={styles.suggestionText}>@{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.primaryPillButton}
            onPress={handleClaimUsername}
            disabled={loading}
            activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
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
        <BrandLogo size={56} color="#0A84FF" style={{marginBottom: 30}} />

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
            <ActivityIndicator color="#0A84FF" />
          ) : (
            <Text style={styles.primaryPillText}>Create Account (Passkey)</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryPillButton}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}>
          <Text style={styles.secondaryPillText}>Log In (Passkey)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryTextButton}
          onPress={() => setStep('import')}
          disabled={loading}
          activeOpacity={0.7}>
          <Text style={styles.secondaryText}>Restore with Private Key</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#EEF3FA',
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
    color: '#6B7280',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  welcomeTitle: {
    fontSize: 56,
    fontWeight: '800',
    color: '#0B1220',
    letterSpacing: -1.8,
    lineHeight: 60,
  },
  bottomCtaSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryPillButton: {
    width: '100%',
    backgroundColor: '#0A84FF',
    paddingVertical: 18,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  primaryPillText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  secondaryPillButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.18)',
    marginBottom: 16,
  },
  secondaryPillText: {
    color: '#0B1220',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  secondaryTextButton: {
    paddingVertical: 10,
  },
  secondaryText: {
    color: '#6B7280',
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
    color: '#0A84FF',
    fontWeight: '600',
  },
  stepIndicator: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9AA3B2',
    letterSpacing: 1,
    marginBottom: 8,
  },
  viewTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0B1220',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  viewSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 28,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 40, 80, 0.12)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: '#0B1220',
    fontSize: 15,
    fontFamily: 'monospace',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 40, 80, 0.12)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 24,
  },
  atSymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0A84FF',
    marginRight: 8,
  },
  usernameInput: {
    flex: 1,
    color: '#0B1220',
    fontSize: 17,
    fontWeight: '600',
    padding: 0,
    backgroundColor: '#FFFFFF',
  },
  credentialCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 40, 80, 0.12)',
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
    color: '#9AA3B2',
    letterSpacing: 0.8,
  },
  copyActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34C759',
    letterSpacing: 0.6,
  },
  credentialValueMono: {
    color: '#0B1220',
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  suggestionsContainer: {
    marginBottom: 24,
  },
  suggestionsTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(10, 132, 255, 0.18)',
  },
  suggestionText: {
    color: '#0B1220',
    fontSize: 14,
    fontWeight: '600',
  },
});
