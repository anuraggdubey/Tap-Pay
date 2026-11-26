/**
 * AboutScreen — app info, features and security in iOS grouped lists.
 */

import React, {useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useTheme} from '../context/ThemeContext';
import AmbientBackground from '../components/AmbientBackground';
import {Group, Row, tileColors} from '../components/IosList';
import {ContactlessWave} from '../components/AppIcons';
import type {AppColors} from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AboutTapPay'>;
};

export default function AboutScreen(_props: Props) {
  const {colors} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <ContactlessWave size={44} color="#FFFFFF" />
        </View>
        <Text style={styles.name}>TapPay</Text>
        <Text style={styles.version}>Version 0.0.1</Text>
        <Text style={styles.tagline}>Tap to pay. Search to send. Powered by Monad.</Text>
      </View>

      <Group title="Features">
        <Row
          icon={{bg: tileColors.blue, glyph: '◉'}}
          title="Contactless Tap to Pay"
          subtitle="Send crypto by tapping phones over NFC"
          chevron={false}
        />
        <Row
          icon={{bg: tileColors.green, glyph: '@'}}
          title="Username Pay"
          subtitle="Pay human-readable TapPay handles"
          chevron={false}
        />
        <Row
          icon={{bg: tileColors.red, glyph: '⚿'}}
          title="Hardware Keystore"
          subtitle="Keys are protected by your phone's secure hardware"
          chevron={false}
        />
        <Row
          icon={{bg: tileColors.purple, glyph: '⚡'}}
          title="Monad Speed"
          subtitle="Sub-second finality, parallel EVM execution"
          chevron={false}
        />
      </Group>

      <Group title="Security">
        <Row title="Key Storage" value="Android Keystore" />
        <Row title="Authentication" value="Biometric / Passcode" />
        <Row title="Encryption" value="AES-GCM 256" />
        <Row title="Data Policy" value="Keys stay on device" />
      </Group>

      <Text style={styles.footer}>TapPay · Open-source contactless payments{'\n'}Built for the Monad ecosystem</Text>
      </ScrollView>
    </View>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: c.background},
    content: {padding: 20, paddingBottom: 48},
    header: {alignItems: 'center', paddingVertical: 12, gap: 4},
    icon: {width: 88, height: 88, borderRadius: 20, backgroundColor: '#0A84FF', alignItems: 'center', justifyContent: 'center', marginBottom: 10},
    name: {fontSize: 26, fontWeight: '700', color: c.text},
    version: {fontSize: 15, color: c.textMuted},
    tagline: {fontSize: 14, color: c.textMuted, textAlign: 'center', marginTop: 8, maxWidth: 260, lineHeight: 20},
    footer: {fontSize: 12, color: c.textSubtle, textAlign: 'center', marginTop: 28, lineHeight: 18},
  });
}
