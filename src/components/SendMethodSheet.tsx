/**
 * SendMethodSheet — bottom sheet asking HOW to send:
 * NFC tap, @username, or wallet address.
 */

import React, {useEffect, useRef, useMemo, useState} from 'react';
import {Animated, Easing, Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../context/ThemeContext';
import {GradientFill} from './Gradient';
import PressableScale from './PressableScale';
import {ContactlessWave} from './AppIcons';
import {triggerHaptic} from '../utils/haptics';
import type {AppColors} from '../theme';

export type SendMethod = 'nfc' | 'username' | 'address';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (method: SendMethod) => void;
};

const OPTIONS: {
  key: SendMethod;
  title: string;
  sub: string;
  colors: string[];
  glyph?: string;
}[] = [
  {key: 'nfc', title: 'Tap to Pay', sub: 'Hold phones together', colors: ['#0A84FF']},
  {key: 'username', title: 'Username', sub: 'Pay a TapPay handle', colors: ['#30D158'], glyph: '@'},
  {key: 'address', title: 'Wallet Address', sub: 'Paste a 0x address', colors: ['#FF9F0A'], glyph: '0x'},
];

export default function SendMethodSheet({visible, onClose, onSelect}: Props) {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 320,
        easing: Easing.bezier(0.32, 0.72, 0, 1),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({finished}) => {
        if (finished) {
          setMounted(false);
        }
      });
    }
  }, [visible, progress]);

  if (!mounted) {
    return null;
  }

  const translateY = progress.interpolate({inputRange: [0, 1], outputRange: [360, 0]});

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, {opacity: progress}]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, {paddingBottom: insets.bottom + 20, transform: [{translateY}]}]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Send</Text>
        <Text style={styles.subtitle}>Choose how you want to pay.</Text>
        <View style={styles.list}>
          {OPTIONS.map(o => (
            <PressableScale
              key={o.key}
              style={styles.option}
              contentStyle={styles.optionInner}
              accessibilityLabel={o.title}
              onPress={() => {
                triggerHaptic.selection();
                onSelect(o.key);
              }}>
              <View style={styles.iconWrap}>
                <GradientFill colors={o.colors} angle={135} />
                {o.glyph ? (
                  <Text style={styles.glyph}>{o.glyph}</Text>
                ) : (
                  <ContactlessWave size={26} color="#FFFFFF" />
                )}
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{o.title}</Text>
                <Text style={styles.optionSub}>{o.sub}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </PressableScale>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    backdrop: {...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.6)'},
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(40,40,44,0.94)',
      borderTopLeftRadius: 38,
      borderTopRightRadius: 38,
      paddingHorizontal: 20,
      paddingTop: 10,
      borderTopWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
    },
    handle: {alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong, marginBottom: 18},
    title: {fontSize: 22, fontWeight: '700', color: c.text, letterSpacing: 0.3},
    subtitle: {fontSize: 15, color: c.textMuted, marginTop: 2, marginBottom: 16},
    list: {gap: 10},
    option: {borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)'},
    optionInner: {flexDirection: 'row', alignItems: 'center', padding: 12, gap: 14},
    iconWrap: {width: 44, height: 44, borderRadius: 15, overflow: 'hidden', alignItems: 'center', justifyContent: 'center'},
    glyph: {fontSize: 20, fontWeight: '800', color: '#FFFFFF'},
    optionText: {flex: 1},
    optionTitle: {fontSize: 16, fontWeight: '700', color: c.text, letterSpacing: -0.2},
    optionSub: {fontSize: 13, color: c.textMuted, marginTop: 2},
    chevron: {fontSize: 24, color: c.textSubtle, marginRight: 4},
  });
}
