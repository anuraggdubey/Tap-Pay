/**
 * AccountInfoScreen — Displays username, wallet address, and biometric-locked secret key
 */

import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Clipboard,
  Animated,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useWallet} from '../context/WalletContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {triggerHaptic} from '../utils/haptics';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AccountInfo'>;
};

export default function AccountInfoScreen({navigation}: Props) {
  const {address, username, getPrivateKey} = useWallet();
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [exportedKey, setExportedKey] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Auto-hide secret key after 30 seconds
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

  const handleUnlockSecretKey = () => {
    if (showSecretKey) {
      hideSecretKey();
      return;
    }

    Alert.alert(
      'Reveal Secret Key',
      'Your secret key grants full control over your wallet and funds. Never share it with anyone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Authenticate & Reveal',
          style: 'destructive',
          onPress: async () => {
            try {
              triggerHaptic.impactMedium();
              const key = await getPrivateKey(
                'Authenticate to Reveal Secret Key',
              );
              if (key) {
                setExportedKey(key);
                setShowSecretKey(true);
              } else {
                triggerHaptic.notificationError();
                Alert.alert(
                  'Authentication Failed',
                  'Biometric verification is required to reveal your secret key.',
                );
              }
            } catch (err: any) {
              triggerHaptic.notificationError();
              Alert.alert(
                'Error',
                err?.message || 'Could not retrieve secret key.',
              );
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
          {username
            ? 'Monad On-Chain Identity'
            : 'Claim a username during wallet setup'}
        </Text>
      </View>

      {/* Username Section */}
      <Text style={styles.sectionHeader}>USERNAME</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <View style={styles.infoRowLeft}>
            <Text style={styles.infoIcon}>@</Text>
            <View>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>
                {username ? `@${username}` : 'Not registered'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Wallet Address Section */}
      <Text style={styles.sectionHeader}>WALLET ADDRESS</Text>
      <View style={styles.card}>
        <Text style={styles.addressLabel}>Public Address</Text>
        <Text selectable style={styles.addressMono}>
          {address || 'Not connected'}
        </Text>
        <TouchableOpacity
          style={styles.copyButton}
          onPress={copyAddress}
          activeOpacity={0.7}>
          <Text style={styles.copyButtonText}>
            {copiedAddr ? '✓ Copied to Clipboard' : '❐ Copy Address'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Secret Key Section */}
      <Text style={styles.sectionHeader}>SECRET KEY</Text>
      <View style={[styles.card, styles.secretKeyCard]}>
        <View style={styles.secretKeyHeader}>
          <View style={styles.lockIconContainer}>
            <Text style={styles.lockIcon}>
              {showSecretKey ? '🔓' : '🔒'}
            </Text>
          </View>
          <View style={styles.secretKeyMeta}>
            <Text style={styles.secretKeyTitle}>Private Key</Text>
            <Text style={styles.secretKeySubtitle}>
              {showSecretKey
                ? 'Key visible • Auto-hides in 30s'
                : 'Protected by biometric authentication'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.unlockButton,
            showSecretKey && styles.unlockButtonActive,
          ]}
          onPress={handleUnlockSecretKey}
          activeOpacity={0.7}>
          <Text
            style={[
              styles.unlockButtonText,
              showSecretKey && styles.unlockButtonTextActive,
            ]}>
            {showSecretKey ? '🔒 Lock Secret Key' : '🔓 Unlock Secret Key'}
          </Text>
        </TouchableOpacity>

        {showSecretKey && exportedKey && (
          <Animated.View style={[styles.revealedKeyBox, {opacity: fadeAnim}]}>
            <View style={styles.warningBanner}>
              <Text style={styles.warningBannerText}>
                ⚠️ NEVER share your secret key. Anyone with this key has full
                control over your funds.
              </Text>
            </View>
            <Text selectable style={styles.secretKeyMono}>
              {exportedKey}
            </Text>
            <TouchableOpacity
              style={styles.copyKeyButton}
              onPress={copySecretKey}
              activeOpacity={0.7}>
              <Text style={styles.copyKeyButtonText}>
                {copiedKey ? '✓ Copied' : '❐ Copy Secret Key'}
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
    paddingVertical: 28,
    marginBottom: 8,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#836EF925',
    borderWidth: 2,
    borderColor: '#836EF9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarLargeText: {
    fontSize: 32,
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
    color: '#8888AA',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8888AA',
    letterSpacing: 1.5,
    marginTop: 12,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#161622',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#222235',
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
  infoIcon: {
    fontSize: 20,
    fontWeight: '800',
    color: '#836EF9',
    width: 40,
    height: 40,
    lineHeight: 40,
    textAlign: 'center',
    backgroundColor: '#836EF920',
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoLabel: {
    fontSize: 12,
    color: '#8888AA',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addressLabel: {
    fontSize: 12,
    color: '#8888AA',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressMono: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: 'monospace',
    lineHeight: 20,
    marginBottom: 14,
    backgroundColor: '#0E0E1A',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E1E30',
    overflow: 'hidden',
  },
  copyButton: {
    backgroundColor: '#836EF920',
    borderColor: '#836EF960',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#C4B5FD',
    fontWeight: '700',
    fontSize: 14,
  },
  secretKeyCard: {
    borderColor: '#2A2040',
  },
  secretKeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  lockIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#1E1A30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 22,
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
    color: '#8888AA',
  },
  unlockButton: {
    backgroundColor: '#2A1A3D',
    borderColor: '#836EF950',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  unlockButtonActive: {
    backgroundColor: '#1A1520',
    borderColor: '#FF525250',
  },
  unlockButtonText: {
    color: '#C4B5FD',
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
    backgroundColor: '#2A1A1A',
    borderColor: '#FF5252',
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
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3A2020',
    marginBottom: 10,
    overflow: 'hidden',
  },
  copyKeyButton: {
    backgroundColor: '#FF333315',
    borderColor: '#FF333350',
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
