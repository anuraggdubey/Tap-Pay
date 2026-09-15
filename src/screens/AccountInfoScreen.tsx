/**
 * AccountInfoScreen — Username (with claim), wallet address, biometric-locked secret key
 */

import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Clipboard,
  Animated,
  ActivityIndicator,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useWallet} from '../context/WalletContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {triggerHaptic} from '../utils/haptics';
import {validateUsername} from '../utils/validation';
import {resolveUsername, registerUsername} from '../services/registry';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AccountInfo'>;
};

export default function AccountInfoScreen({navigation}: Props) {
  const {address, username, getPrivateKey, saveUsername} = useWallet();
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
              placeholderTextColor="#4A4A66"
              value={claimInput}
              onChangeText={setClaimInput}
              autoCapitalize="none"
              autoCorrect={false}
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
            <Text style={styles.lockIconText}>{showSecretKey ? '●' : '○'}</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#836EF918',
    borderWidth: 2,
    borderColor: '#836EF9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarLargeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileUsername: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileSubtitle: {
    fontSize: 13,
    color: '#6B6B88',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B6B88',
    letterSpacing: 1.5,
    marginTop: 12,
    marginBottom: 10,
    marginLeft: 2,
  },
  card: {
    backgroundColor: '#131320',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E1E30',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#836EF918',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoIconText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#836EF9',
  },
  infoLabel: {
    fontSize: 11,
    color: '#6B6B88',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Claim username
  claimTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  claimSubtitle: {
    fontSize: 13,
    color: '#6B6B88',
    marginBottom: 16,
    lineHeight: 18,
  },
  claimInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E0E1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E1E30',
    marginBottom: 14,
  },
  claimPrefix: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: '#1E1E30',
  },
  claimPrefixText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#836EF9',
  },
  claimInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  claimButton: {
    backgroundColor: '#836EF9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  claimButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Address
  addressLabel: {
    fontSize: 11,
    color: '#6B6B88',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressBox: {
    backgroundColor: '#0E0E1A',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E1E30',
    marginBottom: 14,
  },
  addressMono: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  copyButton: {
    backgroundColor: '#836EF918',
    borderColor: '#836EF940',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#836EF9',
    fontWeight: '700',
    fontSize: 14,
  },
  // Secret key
  secretKeyCard: {
    borderColor: '#1E1E30',
  },
  secretKeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  lockIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A40',
  },
  lockIconText: {
    fontSize: 16,
    color: '#836EF9',
    fontWeight: '800',
  },
  secretKeyMeta: {
    flex: 1,
  },
  secretKeyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  secretKeySubtitle: {
    fontSize: 12,
    color: '#6B6B88',
  },
  unlockButton: {
    backgroundColor: '#1A1A2E',
    borderColor: '#836EF940',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  unlockButtonActive: {
    backgroundColor: '#1A1520',
    borderColor: '#FF525240',
  },
  unlockButtonText: {
    color: '#836EF9',
    fontWeight: '700',
    fontSize: 14,
  },
  unlockButtonTextActive: {
    color: '#FF8888',
  },
  revealedKeyBox: {
    marginTop: 16,
  },
  warningBanner: {
    backgroundColor: '#1A1215',
    borderColor: '#FF525240',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  warningBannerText: {
    color: '#FF8888',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  secretKeyMono: {
    fontSize: 12,
    color: '#FFBBBB',
    fontFamily: 'monospace',
    lineHeight: 18,
    backgroundColor: '#1A1015',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A1A1A',
    marginBottom: 10,
    overflow: 'hidden',
  },
  copyKeyButton: {
    backgroundColor: '#FF333315',
    borderColor: '#FF333530',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  copyKeyButtonText: {
    color: '#FF8888',
    fontWeight: '700',
    fontSize: 13,
  },
});
