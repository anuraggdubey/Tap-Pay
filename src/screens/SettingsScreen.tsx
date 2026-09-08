/**
 * SettingsScreen — Wallet management, network settings, and developer info
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useWallet} from '../context/WalletContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {MONAD_CONFIG} from '../config/monad';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

export default function SettingsScreen({navigation}: Props) {
  const {address, getPrivateKey, resetWallet} = useWallet();
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [exportedKey, setExportedKey] = useState<string | null>(null);

  const handleExportKey = async () => {
    if (showPrivateKey) {
      setShowPrivateKey(false);
      setExportedKey(null);
      return;
    }

    Alert.alert(
      'Export Private Key',
      'Never share your private key with anyone. Anyone with this key has full control over your funds.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reveal',
          style: 'destructive',
          onPress: async () => {
            const key = await getPrivateKey();
            if (key) {
              setExportedKey(key);
              setShowPrivateKey(true);
            } else {
              Alert.alert('Error', 'Could not retrieve private key.');
            }
          },
        },
      ],
    );
  };

  const handleResetWallet = () => {
    Alert.alert(
      'Reset Wallet',
      'This will remove your current wallet credentials from this device. Make sure you have backed up your private key first!',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset Wallet',
          style: 'destructive',
          onPress: async () => {
            await resetWallet();
            navigation.reset({
              index: 0,
              routes: [{name: 'WalletSetup'}],
            });
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Wallet Section */}
      <Text style={styles.sectionHeader}>Wallet</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Public Address</Text>
        <Text selectable style={styles.valueMono}>{address || 'Not connected'}</Text>

        <TouchableOpacity
          style={styles.actionBtnSecondary}
          onPress={handleExportKey}>
          <Text style={styles.actionBtnSecondaryText}>
            {showPrivateKey ? 'Hide Private Key' : '🔑 Export Private Key'}
          </Text>
        </TouchableOpacity>

        {showPrivateKey && exportedKey && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>⚠️ Keep Secret</Text>
            <Text selectable style={styles.privateKeyMono}>{exportedKey}</Text>
          </View>
        )}
      </View>

      {/* Network Section */}
      <Text style={styles.sectionHeader}>Network</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Network</Text>
          <Text style={styles.infoVal}>{MONAD_CONFIG.chainName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Chain ID</Text>
          <Text style={styles.infoVal}>{MONAD_CONFIG.chainId}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Currency</Text>
          <Text style={styles.infoVal}>{MONAD_CONFIG.nativeCurrency.name} ({MONAD_CONFIG.nativeCurrency.symbol})</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>RPC URL</Text>
          <Text style={[styles.infoVal, styles.monoSmall]}>{MONAD_CONFIG.rpcUrls.primary}</Text>
        </View>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL(MONAD_CONFIG.faucetUrl)}>
          <Text style={styles.linkText}>🚰 Open Monad Faucet ↗</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL(MONAD_CONFIG.blockExplorer.url)}>
          <Text style={styles.linkText}>🔍 Monadscan Explorer ↗</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <Text style={styles.sectionHeader}>About</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>App</Text>
          <Text style={styles.infoVal}>TapPay v0.0.1</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Mode</Text>
          <Text style={styles.infoVal}>NFC HCE + Username Pay</Text>
        </View>
      </View>

      {/* Danger Zone */}
      <Text style={[styles.sectionHeader, {color: '#FF5252'}]}>Danger Zone</Text>
      <View style={[styles.card, {borderColor: '#4A1515'}]}>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleResetWallet}>
          <Text style={styles.dangerBtnText}>Reset Wallet Data</Text>
        </TouchableOpacity>
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
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8888AA',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#161622',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#222235',
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    color: '#8888AA',
    marginBottom: 6,
  },
  valueMono: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: 'monospace',
    lineHeight: 18,
    marginBottom: 14,
  },
  actionBtnSecondary: {
    backgroundColor: '#242438',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnSecondaryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  warningBox: {
    marginTop: 14,
    backgroundColor: '#2A1A1A',
    borderColor: '#FF5252',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  warningTitle: {
    color: '#FF5252',
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 6,
  },
  privateKeyMono: {
    color: '#FFAAAA',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E30',
  },
  infoKey: {
    color: '#8888AA',
    fontSize: 14,
  },
  infoVal: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  monoSmall: {
    fontFamily: 'monospace',
    fontSize: 11,
    maxWidth: '60%',
    textAlign: 'right',
  },
  linkRow: {
    paddingVertical: 10,
    marginTop: 6,
  },
  linkText: {
    color: '#7C5CFC',
    fontSize: 14,
    fontWeight: '600',
  },
  dangerBtn: {
    backgroundColor: '#FF333320',
    borderColor: '#FF3333',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerBtnText: {
    color: '#FF5252',
    fontWeight: '700',
    fontSize: 14,
  },
});
