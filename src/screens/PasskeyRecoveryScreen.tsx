/**
 * PasskeyRecoveryScreen — optional passkey backup for the device wallet.
 * The recovery phrase stays the primary backup. Every action here needs phone authentication.
 * No secret is ever shown, copied or logged on this screen.
 */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useWallet} from '../context/WalletContext';
import {useTheme} from '../context/ThemeContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {triggerHaptic} from '../utils/haptics';
import {loadPrivateKey} from '../services/wallet';
import {isPasskeyRecoveryConfigured} from '../config/passkey';
import {
  PasskeyStatus,
  RecoverySecret,
  getPasskeyStatus,
  linkPasskey,
  passkeyErrorMessage,
  removePasskey,
} from '../services/passkeyRecovery';
import {Group, Row, tileColors} from '../components/IosList';
import AmbientBackground from '../components/AmbientBackground';
import PressableScale from '../components/PressableScale';
import type {AppColors} from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PasskeyRecovery'>;
};

function formatDate(iso?: string): string | undefined {
  if (!iso) {
    return undefined;
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleDateString();
}

export default function PasskeyRecoveryScreen(_props: Props) {
  const {address, revealRecoveryPhrase} = useWallet();
  const {colors} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [status, setStatus] = useState<PasskeyStatus>({linked: false});
  const [busy, setBusy] = useState(false);
  const available = isPasskeyRecoveryConfigured();

  const refresh = useCallback(async () => {
    setStatus(await getPasskeyStatus(address));
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const link = async () => {
    if (busy) {
      return;
    }
    if (!address) {
      Alert.alert('No wallet', 'Create or restore a wallet first.');
      return;
    }
    triggerHaptic.impactMedium();
    setBusy(true);
    let secret: RecoverySecret | null = null;
    try {
      // Device authentication happens here. The secret never leaves this function.
      const phrase = await revealRecoveryPhrase('Confirm to set up passkey recovery');
      if (phrase) {
        secret = {t: 'phrase', v: phrase};
      } else {
        const key = await loadPrivateKey('Confirm to set up passkey recovery');
        secret = key ? {t: 'key', v: key} : null;
      }
      if (!secret) {
        Alert.alert('Not confirmed', 'Authentication was cancelled or failed. Nothing was changed.');
        return;
      }
      const next = await linkPasskey(secret, address);
      setStatus(next);
      triggerHaptic.notificationSuccess();
      Alert.alert(
        'Passkey recovery is on',
        'You can now recover this wallet on a new phone with your passkey. Keep your recovery phrase safe too. It is still your primary backup.',
      );
    } catch (error) {
      triggerHaptic.notificationError();
      Alert.alert('Passkey recovery was not set up', passkeyErrorMessage(error));
    } finally {
      secret = null;
      setBusy(false);
    }
  };

  const confirmLink = () => {
    Alert.alert(
      status.linked ? 'Replace your passkey?' : 'Set up passkey recovery?',
      'Your recovery phrase is encrypted with a passkey stored in your Google or Apple account. If you lose this phone, you can recover the wallet with that passkey. Your recovery phrase stays your primary backup.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: status.linked ? 'Replace' : 'Continue', onPress: link},
      ],
    );
  };

  const remove = () => {
    Alert.alert(
      'Remove passkey recovery?',
      'The encrypted copy is deleted. You will only be able to recover this wallet with your recovery phrase.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!address || busy) {
              return;
            }
            setBusy(true);
            try {
              setStatus(await removePasskey(address));
              triggerHaptic.notificationSuccess();
            } catch (error) {
              triggerHaptic.notificationError();
              Alert.alert('Could not remove it', passkeyErrorMessage(error));
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const updated = formatDate(status.updatedAt);

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>⚿</Text>
          </View>
          <Text style={styles.title}>Passkey Recovery</Text>
          <Text style={styles.sub}>
            Recover this wallet on a new phone with your fingerprint or face. Optional. Your recovery
            phrase remains your primary backup.
          </Text>
        </View>

        <Group title="Status">
          <Row
            icon={{bg: status.linked ? tileColors.green : tileColors.gray, glyph: status.linked ? '✓' : '–'}}
            title={!available ? 'Unavailable' : status.linked ? 'Linked' : 'Not set up'}
            subtitle={
              !available
                ? 'Passkey recovery is not available yet.'
                : status.linked && updated
                  ? `Last updated ${updated}`
                  : undefined
            }
            chevron={false}
          />
        </Group>

        {available ? (
          <Group footer="Linking and removing need your fingerprint, face or screen lock. Your key never leaves this phone unencrypted.">
            <PressableScale onPress={confirmLink} disabled={busy} accessibilityLabel="Set up passkey recovery">
              <View style={styles.action}>
                {busy ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <Text style={styles.actionText}>{status.linked ? 'Replace Passkey' : 'Set Up Passkey Recovery'}</Text>
                )}
              </View>
            </PressableScale>
            {status.linked ? (
              <PressableScale onPress={remove} disabled={busy} accessibilityLabel="Remove passkey recovery">
                <View style={styles.action}>
                  <Text style={[styles.actionText, {color: colors.danger}]}>Remove Passkey Recovery</Text>
                </View>
              </PressableScale>
            ) : null}
          </Group>
        ) : null}

        <Group title="How it works">
          <Row title="Encrypted on this phone" subtitle="Your recovery phrase is locked with a key only your passkey can unlock." chevron={false} />
          <Row title="Recover anywhere" subtitle="On a new phone choose Recover with Passkey on the welcome screen." chevron={false} />
          <Row title="Phrase still matters" subtitle="Keep your 12 words safe. Passkey recovery is a second way back in." chevron={false} />
        </Group>
      </ScrollView>
    </View>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: c.background},
    content: {padding: 20, paddingBottom: 48},
    header: {alignItems: 'center', paddingVertical: 12, gap: 6},
    badge: {width: 72, height: 72, borderRadius: 18, backgroundColor: '#0A84FF', alignItems: 'center', justifyContent: 'center'},
    badgeText: {fontSize: 34, color: '#FFFFFF'},
    title: {fontSize: 24, fontWeight: '700', color: c.text, marginTop: 6},
    sub: {fontSize: 15, color: c.textMuted, textAlign: 'center', lineHeight: 21, maxWidth: 320},
    action: {alignItems: 'center', justifyContent: 'center', minHeight: 50, paddingHorizontal: 16},
    actionText: {fontSize: 17, color: c.accent},
  });
}
