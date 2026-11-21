import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';
import PressableScale from './PressableScale';
import {GradientFill} from './Gradient';
import {ContactlessWave} from './AppIcons';

/** Center "Tap" button with two staggered pulse rings. */
export default function TapFab({onPress, reduced = false}: {onPress: () => void; reduced?: boolean}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced]);

  const ring = (offset: number) => {
    const p = Animated.modulo(Animated.add(pulse, offset), 1);
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          s.ring,
          {
            opacity: p.interpolate({inputRange: [0, 0.2, 1], outputRange: [0, 0.45, 0]}),
            transform: [{scale: p.interpolate({inputRange: [0, 1], outputRange: [1, 1.9]})}],
          },
        ]}
      />
    );
  };

  return (
    <View style={s.wrap}>
      {!reduced && ring(0)}
      {!reduced && ring(0.5)}
      <PressableScale
        style={s.btn}
        contentStyle={s.btnInner}
        accessibilityLabel="Tap to pay"
        onPress={onPress}
        scaleTo={0.92}>
        <GradientFill colors={['#0A84FF']} />
        <ContactlessWave size={30} color="#FFFFFF" />
      </PressableScale>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {width: 68, height: 68, alignItems: 'center', justifyContent: 'center', marginTop: -28},
  ring: {position: 'absolute', width: 68, height: 68, borderRadius: 34, backgroundColor: '#0A84FF'},
  btn: {width: 68, height: 68, borderRadius: 34, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)'},
  btnInner: {width: 68, height: 68, alignItems: 'center', justifyContent: 'center'},
});
