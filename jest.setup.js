/* eslint-env jest */

// Polyfill and mock native modules for Jest test environment
jest.mock('react-native-get-random-values', () => ({}));
jest.mock('@ethersproject/shims', () => ({}));

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
