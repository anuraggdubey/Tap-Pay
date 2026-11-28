const inlineAppConfig = require('./scripts/babel-inline-app-config');

module.exports = api => {
  inlineAppConfig.loadAppEnv();
  // Re-evaluate the config when a build-time value changes.
  api.cache.using(() => inlineAppConfig.INLINED.map(name => process.env[name] || '').join('\n'));
  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [inlineAppConfig],
  };
};
