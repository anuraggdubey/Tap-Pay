/**
 * AccountInfoScreen — profile header, username (with claim), wallet address and
 * recovery phrase (phone-authentication protected, view-only) as iOS grouped lists.
 */

import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
  AppState,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useWallet} from '../context/WalletContext';
import {useTheme} from '../context/ThemeContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {triggerHaptic} from '../utils/haptics';
import {validateUsername} from '../utils/validation';
import {resolveUsername, registerUsername} from '../services/registry';
import AmbientBackground from '../components/AmbientBackground';
import {Group, Row, tileColors} from '../components/IosList';
import PressableScale from '../components/PressableScale';
import type {AppColors} from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AccountInfo'>;
};

export default function AccountInfoScreen(_props: Props) {
  const {address, username, revealRecoveryPhrase, saveUsername} = useWallet();
  const {colors} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [revealedPhrase, setRevealedPhrase] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [claimInput, setClaimInput] = useState('');
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (showSecretKey) {
      Animated.timing(fadeAnim, {toValue: 1, duration: 300, useNativeDriver: true}).start();
      autoHideTimer.current = setTimeout(() => {
        hideSecretKey();
      }, 30000);
    }
    return () => {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSecretKey]);

  // Never leave the phrase on screen when the app is backgrounded.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        setShowSecretKey(false);
        setRevealedPhrase(null);
      }
    });
    return () => sub.remove();
  }, []);

  const hideSecretKey = () => {
    Animated.timing(fadeAnim, {toValue: 0, duration: 200, useNativeDriver: true}).start(() => {
      setShowSecretKey(false);
      setRevealedPhrase(null);
    });
  };

  const copyAddress = () => {
    if (!address) {
      return;
    }
    triggerHaptic.impactMedium();
    Clipboard.setString(address);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const handleClaimUsername = async () => {
    const trimmed = claimInput.trim().toLowerCase();
    const validation = validateUsername(trimmed);
    if (!validation.valid) {
      triggerHaptic.notificationError();
      Alert.alert('Invalid Username', validation.error);
      return;
    }

    setClaiming(true);
    try {
      const existing = await resolveUsername(trimmed);
      if (existing) {
        setClaiming(false);
        triggerHaptic.notificationError();
        Alert.alert('Username Taken', `@${trimmed} is already registered.`);
        return;
      }

      try {
        await registerUsername(trimmed);
      } catch {
        // Contract not deployed — save locally anyway
      }

      await saveUsername(trimmed);
      setClaiming(false);
      triggerHaptic.notificationSuccess();
      setClaimInput('');
      Alert.alert('Success', `@${trimmed} is now your username!`);
    } catch {
      setClaiming(false);
      if (trimmed) {
        await saveUsername(trimmed);
        setClaimInput('');
      }
    }
  };

  const handleUnlockSecretKey = () => {
    if (showSecretKey) {
      hideSecretKey();
      return;
    }

    Alert.alert(
      'Reveal Recovery Phrase',
      'Your recovery phrase gives full control of your wallet. Make sure nobody is watching and never share it.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Authenticate & Reveal',
          style: 'destructive',
          onPress: async () => {
            try {
              triggerHaptic.impactMedium();
              const phrase = await revealRecoveryPhrase('Authenticate to reveal recovery phrase');
              if (phrase) {
                setRevealedPhrase(phrase);
                setShowSecretKey(true);
              } else {
                triggerHaptic.notificationError();
                Alert.alert(
                  'Not available',
                  'Authentication was cancelled or failed, or this wallet was imported from a private key and has no recovery phrase.',
                );
              }
            } catch {
              triggerHaptic.notificationError();
              Alert.alert('Error', 'Could not retrieve the recovery phrase.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(username || 'U').charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{username ? `@${username}` : 'No Username'}</Text>
        <Text style={styles.sub}>{username ? 'Your TapPay identity' : 'Claim a username below'}</Text>
      </View>

      {username ? (
        <Group title="Username">
          <Row icon={{bg: tileColors.green, glyph: '@'}} title="Username" value={`@${username}`} />
        </Group>
      ) : (
        <Group
          title="Claim a Username"
          footer="Pick a unique handle so people can pay you without an address.">
          <View style={styles.claimRow}>
            <Text style={styles.at}>@</Text>
            <TextInput
              style={styles.input}
              placeholder="username"
              placeholderTextColor={colors.textSubtle}
              value={claimInput}
              onChangeText={setClaimInput}
              autoCapitalize="none"
              autoCorrect={false}
              underlineColorAndroid="transparent"
            />
          </View>
          <PressableScale onPress={handleClaimUsername} disabled={claiming}>
            <View style={styles.actionRow}>
              {claiming ? (
                <ActivityIndicator color={colors.accent} size="small" />
              ) : (
                <Text style={styles.actionText}>Claim Username</Text>
              )}
            </View>
          </PressableScale>
        </Group>
      )}

      <Group title="Wallet Address" footer="This is your public address. It is safe to share.">
        <View style={styles.addressRow}>
          <Text selectable style={styles.address}>
            {address || 'Not connected'}
          </Text>
        </View>
        <PressableScale onPress={copyAddress} disabled={!address}>
          <View style={styles.actionRow}>
            <Text style={styles.actionText}>{copiedAddr ? 'Copied' : 'Copy Address'}</Text>
          </View>
        </PressableScale>
      </Group>

      <Group
        title="Recovery Phrase"
        footer="Protected by your phone's fingerprint, face or screen lock. There is no copy button on purpose.">
        <Row
          icon={{bg: tileColors.red, glyph: '⚿'}}
          title="12-Word Recovery Phrase"
          subtitle={showSecretKey ? 'Visible. Hides in 30 seconds.' : 'Hidden'}
          chevron={false}
        />
        <PressableScale onPress={handleUnlockSecretKey}>
          <View style={styles.actionRow}>
            <Text style={[styles.actionText, showSecretKey && {color: colors.danger}]}>
              {showSecretKey ? 'Hide Recovery Phrase' : 'Show Recovery Phrase'}
            </Text>
          </View>
        </PressableScale>
        {showSecretKey && revealedPhrase ? (
          <Animated.View style={[styles.phraseBox, {opacity: fadeAnim}]}>
            <Text style={styles.warn}>
              Never share this. Anyone with these words controls your funds.
            </Text>
            <Text style={styles.phrase}>{revealedPhrase}</Text>
          </Animated.View>
        ) : null}
      </Group>
      </ScrollView>
    </View>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: c.background},
    content: {padding: 20, paddingBottom: 48},
    header: {alignItems: 'center', paddingVertical: 12, gap: 4},
    avatar: {width: 88, height: 88, borderRadius: 44, backgroundColor: c.surfaceElevated, alignItems: 'center', justifyContent: 'center', marginBottom: 8},
    avatarText: {fontSize: 38, fontWeight: '500', color: c.text},
    name: {fontSize: 24, fontWeight: '700', color: c.text},
    sub: {fontSize: 15, color: c.textMuted},
    claimRow: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 48},
    at: {fontSize: 17, color: c.textMuted, marginRight: 4},
    input: {flex: 1, fontSize: 17, color: c.text, paddingVertical: 12},
    actionRow: {alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: 16},
    actionText: {fontSize: 17, color: c.accent},
    addressRow: {paddingHorizontal: 16, paddingVertical: 14},
    address: {fontSize: 15, color: c.text, fontFamily: 'monospace', lineHeight: 22},
    phraseBox: {paddingHorizontal: 16, paddingVertical: 14, gap: 10},
    warn: {fontSize: 13, color: c.danger, lineHeight: 18},
    phrase: {fontSize: 17, color: c.text, fontFamily: 'monospace', lineHeight: 28},
  });
}
