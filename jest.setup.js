/* eslint-env jest */

// Polyfill and mock native modules for Jest test environment
jest.mock('react-native-get-random-values', () => ({}));
jest.mock('@ethersproject/shims', () => ({}));

// AsyncStorage mock (self-contained closure)
jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key) => Promise.resolve(store[key] || null)),
      setItem: jest.fn((key, val) => {
        store[key] = String(val);
        return Promise.resolve(null);
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
        return Promise.resolve(null);
      }),
      clear: jest.fn(() => {
        store = {};
        return Promise.resolve(null);
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
      multiGet: jest.fn((keys) =>
        Promise.resolve(keys.map((k) => [k, store[k] || null]))
      ),
      multiSet: jest.fn((pairs) => {
        pairs.forEach(([k, v]) => {
          store[k] = String(v);
        });
        return Promise.resolve(null);
      }),
      multiRemove: jest.fn((keys) => {
        keys.forEach((k) => {
          delete store[k];
        });
        return Promise.resolve(null);
      }),
    },
  };
});

// Safe Area Context mock
jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default || mock;
});

// React Native Screens mock
jest.mock('react-native-screens', () => {
  const {View} = require('react-native');
  return {
    enableScreens: jest.fn(),
    enableFreeze: jest.fn(),
    screensEnabled: jest.fn(() => true),
    freezeEnabled: jest.fn(() => false),
    Screen: View,
    InnerScreen: View,
    ScreenContext: require('react').createContext(null),
    ScreenContainer: View,
    NativeScreen: View,
    NativeScreenContainer: View,
    ScreenStack: View,
    ScreenStackItem: View,
    ScreenStackHeaderConfig: View,
    ScreenStackHeaderSubview: View,
    ScreenStackHeaderLeftView: View,
    ScreenStackHeaderCenterView: View,
    ScreenStackHeaderRightView: View,
    ScreenStackHeaderBackButtonImage: View,
    ScreenStackHeaderSearchBarView: View,
    SearchBar: View,
    FullWindowOverlay: View,
    ScreenFooter: View,
    ScreenContentWrapper: View,
    compatibilityFlags: {},
    featureFlags: {},
  };
});

// Keychain mock
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue(null),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  getSupportedBiometryType: jest.fn().mockResolvedValue('Fingerprint'),
  ACCESS_CONTROL: {
    BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'BIOMETRY_ANY_OR_DEVICE_PASSCODE',
    BIOMETRY_ANY: 'BIOMETRY_ANY',
  },
  SECURITY_LEVEL: {SECURE_HARDWARE: 'SECURE_HARDWARE'},
  STORAGE_TYPE: {AES_GCM: 'AES_GCM'},
}));

// HCE mock
jest.mock('react-native-hce', () => ({
  HCESession: {
    getInstance: jest.fn().mockResolvedValue({
      setApplication: jest.fn(),
      setEnabled: jest.fn().mockResolvedValue(true),
    }),
  },
  NFCTagType4: jest.fn(),
  NFCTagType4NDEFContentType: {
    Text: 'text',
    URL: 'url',
  },
}));

// NFC Manager mock
jest.mock('react-native-nfc-manager', () => ({
  __esModule: true,
  default: {
    start: jest.fn().mockResolvedValue(true),
    isSupported: jest.fn().mockResolvedValue(true),
    isEnabled: jest.fn().mockResolvedValue(true),
    requestTechnology: jest.fn().mockResolvedValue(null),
    cancelTechnologyRequest: jest.fn().mockResolvedValue(null),
    getTag: jest.fn().mockResolvedValue(null),
  },
  NfcTech: {Ndef: 'Ndef'},
  Ndef: {
    text: {
      decodePayload: jest.fn().mockReturnValue(''),
    },
  },
}));
