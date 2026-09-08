/**
 * ReceiveTapScreen — NFC reader mode, accept/reject incoming payment
 */

import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ActivityIndicator} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {formatMon, truncateAddress} from '../utils/format';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReceiveTap'>;
};

export default function ReceiveTapScreen({navigation}: Props) {
  const [scanning, setScanning] = useState(true);
  const [offer, setOffer] = useState<{amount: string; senderAddress: string} | null>(null);

  useEffect(() => {
    // TODO: Start NFC reader mode via nfcReader.readPaymentOffer()
    // When a tag is read, decode the binary payload and show the accept screen
    return () => {
      // TODO: Cancel NFC read on unmount
    };
  }, []);

  const handleAccept = async () => {
    if (!offer) { return; }
    // TODO: Send ACCEPT APDU response with receiver address
    // TODO: Navigate to TransactionStatus after sender broadcasts
    navigation.navigate('TransactionStatus', {
      txHash: '0x...pending',
      amount: offer.amount,
      recipient: offer.senderAddress,
    });
  };

  const handleReject = () => {
    setOffer(null);
    setScanning(true);
  };

  if (scanning) {
    return (
      <View style={styles.container}>
        <View style={styles.scanContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.scanTitle}>Ready to Receive</Text>
          <Text style={styles.scanSubtitle}>
            Hold your phone near the sender's phone
          </Text>
        </View>
      </View>
    );
  }

  if (offer) {
    return (
      <View style={styles.container}>
        <View style={styles.offerContainer}>
          <Text style={styles.offerLabel}>Incoming Payment</Text>
          <Text style={styles.offerAmount}>{offer.amount} MON</Text>
          <Text style={styles.offerFrom}>
            from {truncateAddress(offer.senderAddress)}
          </Text>

          <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.rejectButton} onPress={handleReject}>
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0A0A0F'},
  scanContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24},
  scanTitle: {fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginTop: 24, marginBottom: 12},
  scanSubtitle: {fontSize: 16, color: '#8888AA', textAlign: 'center'},
  offerContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24},
  offerLabel: {fontSize: 14, color: '#8888AA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12},
  offerAmount: {fontSize: 48, fontWeight: '800', color: '#4CAF50', marginBottom: 8},
  offerFrom: {fontSize: 16, color: '#8888AA', marginBottom: 40},
  acceptButton: {backgroundColor: '#4CAF50', paddingVertical: 18, paddingHorizontal: 80, borderRadius: 16, marginBottom: 16},
  acceptText: {fontSize: 18, fontWeight: '700', color: '#FFFFFF'},
  rejectButton: {paddingVertical: 12},
  rejectText: {fontSize: 16, color: '#FF6B6B'},
});
