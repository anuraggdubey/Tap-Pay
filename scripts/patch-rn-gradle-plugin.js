/**
 * RN 0.87.1 ships @react-native/gradle-plugin with Kotlin 2.0.21, which crashes
 * under Gradle 9.4.1 (FirIncompatibleClassExpressionChecker: source must not be null).
 * Bump to Kotlin 2.2.0 after every npm install.
 */
const fs = require('fs');
const path = require('path');

const tomlPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native',
  'gradle-plugin',
  'gradle',
  'libs.versions.toml',
);

if (!fs.existsSync(tomlPath)) {
  console.warn('[patch-rn-gradle-plugin] gradle plugin not installed, skipping');
  process.exit(0);
}

const original = fs.readFileSync(tomlPath, 'utf8');
const patched = original.replace(/kotlin = "2\.0\.21"/, 'kotlin = "2.2.0"');

if (original === patched) {
  if (!/kotlin = "2\.2\.0"/.test(original)) {
    console.warn('[patch-rn-gradle-plugin] expected kotlin 2.0.21, found different version');
  }
  process.exit(0);
}

fs.writeFileSync(tomlPath, patched);
console.log('[patch-rn-gradle-plugin] patched Kotlin to 2.2.0');
