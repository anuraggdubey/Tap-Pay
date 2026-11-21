/**
 * WalletSetupScreen — wallet onboarding secured by the phone's own authentication.
 *
 * Flow: create wallet (key stored in the Android Keystore behind fingerprint / face / screen lock)
 *   -> write down 12-word recovery phrase -> verify 3 words -> optional @username -> enter app.
 * Or restore from a recovery phrase (or, advanced, a raw private key).
 *
 * Rules enforced here and in services/wallet.ts:
 *  - One wallet per device. Creating/restoring is refused while a wallet exists.
 *  - No fallbacks: no screen lock / no secure hardware = clear error, no wallet.
 *  - The recovery phrase is shown only after phone authentication, is never copyable and is
 *    cleared from memory state once the backup is verified.
 */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
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
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useWallet} from '../context/WalletContext';
import {useTheme} from '../context/ThemeContext';
import type {AppColors} from '../theme';
import {RootStackParamList} from '../navigation/AppNavigator';
import {validateUsername} from '../utils/validation';
import {registerUsername} from '../services/registry';
import {WalletError} from '../services/wallet';
import {
  RECOVERY_WORD_COUNT,
  normalizeMnemonic,
  pickVerificationIndices,
  verifyRecoveryAnswers,
} from '../utils/recovery';
import {triggerHaptic} from '../utils/haptics';
import WelcomeHero from '../components/WelcomeHero';
import PressableScale from '../components/PressableScale';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WalletSetup'>;
};

type Step =
  | 'welcome'
  | 'locked'
  | 'resume'
  | 'phrase'
  | 'verify'
  | 'username'
  | 'restore'
  | 'import';

function errorMessage(error: unknown): string {
  if (error instanceof WalletError) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

export default function WalletSetupScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const {
    isInitialized,
    backupVerified,
    walletLocked,
    createWallet,
    restoreFromPhrase,
    importPrivateKey,
    markBackupVerified,
    revealRecoveryPhrase,
    unlockWallet,
    resetWallet,
    saveUsername,
  } = useWallet();
  const {colors} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [step, setStep] = useState<Step>(() => {
    if (walletLocked) {
      return 'locked';
    }
    if (isInitialized && !backupVerified) {
      return 'resume';
    }
    return 'welcome';
  });
  const [phrase, setPhrase] = useState('');
  const [verifyIndices, setVerifyIndices] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [verifyError, setVerifyError] = useState('');
  const [restoreInput, setRestoreInput] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [resumeFailed, setResumeFailed] = useState(false);

  const words = useMemo(
    () => (phrase ? normalizeMnemonic(phrase).split(' ') : []),
    [phrase],
  );

  const enterApp = useCallback(() => {
    triggerHaptic.notificationSuccess();
    navigation.replace('MainTabs');
  }, [navigation]);

  // Resume an unfinished backup (app was closed after the wallet was created).
  const loadPhraseForBackup = useCallback(async () => {
    setResumeFailed(false);
    const stored = await revealRecoveryPhrase('Confirm to back up your recovery phrase');
    if (stored) {
      setPhrase(stored);
      setStep('phrase');
    } else {
      setResumeFailed(true);
    }
  }, [revealRecoveryPhrase]);

  useEffect(() => {
    if (step === 'resume') {
      loadPhraseForBackup();
    }
  }, [step, loadPhraseForBackup]);

  // After a successful unlock of an existing wallet, continue where the user left off.
  useEffect(() => {
    if (step === 'locked' && isInitialized && !walletLocked) {
      if (backupVerified) {
        enterApp();
      } else {
        setStep('resume');
      }
    }
  }, [step, isInitialized, walletLocked, backupVerified, enterApp]);

  // Never leave the phrase in memory state once it is no longer needed.
  useEffect(() => {
    if (step !== 'phrase' && step !== 'verify') {
      setPhrase('');
    }
  }, [step]);

  const handleCreate = async () => {
    if (loading) {
      return;
    }
    triggerHaptic.impactMedium();
    setLoading(true);
    try {
      const created = await createWallet();
      setPhrase(created.mnemonic);
      setStep('phrase');
    } catch (error) {
      triggerHaptic.notificationError();
      Alert.alert('Could not create wallet', errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (loading || !restoreInput.trim()) {
      return;
    }
    triggerHaptic.impactMedium();
    setLoading(true);
    try {
      await restoreFromPhrase(restoreInput);
      setRestoreInput('');
      enterApp();
    } catch (error) {
      triggerHaptic.notificationError();
      Alert.alert('Restore failed', errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleImportKey = async () => {
    if (loading || !privateKeyInput.trim()) {
      return;
    }
    triggerHaptic.impactMedium();
    setLoading(true);
    try {
      await importPrivateKey(privateKeyInput);
      setPrivateKeyInput('');
      enterApp();
    } catch (error) {
      triggerHaptic.notificationError();
      Alert.alert('Import failed', errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handlePhraseWritten = () => {
    triggerHaptic.selection();
    setVerifyIndices(pickVerificationIndices(RECOVERY_WORD_COUNT));
    setAnswers({});
    setVerifyError('');
    setStep('verify');
  };

  const handleVerify = async () => {
    if (!verifyRecoveryAnswers(phrase, verifyIndices, answers)) {
      triggerHaptic.notificationError();
      setVerifyError('Those words do not match. Check your written phrase and try again.');
      return;
    }
    try {
      await markBackupVerified();
      triggerHaptic.notificationSuccess();
      setAnswers({});
      setStep('username');
    } catch {
      Alert.alert('Error', 'Could not save your backup status. Please try again.');
    }
  };

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
        triggerHaptic.notificationError();
        if (result.suggestions && result.suggestions.length > 0) {
          setSuggestions(result.suggestions);
          Alert.alert('Username Taken', `@${trimmed} is taken. Try one of the suggestions below.`);
        } else {
          Alert.alert('Registration Failed', result.error);
        }
        return;
      }

      await saveUsername(trimmed);
      enterApp();
    } catch {
      triggerHaptic.notificationError();
      Alert.alert('Registration Failed', 'Could not register the username. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetExisting = () => {
    triggerHaptic.notificationError();
    Alert.alert(
      'Reset wallet on this device?',
      'This permanently removes the wallet from this phone. You can only get it back with your 12-word recovery phrase. Funds are lost if you do not have it.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset wallet',
          style: 'destructive',
          onPress: async () => {
            try {
              const done = await resetWallet();
              if (done) {
                setStep('welcome');
              } else {
                Alert.alert('Reset failed', 'Could not remove the wallet. Please try again.');
              }
            } catch (error) {
              Alert.alert('Wallet not reset', errorMessage(error));
            }
          },
        },
      ],
    );
  };

  // ── Wallet exists but could not be unlocked ──────────────────────────────
  if (step === 'locked') {
    return (
      <View style={[styles.screenWrapper, {paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20}]}>
        <View style={styles.innerContent}>
          <Text style={styles.stepIndicator}>WALLET LOCKED</Text>
          <Text style={styles.viewTitle}>Unlock your wallet</Text>
          <Text style={styles.viewSubtitle}>
            A wallet is already set up on this phone, but it could not be unlocked. Confirm with your
            fingerprint, face or screen lock. If your phone's biometrics changed, the key may be
            permanently locked and you will need your recovery phrase.
          </Text>
        </View>
        <View style={styles.bottomCtaSection}>
          <TouchableOpacity
            style={styles.primaryPillButton}
            onPress={unlockWallet}
            activeOpacity={0.85}>
            <Text style={styles.primaryPillText}>Unlock</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryTextButton}
            onPress={handleResetExisting}
            activeOpacity={0.7}>
            <Text style={styles.dangerText}>Reset wallet on this device</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Resume unfinished backup ─────────────────────────────────────────────
  if (step === 'resume') {
    return (
      <View style={[styles.screenWrapper, {paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20}]}>
        <View style={styles.innerContent}>
          <Text style={styles.stepIndicator}>FINISH SETUP</Text>
          <Text style={styles.viewTitle}>Back up your wallet</Text>
          <Text style={styles.viewSubtitle}>
            You have not confirmed your recovery phrase yet. You must back it up before using TapPay.
          </Text>
          {!resumeFailed && <ActivityIndicator color={colors.accent} />}
        </View>
        {resumeFailed && (
          <View style={styles.bottomCtaSection}>
            <TouchableOpacity
              style={styles.primaryPillButton}
              onPress={loadPhraseForBackup}
              activeOpacity={0.85}>
              <Text style={styles.primaryPillText}>Authenticate and continue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryTextButton}
              onPress={handleResetExisting}
              activeOpacity={0.7}>
              <Text style={styles.dangerText}>Reset wallet on this device</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ── Recovery phrase (shown once) ─────────────────────────────────────────
  if (step === 'phrase') {
    return (
      <View style={[styles.screenWrapper, {paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20}]}>
        <ScrollView contentContainerStyle={styles.innerContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepIndicator}>STEP 1 OF 2</Text>
          <Text style={styles.viewTitle}>Your recovery phrase</Text>
          <Text style={styles.viewSubtitle}>
            Write these 12 words on paper, in order. It is the only way to recover your wallet if you
            lose or reset this phone. Never share it, never photograph it, never type it anywhere
            except TapPay's restore screen.
          </Text>

          <View style={styles.wordGrid}>
            {words.map((word, i) => (
              <View key={`${i}-${word}`} style={styles.wordCell}>
                <Text style={styles.wordIndex}>{i + 1}</Text>
                <Text style={styles.wordText}>{word}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.primaryPillButton}
            onPress={handlePhraseWritten}
            activeOpacity={0.85}>
            <Text style={styles.primaryPillText}>I have written it down</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Verify 3 random words ────────────────────────────────────────────────
  if (step === 'verify') {
    return (
      <View style={[styles.screenWrapper, {paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20}]}>
        <ScrollView
          contentContainerStyle={styles.innerContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => setStep('phrase')} style={styles.backButton} activeOpacity={0.7}>
            <Text style={styles.backText}>← Show phrase again</Text>
          </TouchableOpacity>
          <Text style={styles.stepIndicator}>STEP 1 OF 2</Text>
          <Text style={styles.viewTitle}>Confirm your backup</Text>
          <Text style={styles.viewSubtitle}>Enter the requested words from your written phrase.</Text>

          {verifyIndices.map(index => (
            <View key={index}>
              <Text style={styles.wordPrompt}>Word #{index + 1}</Text>
              <TextInput
                style={styles.wordInput}
                value={answers[index] ?? ''}
                onChangeText={text => {
                  setVerifyError('');
                  setAnswers(prev => ({...prev, [index]: text}));
                }}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                keyboardType="visible-password"
                importantForAutofill="no"
                placeholderTextColor={colors.textSubtle}
                placeholder={`word ${index + 1}`}
                underlineColorAndroid="transparent"
              />
            </View>
          ))}
          {verifyError ? <Text style={styles.errorText}>{verifyError}</Text> : null}

          <TouchableOpacity
            style={styles.primaryPillButton}
            onPress={handleVerify}
            activeOpacity={0.85}>
            <Text style={styles.primaryPillText}>Confirm</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Optional username ────────────────────────────────────────────────────
  if (step === 'username') {
    return (
      <View style={[styles.screenWrapper, {paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20}]}>
        <ScrollView
          contentContainerStyle={styles.innerContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.stepIndicator}>STEP 2 OF 2</Text>
          <Text style={styles.viewTitle}>Choose Username</Text>
          <Text style={styles.viewSubtitle}>
            Your unique Web3 handle on Monad. Friends can send funds directly to @username without messy hex addresses.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.atSymbol}>@</Text>
            <TextInput
              style={styles.usernameInput}
              placeholder="alex"
              placeholderTextColor={colors.textSubtle}
              value={usernameInput}
              onChangeText={text => {
                setUsernameInput(text);
                if (suggestions.length > 0) {
                  setSuggestions([]);
                }
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
                {suggestions.map(suggestion => (
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
            onPress={enterApp}
            activeOpacity={0.7}>
            <Text style={styles.secondaryText}>Skip for now</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Restore from recovery phrase ─────────────────────────────────────────
  if (step === 'restore') {
    return (
      <View style={[styles.screenWrapper, {paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20}]}>
        <ScrollView
          contentContainerStyle={styles.innerContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => setStep('welcome')} style={styles.backButton} activeOpacity={0.7}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.stepIndicator}>RESTORE</Text>
          <Text style={styles.viewTitle}>Recovery phrase</Text>
          <Text style={styles.viewSubtitle}>
            Enter your 12-word recovery phrase, separated by spaces. Your wallet key will be stored
            securely on this phone and protected by your fingerprint, face or screen lock.
          </Text>

          <TextInput
            style={[styles.textInput, styles.phraseInput]}
            placeholder="word1 word2 word3 ..."
            placeholderTextColor={colors.textSubtle}
            value={restoreInput}
            onChangeText={setRestoreInput}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            keyboardType="visible-password"
            importantForAutofill="no"
            underlineColorAndroid="transparent"
          />

          <TouchableOpacity
            style={styles.primaryPillButton}
            onPress={handleRestore}
            disabled={loading || !restoreInput.trim()}
            activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryPillText}>Restore wallet</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Advanced: import a raw private key ───────────────────────────────────
  if (step === 'import') {
    return (
      <View style={[styles.screenWrapper, {paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20}]}>
        <ScrollView
          contentContainerStyle={styles.innerContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => setStep('welcome')} style={styles.backButton} activeOpacity={0.7}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.stepIndicator}>ADVANCED</Text>
          <Text style={styles.viewTitle}>Import private key</Text>
          <Text style={styles.viewSubtitle}>
            Paste a private key to use an existing account on this phone. A wallet imported this way
            has no recovery phrase in TapPay, so keep your key safe elsewhere.
          </Text>

          <TextInput
            style={styles.textInput}
            placeholder="Private key (0x...)"
            placeholderTextColor={colors.textSubtle}
            value={privateKeyInput}
            onChangeText={setPrivateKeyInput}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            secureTextEntry
            importantForAutofill="no"
            underlineColorAndroid="transparent"
          />

          <TouchableOpacity
            style={styles.primaryPillButton}
            onPress={handleImportKey}
            disabled={loading || !privateKeyInput.trim()}
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

  // ── Welcome ──────────────────────────────────────────────────────────────
  return (
    <View style={[styles.welcomeRoot, {paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20}]}>
      <WelcomeHero />
      <View style={styles.welcomeCta}>
        <PressableScale
          style={styles.welcomePrimary}
          contentStyle={styles.welcomePrimaryInner}
          onPress={handleCreate}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={styles.welcomePrimaryText}>Create Wallet</Text>
          )}
        </PressableScale>
        <PressableScale
          style={styles.welcomeSecondary}
          contentStyle={styles.welcomeSecondaryInner}
          onPress={() => setStep('restore')}
          disabled={loading}>
          <Text style={styles.welcomeSecondaryText}>I Have a Recovery Phrase</Text>
        </PressableScale>
        <TouchableOpacity onPress={() => setStep('import')} disabled={loading} activeOpacity={0.7}>
          <Text style={styles.welcomeAdvanced}>Import private key (advanced)</Text>
        </TouchableOpacity>
        <Text style={styles.welcomeFine}>
          Secured by your phone's fingerprint, face or screen lock.
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  welcomeRoot: {flex: 1, backgroundColor: '#000000', paddingHorizontal: 24},
  welcomeCta: {gap: 12, alignItems: 'center'},
  welcomePrimary: {width: '100%', borderRadius: 14, overflow: 'hidden', backgroundColor: '#FFFFFF'},
  welcomePrimaryInner: {height: 52, alignItems: 'center', justifyContent: 'center'},
  welcomePrimaryText: {fontSize: 17, fontWeight: '600', color: '#000000'},
  welcomeSecondary: {width: '100%', borderRadius: 14, backgroundColor: '#1C1C1E'},
  welcomeSecondaryInner: {height: 52, alignItems: 'center', justifyContent: 'center'},
  welcomeSecondaryText: {fontSize: 17, fontWeight: '600', color: '#FFFFFF'},
  welcomeAdvanced: {fontSize: 15, fontWeight: '400', color: '#0A84FF', paddingVertical: 6},
  welcomeFine: {fontSize: 12, color: '#636366', textAlign: 'center'},
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.textMuted,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  welcomeTitle: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.text,
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
    backgroundColor: colors.accent,
    paddingVertical: 18,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  primaryPillText: {
    color: colors.textOnAccent,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  secondaryPillButton: {
    width: '100%',
    backgroundColor: colors.surfaceSolid,
    paddingVertical: 18,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginBottom: 16,
  },
  secondaryPillText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  secondaryTextButton: {
    paddingVertical: 10,
  },
  secondaryText: {
    color: colors.textMuted,
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
    color: colors.accent,
    fontWeight: '600',
  },
  stepIndicator: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSubtle,
    letterSpacing: 1,
    marginBottom: 8,
  },
  viewTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  viewSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: 28,
  },
  textInput: {
    backgroundColor: colors.surfaceSolid,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: colors.text,
    fontSize: 15,
    fontFamily: 'monospace',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSolid,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 24,
  },
  atSymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.accent,
    marginRight: 8,
  },
  usernameInput: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    padding: 0,
    backgroundColor: 'transparent',
  },
  credentialCard: {
    backgroundColor: colors.surfaceSolid,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
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
    color: colors.textSubtle,
    letterSpacing: 0.8,
  },
  copyActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 0.6,
  },
  credentialValueMono: {
    color: colors.text,
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  suggestionsContainer: {
    marginBottom: 24,
  },
  suggestionsTitle: {
    fontSize: 12,
    color: colors.textMuted,
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
    backgroundColor: colors.surfaceSolid,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  suggestionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  welcomeNote: {
    marginTop: 18,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  dangerText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  phraseInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  wordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  wordCell: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSolid,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  wordIndex: {
    width: 24,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  wordText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  wordPrompt: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  wordInput: {
    backgroundColor: colors.surfaceSolid,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 14,
  },
  });
}
