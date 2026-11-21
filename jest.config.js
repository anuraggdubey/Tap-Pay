module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/test/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|@react-native-async-storage|react-native-url-polyfill|react-native-svg|@supabase/supabase-js|@noble/hashes|@noble/curves|@scure/base)/)',
  ],
};
