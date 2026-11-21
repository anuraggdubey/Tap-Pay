/**
 * Payment sound effects. Bundled WAVs (android/app/src/main/res/raw).
 * Honors the user's "Sound effects" preference and never throws.
 */

import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Sound from 'react-native-sound';

const PREF_KEY = '@tappay_sound_enabled';

export type SoundName = 'tap_connect' | 'pay_success' | 'pay_fail';

let enabled = true;
let loaded = false;
const cache: Partial<Record<SoundName, Sound>> = {};

try {
  // Mix with other audio; respect the silent switch on iOS.
  Sound.setCategory('Ambient', true);
} catch {
  // Sound is optional; ignore setup failures.
}

async function ensurePref() {
  if (loaded) return;
  loaded = true;
  try {
    enabled = (await AsyncStorage.getItem(PREF_KEY)) !== '0';
  } catch {
    enabled = true;
  }
}

export async function getSoundEnabled(): Promise<boolean> {
  await ensurePref();
  return enabled;
}

export async function setSoundEnabled(value: boolean): Promise<void> {
  enabled = value;
  loaded = true;
  try {
    await AsyncStorage.setItem(PREF_KEY, value ? '1' : '0');
  } catch {
    // ignore
  }
}

function load(name: SoundName): Promise<Sound | null> {
  const hit = cache[name];
  if (hit) return Promise.resolve(hit);
  return new Promise(resolve => {
    // Android resolves res/raw by file name; iOS by bundle file name.
    const file = Platform.OS === 'android' ? name : `${name}.wav`;
    const snd = new Sound(file, Platform.OS === 'android' ? Sound.MAIN_BUNDLE : Sound.MAIN_BUNDLE, err => {
      if (err) {
        resolve(null);
        return;
      }
      cache[name] = snd;
      resolve(snd);
    });
  });
}

export async function playSound(name: SoundName): Promise<void> {
  try {
    await ensurePref();
    if (!enabled) return;
    const snd = await load(name);
    if (!snd) return;
    snd.stop(() => {
      snd.setVolume(1);
      snd.play();
    });
  } catch {
    // never let audio break a payment flow
  }
}

export function preloadSounds(): void {
  (['tap_connect', 'pay_success', 'pay_fail'] as SoundName[]).forEach(n => {
    load(n).catch(() => {});
  });
}
