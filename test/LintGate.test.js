const {expect} = require('chai');
const {ESLint} = require('eslint');
const fs = require('fs');
const path = require('path');

describe('ESLint CI gate', function () {
  const root = path.resolve(__dirname, '..');
  const eslint = new ESLint({cwd: root});

  for (const source of ['', 'export const lintGateValue = true;\n']) {
    it(`accepts ${source ? 'valid' : 'empty'} application code`, async function () {
      const [result] = await eslint.lintText(source, {filePath: 'src/lintGateFixture.ts'});
      expect(result.errorCount).to.equal(0);
    });
  }

  it('rejects an unused application binding', async function () {
    const [result] = await eslint.lintText('const unusedLintGateValue = true;\n', {filePath: 'src/lintGateFixture.ts'});
    expect(result.errorCount).to.be.greaterThan(0);
    expect(result.messages.some(message => message.ruleId === '@typescript-eslint/no-unused-vars')).to.equal(true);
  });

  it('ignores generated output without ignoring application sources', async function () {
    for (const file of ['android/build/reports/generated.js', 'android/app/build/reports/generated.js', 'web/dist/generated.js', 'vendor/bundle/generated.js']) {
      expect(await eslint.isPathIgnored(path.join(root, file)), file).to.equal(true);
    }
    for (const file of ['src/screens/ReceiveTapScreen.tsx', 'web/src/components/tappay-mock/TapPayMockScreens.tsx']) {
      expect(await eslint.isPathIgnored(path.join(root, file)), file).to.equal(false);
    }
  });

  it('preserves the lint command exit status in CI', function () {
    const workflow = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
    expect(workflow).to.match(/^\s+run: npm run lint\s*$/m);
    expect(workflow).not.to.match(/npm run lint[^\n]*\|\|/);
  });
});
