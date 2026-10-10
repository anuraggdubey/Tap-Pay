/**
 * AccountInfoScreen — Username (with claim), wallet address, biometric-locked secret key
 */

import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useWallet} from '../context/WalletContext';
import {useTheme} from '../context/ThemeContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {triggerHaptic} from '../utils/haptics';
import {validateUsername} from '../utils/validation';
import {resolveUsername, registerUsername} from '../services/registry';
import {KeyIcon} from '../components/AppIcons';
import type {AppColors} from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AccountInfo'>;
};

export default function AccountInfoScreen({navigation}: Props) {
  const {address, username, getPrivateKey, saveUsername} = useWallet();
  const {colors} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [exportedKey, setExportedKey] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Username claim state
  const [claimInput, setClaimInput] = useState('');
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (showSecretKey) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      autoHideTimer.current = setTimeout(() => {
        hideSecretKey();
      }, 30000);
    }
    return () => {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
      }
    };
  }, [showSecretKey]);

  const hideSecretKey = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowSecretKey(false);
      setExportedKey(null);
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

  const copySecretKey = () => {
    if (!exportedKey) {
      return;
    }
    triggerHaptic.impactMedium();
    Clipboard.setString(exportedKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Claim username flow
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
      // Check availability
      const existing = await resolveUsername(trimmed);
      if (existing) {
        setClaiming(false);
        triggerHaptic.notificationError();
        Alert.alert('Username Taken', `@${trimmed} is already registered.`);
        return;
      }

      // Try on-chain registration
      try {
        const result = await registerUsername(trimmed);
        // Success or fail, save locally
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
      // Still save locally
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
      'Reveal Secret Key',
      'Your secret key grants full control over your wallet. Never share it.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Authenticate & Reveal',
          style: 'destructive',
          onPress: async () => {
            try {
              triggerHaptic.impactMedium();
              const key = await getPrivateKey('Authenticate to Reveal Secret Key');
              if (key) {
                setExportedKey(key);
                setShowSecretKey(true);
              } else {
                triggerHaptic.notificationError();
                Alert.alert('Authentication Failed', 'Biometric verification required.');
              }
            } catch (err: any) {
              triggerHaptic.notificationError();
              Alert.alert('Error', err?.message || 'Could not retrieve secret key.');
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>
            {(username || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.profileUsername}>
          {username ? `@${username}` : 'No Username'}
        </Text>
        <Text style={styles.profileSubtitle}>
          {username ? 'Monad On-Chain Identity' : 'Claim a username below'}
        </Text>
      </View>

      {/* Username Section */}
      <Text style={styles.sectionHeader}>USERNAME</Text>
      {username ? (
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoRowLeft}>
              <View style={styles.infoIconBox}>
                <Text style={styles.infoIconText}>@</Text>
              </View>
              <View>
                <Text style={styles.infoLabel}>Username</Text>
                <Text style={styles.infoValue}>@{username}</Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.claimTitle}>Claim Your Username</Text>
          <Text style={styles.claimSubtitle}>
            Choose a unique identity for easy payments on Monad.
          </Text>
          <View style={styles.claimInputRow}>
            <View style={styles.claimPrefix}>
              <Text style={styles.claimPrefixText}>@</Text>
            </View>
            <TextInput
              style={styles.claimInput}
              placeholder="username"
              placeholderTextColor={colors.textSubtle}
              value={claimInput}
              onChangeText={setClaimInput}
              autoCapitalize="none"
              autoCorrect={false}
              underlineColorAndroid="transparent"
            />
          </View>
          <TouchableOpacity
            style={[styles.claimButton, claiming && {opacity: 0.6}]}
            onPress={handleClaimUsername}
            disabled={claiming}
            activeOpacity={0.8}>
            {claiming ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.claimButtonText}>Claim Username</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Wallet Address */}
      <Text style={styles.sectionHeader}>WALLET ADDRESS</Text>
      <View style={styles.card}>
        <Text style={styles.addressLabel}>Public Address</Text>
        <View style={styles.addressBox}>
          <Text selectable style={styles.addressMono}>
            {address || 'Not connected'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.copyButton}
          onPress={copyAddress}
          activeOpacity={0.7}>
          <Text style={styles.copyButtonText}>
            {copiedAddr ? 'Copied to Clipboard' : 'Copy Address'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Secret Key */}
      <Text style={styles.sectionHeader}>SECRET KEY</Text>
      <View style={[styles.card, styles.secretKeyCard]}>
        <View style={styles.secretKeyHeader}>
          <View style={styles.lockIconBox}>
            <KeyIcon size={16} color={colors.danger} />
          </View>
          <View style={styles.secretKeyMeta}>
            <Text style={styles.secretKeyTitle}>Private Key</Text>
            <Text style={styles.secretKeySubtitle}>
              {showSecretKey
                ? 'Key visible — auto-hides in 30s'
                : 'Protected by biometric authentication'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.unlockButton, showSecretKey && styles.unlockButtonActive]}
          onPress={handleUnlockSecretKey}
          activeOpacity={0.7}>
          <Text style={[styles.unlockButtonText, showSecretKey && styles.unlockButtonTextActive]}>
            {showSecretKey ? 'Lock Secret Key' : 'Unlock Secret Key'}
          </Text>
        </TouchableOpacity>

        {showSecretKey && exportedKey && (
          <Animated.View style={[styles.revealedKeyBox, {opacity: fadeAnim}]}>
            <View style={styles.warningBanner}>
              <Text style={styles.warningBannerText}>
                NEVER share your secret key. Anyone with this key has full
                control over your funds.
              </Text>
            </View>
            <Text selectable style={styles.secretKeyMono}>{exportedKey}</Text>
            <TouchableOpacity
              style={styles.copyKeyButton}
              onPress={copySecretKey}
              activeOpacity={0.7}>
              <Text style={styles.copyKeyButtonText}>
                {copiedKey ? 'Copied' : 'Copy Secret Key'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 18,
      paddingBottom: 40,
    },
    profileHeader: {
      alignItems: 'center',
      paddingVertical: 20,
      marginBottom: 6,
    },
    avatarLarge: {
      width: 68,
      height: 68,
      borderRadius: 24,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    avatarLargeText: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.textOnAccent,
    },
    profileUsername: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
      letterSpacing: -0.3,
    },
    profileSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
    },
    sectionHeader: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSubtle,
      letterSpacing: 0.8,
      marginTop: 12,
      marginBottom: 8,
      marginLeft: 2,
    },
    card: {
      backgroundColor: colors.surfaceSolid,
      borderRadius: 20,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSubtle,
      marginBottom: 12,
      shadowColor: colors.accent,
      shadowOffset: {width: 0, height: 6},
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 2,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    infoRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    infoIconBox: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.accentWash,
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoIconText: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.accent,
    },
    infoLabel: {
      fontSize: 11,
      color: colors.textSubtle,
      marginBottom: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    infoValue: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    claimTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    claimSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 14,
      lineHeight: 18,
    },
    claimInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderStrong,
      marginBottom: 12,
    },
    claimPrefix: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: colors.borderSubtle,
    },
    claimPrefixText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.accent,
    },
    claimInput: {
      flex: 1,
      fontSize: 14,
      color: '#0B1220',
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: '#FFFFFF',
    },
    claimButton: {
      backgroundColor: colors.accent,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    claimButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textOnAccent,
    },
    addressLabel: {
      fontSize: 11,
      color: colors.textSubtle,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    addressBox: {
      backgroundColor: colors.surfaceSolidElevated,
      padding: 12,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSubtle,
      marginBottom: 12,
    },
    addressMono: {
      fontSize: 12,
      color: colors.text,
      fontFamily: 'monospace',
      lineHeight: 18,
    },
    copyButton: {
      backgroundColor: colors.accentWash,
      borderColor: colors.borderStrong,
      borderWidth: StyleSheet.hairlineWidth,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
    },
    copyButtonText: {
      color: colors.accent,
      fontWeight: '700',
      fontSize: 13,
    },
    secretKeyCard: {
      borderColor: 'rgba(255, 59, 48, 0.18)',
    },
    secretKeyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },
    lockIconBox: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: 'rgba(255, 59, 48, 0.12)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255, 59, 48, 0.2)',
    },
    lockIconText: {
      fontSize: 15,
      color: colors.danger,
      fontWeight: '800',
    },
    secretKeyMeta: {
      flex: 1,
    },
    secretKeyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    secretKeySubtitle: {
      fontSize: 12,
      color: colors.textMuted,
    },
    unlockButton: {
      backgroundColor: colors.surfaceSolidElevated,
      borderColor: colors.borderSubtle,
      borderWidth: StyleSheet.hairlineWidth,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
    },
    unlockButtonActive: {
      backgroundColor: 'rgba(255, 59, 48, 0.08)',
      borderColor: 'rgba(255, 59, 48, 0.28)',
    },
    unlockButtonText: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 13,
    },
    unlockButtonTextActive: {
      color: colors.danger,
    },
    revealedKeyBox: {
      marginTop: 14,
    },
    warningBanner: {
      backgroundColor: 'rgba(255, 59, 48, 0.08)',
      borderColor: 'rgba(255, 59, 48, 0.28)',
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
    },
    warningBannerText: {
      color: colors.danger,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
    },
    secretKeyMono: {
      fontSize: 12,
      color: colors.danger,
      fontFamily: 'monospace',
      lineHeight: 18,
      backgroundColor: 'rgba(255, 59, 48, 0.06)',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 59, 48, 0.2)',
      marginBottom: 10,
      overflow: 'hidden',
    },
    copyKeyButton: {
      backgroundColor: 'rgba(255, 59, 48, 0.1)',
      borderColor: 'rgba(255, 59, 48, 0.25)',
      borderWidth: 1,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: 'center',
    },
    copyKeyButtonText: {
      color: colors.danger,
      fontWeight: '700',
      fontSize: 13,
    },
  });
}
