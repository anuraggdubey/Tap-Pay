/**
 * WalletSetupScreen — Onboarding flow
 * Create new wallet or import existing private key, then optional username registration.
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
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useWallet} from '../context/WalletContext';
import {RootStackParamList} from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WalletSetup'>;
};

export default function WalletSetupScreen({navigation}: Props) {
  const {createWallet, importWallet} = useWallet();
  const [step, setStep] = useState<'welcome' | 'import' | 'backup'>('welcome');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [newPrivateKey, setNewPrivateKey] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    const wallet = await createWallet();
    setLoading(false);

    if (wallet) {
      setNewPrivateKey(wallet.privateKey);
      setNewAddress(wallet.address);
      setStep('backup');
    } else {
      Alert.alert('Error', 'Failed to create wallet. Please try again.');
    }
  };

  const handleImport = async () => {
    if (!privateKeyInput.trim()) {
      Alert.alert('Error', 'Please enter a private key');
      return;
    }

    setLoading(true);
    const success = await importWallet(privateKeyInput.trim());
    setLoading(false);

    if (success) {
      navigation.replace('Home');
    } else {
      Alert.alert('Error', 'Invalid private key. Please check and try again.');
    }
  };

  const handleDone = () => {
    navigation.replace('Home');
  };

  if (step === 'import') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Import Wallet</Text>
        <Text style={styles.subtitle}>Paste your private key below</Text>

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
            <Text style={styles.buttonText}>Import</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => setStep('welcome')}>
          <Text style={styles.linkText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (step === 'backup') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>⚠️ Back Up Your Key</Text>
        <Text style={styles.subtitle}>
          Your wallet is stored securely in the hardware-backed Android Keystore.
          If you lose this phone, you lose access to this wallet.
        </Text>

        <View style={styles.keyBox}>
          <Text style={styles.keyLabel}>Your Address</Text>
          <Text style={styles.keyValue} selectable>{newAddress}</Text>
        </View>

        <View style={styles.keyBox}>
          <Text style={styles.keyLabel}>Your Private Key (save this!)</Text>
          <Text style={styles.keyValue} selectable>{newPrivateKey}</Text>
        </View>

        <Text style={styles.warning}>
          ⚠️ Copy your private key now. It will not be shown again.
        </Text>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleDone}>
          <Text style={styles.buttonText}>I've Saved It — Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Welcome screen
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
          <Text style={[styles.buttonText, {color: '#7C5CFC'}]}>
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
  logo: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#8888AA',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#7C5CFC',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#7C5CFC',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    color: '#7C5CFC',
    fontSize: 14,
  },
  keyBox: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  },
  warning: {
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 24,
  },
});
