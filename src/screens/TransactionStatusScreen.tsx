/**
 * TransactionStatusScreen — Shows pending/confirmed/failed status with explorer link
 */

import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Linking, ActivityIndicator} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../navigation/AppNavigator';
import {getExplorerTxUrl} from '../config/monad';
import {truncateAddress} from '../utils/format';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TransactionStatus'>;
  route: RouteProp<RootStackParamList, 'TransactionStatus'>;
};

export default function TransactionStatusScreen({navigation, route}: Props) {
  const {txHash, amount, recipient} = route.params;
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'failed'>('pending');

  useEffect(() => {
    // TODO: Poll for receipt using wallet.waitForReceipt(txHash)
    // Update status accordingly
    const timer = setTimeout(() => setStatus('confirmed'), 2000); // Simulated
    return () => clearTimeout(timer);
  }, [txHash]);

  const openExplorer = () => {
    Linking.openURL(getExplorerTxUrl(txHash));
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
            <Text style={styles.checkmark}>✅</Text>
            <Text style={styles.statusText}>Payment Confirmed!</Text>
          </>
        )}

        {status === 'failed' && (
          <>
            <Text style={styles.checkmark}>❌</Text>
            <Text style={styles.statusText}>Transaction Failed</Text>
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

        <TouchableOpacity style={styles.explorerButton} onPress={openExplorer}>
          <Text style={styles.explorerText}>View on Monadscan ↗</Text>
        </TouchableOpacity>

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
  statusText: {fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginTop: 16, marginBottom: 8},
  hint: {fontSize: 14, color: '#8888AA', marginBottom: 32},
  detailsCard: {backgroundColor: '#1A1A2E', borderRadius: 16, padding: 20, width: '100%', marginTop: 24, marginBottom: 24},
  detailRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2A2A3E'},
  detailLabel: {fontSize: 14, color: '#8888AA'},
  detailValue: {fontSize: 14, color: '#FFFFFF', fontWeight: '600'},
  explorerButton: {paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: '#7C5CFC', marginBottom: 16},
  explorerText: {fontSize: 14, color: '#7C5CFC', fontWeight: '600'},
  homeButton: {paddingVertical: 14},
  homeText: {fontSize: 14, color: '#8888AA'},
});
