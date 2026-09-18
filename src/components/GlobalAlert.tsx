import React, {useImperativeHandle, forwardRef, useState, useRef, useEffect} from 'react';
import {Modal, View, Text, TouchableOpacity, StyleSheet, AlertButton, Animated} from 'react-native';
import {triggerHaptic} from '../utils/haptics';

export interface GlobalAlertRef {
  alert: (title: string | null | undefined, message?: string, buttons?: AlertButton[]) => void;
}

export const globalAlertRef = React.createRef<GlobalAlertRef>();

const GlobalAlert = forwardRef<GlobalAlertRef>((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [buttons, setButtons] = useState<AlertButton[]>([]);

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 20,
          stiffness: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  useImperativeHandle(ref, () => ({
    alert: (t: string | null | undefined, m?: string, b?: AlertButton[]) => {
      setTitle(t || '');
      setMessage(m || '');
      setButtons(b || [{text: 'OK'}]);
      setVisible(true);
      triggerHaptic.impactMedium();
    }
  }));

  const handlePress = (onPress?: any) => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      if (onPress) {
        setTimeout(onPress, 50);
      }
    });
  };

  if (!visible) return null;

  const isSingleButton = buttons.length === 1;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={() => handlePress()}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.alertBox,
            {
              transform: [{scale: scaleAnim}],
              opacity: opacityAnim,
            },
          ]}>
          {/* Title */}
          {!!title && <Text style={styles.title}>{title}</Text>}

          {/* Message */}
          {!!message && <Text style={styles.message}>{message}</Text>}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Buttons */}
          <View style={[styles.buttonContainer, !isSingleButton && styles.buttonContainerRow]}>
            {buttons.map((btn, index) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';

              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.7}
                  style={[
                    styles.button,
                    isSingleButton
                      ? styles.singleButton
                      : styles.multiButton,
                    isDestructive && styles.destructiveButton,
                    isCancel && styles.cancelButton,
                    !isDestructive && !isCancel && styles.primaryButton,
                    // Add left border separator for second+ buttons in row layout
                    !isSingleButton && index > 0 && styles.buttonLeftBorder,
                  ]}
                  onPress={() => handlePress(btn.onPress)}>
                  <Text style={[
                    styles.buttonText,
                    isDestructive && styles.destructiveText,
                    isCancel && styles.cancelText,
                    !isDestructive && !isCancel && styles.primaryText,
                  ]}>
                    {btn.text || 'OK'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  alertBox: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#38383A',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  message: {
    fontSize: 13,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 20,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#38383A',
  },
  buttonContainer: {
    // Default: vertical stack for single button
  },
  buttonContainerRow: {
    flexDirection: 'row',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  singleButton: {
    width: '100%',
  },
  multiButton: {
    flex: 1,
  },
  buttonLeftBorder: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#38383A',
  },
  primaryButton: {
    // Transparent background — iOS native alert style
  },
  primaryText: {
    color: '#30D158',
    fontWeight: '600',
    fontSize: 17,
    letterSpacing: -0.2,
  },
  cancelButton: {
    // Transparent background
  },
  cancelText: {
    color: '#FFFFFF',
    fontWeight: '400',
    fontSize: 17,
    letterSpacing: -0.2,
  },
  destructiveButton: {
    // Transparent background
  },
  destructiveText: {
    color: '#FF453A',
    fontWeight: '600',
    fontSize: 17,
    letterSpacing: -0.2,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});

export default GlobalAlert;
