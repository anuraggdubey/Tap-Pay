/**
 * Security invariants for wallet secrets. These fail the build if someone reintroduces
 * passkey-derived keys, copyable secrets, secret logging, or unauthenticated signers.
 */

import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..', 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(SRC).map(file => ({
  rel: path.relative(SRC, file).replace(/\\/g, '/'),
  text: fs.readFileSync(file, 'utf8'),
}));

const noComments = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('wallet secret invariants', () => {
  it('has no passkey-derived key code', () => {
    for (const f of files) {
      expect(f.text).not.toMatch(/@category-labs\/mera|react-native-passkey/);
      expect(f.text).not.toMatch(/getSessionPrivateKey|getMeraSigner|hasMeraSigner/);
    }
  });

  it('never copies secrets to the clipboard', () => {
    for (const f of files) {
      const calls = noComments(f.text).match(/Clipboard\.setString\(([^)]*)\)/g) || [];
      for (const call of calls) {
        const arg = call.replace(/^Clipboard\.setString\(/, '').replace(/\)$/, '').trim();
        expect({file: f.rel, arg}).not.toEqual({
          file: f.rel,
          arg: expect.stringMatching(/privateKey|mnemonic|phrase|secret|key/i),
        });
      }
    }
  });

  it('never logs secrets', () => {
    for (const f of files) {
      const logs = noComments(f.text).match(/console\.\w+\([^;]*\)/g) || [];
      for (const log of logs) {
        expect({file: f.rel, log}).not.toEqual({
          file: f.rel,
          log: expect.stringMatching(/privateKey|mnemonic|phrase|secret|\bkey\b/i),
        });
      }
    }
  });

  it('never persists secrets in unprotected storage', () => {
    for (const f of files) {
      const writes = noComments(f.text).match(/AsyncStorage\.setItem\([^;]*\)/g) || [];
      for (const write of writes) {
        expect({file: f.rel, write}).not.toEqual({
          file: f.rel,
          write: expect.stringMatching(/privateKey|mnemonic|phrase|secret/i),
        });
      }
    }
  });

  it('creates signing wallets only where authentication is enforced', () => {
    // Every file that builds a signer from raw key material must be one of these, and each of
    // them obtains the key through loadPrivateKey (which always prompts phone authentication).
    const allowed = new Set([
      'services/wallet.ts',
      'services/registry.ts',
      'services/tokens/tokenTransfer.ts',
      'utils/recovery.ts',
    ]);
    for (const f of files) {
      if (/new ethers\.Wallet\(/.test(noComments(f.text))) {
        expect({file: f.rel, allowed: allowed.has(f.rel)}).toEqual({file: f.rel, allowed: true});
        if (f.rel !== 'utils/recovery.ts' && f.rel !== 'services/wallet.ts') {
          expect(f.text).toMatch(/loadPrivateKey\(/);
        }
      }
    }
  });
});
