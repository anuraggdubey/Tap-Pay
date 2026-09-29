module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/test/'],
  moduleNameMapper: {
    '^@category-labs/mera/react-native-webauthn-client$':
      '<rootDir>/__mocks__/category-labs-mera-webauthn.js',
    '^@category-labs/mera$': '<rootDir>/__mocks__/category-labs-mera.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|@react-native-async-storage|react-native-url-polyfill|@supabase/supabase-js|@category-labs/mera|@noble/hashes|@noble/curves|@scure/base)/)',
  ],
};
