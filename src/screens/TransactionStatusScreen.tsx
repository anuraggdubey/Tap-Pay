/**
 * TransactionStatusScreen — Shows pending/confirmed/failed status with live Monad receipt polling
 */

import React, {useState, useEffect, useRef} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Linking, ActivityIndicator, Animated} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../navigation/AppNavigator';
import {getExplorerTxUrl} from '../config/monad';
import {truncateAddress} from '../utils/format';
import {waitForReceipt} from '../services/wallet';
import {useWallet} from '../context/WalletContext';
import {triggerHaptic} from '../utils/haptics';
import {updateTransactionStatus} from '../services/history';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TransactionStatus'>;
  route: RouteProp<RootStackParamList, 'TransactionStatus'>;
};

export default function TransactionStatusScreen({navigation, route}: Props) {
  const {txHash, amount, recipient} = route.params;
  const {refreshBalance} = useWallet();
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'failed'>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    // Real Monad 500ms receipt polling
    (async () => {
      if (!txHash || txHash.startsWith('0x...')) {
        return;
      }

      try {
        const result = await waitForReceipt(txHash);
        if (isMounted) {
          if (result.confirmed) {
            triggerHaptic.notificationSuccess();
            updateTransactionStatus(txHash, 'confirmed');
            setStatus('confirmed');
            Animated.spring(checkmarkScale, {
              toValue: 1,
              friction: 4,
              tension: 60,
              useNativeDriver: true,
            }).start();
            refreshBalance();
          } else {
            triggerHaptic.notificationError();
            updateTransactionStatus(txHash, 'failed');
            setStatus('failed');
            setErrorMessage(result.error || 'Transaction reverted');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          triggerHaptic.notificationError();
          updateTransactionStatus(txHash, 'failed');
          setStatus('failed');
          setErrorMessage(err?.message || 'Failed to poll transaction receipt');
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [txHash, refreshBalance]);

  const openExplorer = () => {
    if (txHash && !txHash.startsWith('0x...')) {
      Linking.openURL(getExplorerTxUrl(txHash));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {status === 'pending' && (
          <>
            <ActivityIndicator size="large" color="#7C5CFC" />
            <Text style={styles.statusText}>Broadcasting...</Text>
            <Text style={styles.hint}>Waiting for Monad confirmation (~1-2s)</Text>
          </>
        )}

        {status === 'confirmed' && (
          <>
            <Animated.View
              style={[
                styles.checkmarkCircle,
                {transform: [{scale: checkmarkScale}]},
              ]}>
              <Text style={styles.checkmarkIcon}>✓</Text>
            </Animated.View>
            <Text style={styles.statusText}>Payment Confirmed!</Text>
            <Text style={styles.hint}>Settled on Monad Testnet</Text>
          </>
        )}

        {status === 'failed' && (
          <>
            <View style={styles.failCircle}>
              <Text style={styles.failIcon}>✕</Text>
            </View>
            <Text style={styles.statusText}>Transaction Failed</Text>
            {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
          </>
        )}

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>{amount} MON</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>To</Text>
            <Text style={styles.detailValue}>{truncateAddress(recipient)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tx Hash</Text>
            <Text style={[styles.detailValue, {fontFamily: 'monospace', fontSize: 12}]}>
              {truncateAddress(txHash, 10, 8)}
            </Text>
          </View>
        </View>

        {txHash && !txHash.startsWith('0x...') && (
          <TouchableOpacity style={styles.explorerButton} onPress={openExplorer}>
            <Text style={styles.explorerText}>View on Monadscan ↗</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.popToTop()}>
          <Text style={styles.homeText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0F'},
  content: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24},
  checkmark: {fontSize: 64, marginBottom: 16},
  checkmarkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 200, 83, 0.15)',
    borderWidth: 2,
    borderColor: '#00C853',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkmarkIcon: {fontSize: 44, color: '#00C853', fontWeight: 'bold'},
  failCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 2,
    borderColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  failIcon: {fontSize: 36, color: '#EF4444', fontWeight: 'bold'},
  statusText: {fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginTop: 16, marginBottom: 8},
  hint: {fontSize: 14, color: '#8888AA', marginBottom: 32},
  errorText: {fontSize: 13, color: '#FF6B6B', textAlign: 'center', marginBottom: 24},
  detailsCard: {backgroundColor: '#1A1A2E', borderRadius: 16, padding: 20, width: '100%', marginTop: 24, marginBottom: 24},
  detailRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2A2A3E'},
  detailLabel: {fontSize: 14, color: '#8888AA'},
  detailValue: {fontSize: 14, color: '#FFFFFF', fontWeight: '600'},
  explorerButton: {paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: '#7C5CFC', marginBottom: 16},
  explorerText: {fontSize: 14, color: '#7C5CFC', fontWeight: '600'},
  homeButton: {paddingVertical: 14},
  homeText: {fontSize: 14, color: '#8888AA'},
});
