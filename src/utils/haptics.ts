/**
 * Haptic Feedback Utility
 *
 * Provides Apple Pay-style tactile feedback using React Native's Vibration API.
 * Safely fallbacks if vibration is unsupported or disabled on device.
 */

import {Vibration, Platform} from 'react-native';

export const triggerHaptic = {
  /**
   * ImpactMedium: Triggered on NFC tap detection or read start
   */
  impactMedium: () => {
    try {
      if (Platform.OS === 'android') {
        Vibration.vibrate(40);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Ignore vibration errors
    }
  },

  /**
   * NotificationSuccess: Triggered when contract transaction is mined / tap accepted
   */
  notificationSuccess: () => {
    try {
      if (Platform.OS === 'android') {
        // Crisp double tap pattern: [pause, vibrate, pause, vibrate]
        Vibration.vibrate([0, 35, 60, 45]);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Ignore vibration errors
    }
  },

  /**
   * NotificationError: Triggered on session expiry, reject, or signature error
   */
  notificationError: () => {
    try {
      if (Platform.OS === 'android') {
        // Warning vibration pattern
        Vibration.vibrate([0, 70, 70, 70]);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Ignore vibration errors
    }
  },
};
