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
  container: {
    flex: 1,
    backgroundColor: '#09090D',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  checkmark: {
    fontSize: 64,
    marginBottom: 16,
  },
  checkmarkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkmarkIcon: {
    fontSize: 38,
    color: '#10B981',
    fontWeight: 'bold',
  },
  failCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  failIcon: {
    fontSize: 32,
    color: '#EF4444',
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 14,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  hint: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 28,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  detailsCard: {
    backgroundColor: '#15151E',
    borderRadius: 14,
    padding: 18,
    width: '100%',
    marginTop: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#242433',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#242433',
  },
  detailLabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  detailValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  explorerButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242433',
    backgroundColor: '#15151E',
    alignItems: 'center',
    marginBottom: 12,
  },
  explorerText: {
    fontSize: 14,
    color: '#6E54FF',
    fontWeight: '700',
  },
  homeButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6E54FF',
    alignItems: 'center',
  },
  homeText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
