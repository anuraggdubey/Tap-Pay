import {Alert} from 'react-native';

/** A two-button Alert as a promise: true when the user picks `confirmText`, false otherwise. */
export function confirmAlert(title: string, message: string, confirmText: string): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(
      title,
      message,
      [
        {text: 'Cancel', style: 'cancel', onPress: () => resolve(false)},
        {text: confirmText, onPress: () => resolve(true)},
      ],
      {cancelable: true, onDismiss: () => resolve(false)},
    );
  });
}

/** Ask before a new payment that would wait behind earlier unconfirmed ones (#130). */
export function confirmPayBehindStuck(count: number): Promise<boolean> {
  const earlier = count === 1 ? 'An earlier payment has' : `${count} earlier payments have`;
  return confirmAlert(
    'Earlier payment still pending',
    `${earlier} not been confirmed yet. A new payment will wait behind it until it goes through. ` +
      'You can speed it up or cancel it from Activity.',
    'Pay Anyway',
  );
}
