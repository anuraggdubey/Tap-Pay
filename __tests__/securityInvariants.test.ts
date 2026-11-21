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
      expect(f.text).not.toMatch(/@category-labs\/mera/);
      expect(f.text).not.toMatch(/getSessionPrivateKey|getMeraSigner|hasMeraSigner/);
    }
  });

  it('confines the passkey library to the recovery provider (passkey is recovery, never the wallet key)', () => {
    for (const f of files) {
      if (f.rel === 'services/passkeyRecovery/provider.ts') {
        continue;
      }
      expect({file: f.rel, uses: /react-native-passkey/.test(f.text)}).toEqual({file: f.rel, uses: false});
    }
    const wallet = files.find(f => f.rel === 'services/wallet.ts')!;
    expect(wallet.text).not.toMatch(/passkey/i);
  });

  it('passkey recovery stores no secret locally and never touches the clipboard', () => {
    const recovery = files.filter(f => f.rel.startsWith('services/passkeyRecovery/'));
    expect(recovery.length).toBeGreaterThan(0);
    for (const f of recovery) {
      const code = noComments(f.text);
      expect(code).not.toMatch(/Clipboard/);
      const writes = code.match(/AsyncStorage\.setItem\([^;]*\)/g) || [];
      for (const w of writes) {
        expect(w).not.toMatch(/phrase|mnemonic|privateKey|secret|prf/i);
      }
    }
  });

  it('never reads the usernames table directly (exact-match RPCs only, no bulk scrape)', () => {
    for (const f of files) {
      const direct = /\.from\(\s*['"]usernames['"]/.test(noComments(f.text));
      expect({file: f.rel, direct}).toEqual({file: f.rel, direct: false});
    }
  });

  it('transaction history is only ever written through the encrypted store', () => {
    for (const f of files) {
      if (f.rel === 'services/secureHistoryStore.ts') {
        continue;
      }
      const code = noComments(f.text);
      const plaintext = /AsyncStorage\.setItem\(\s*(HISTORY_STORAGE_KEY|['"]@tappay_tx_history)/.test(code);
      expect({file: f.rel, plaintext}).toEqual({file: f.rel, plaintext: false});
    }
    const store = files.find(f => f.rel === 'services/secureHistoryStore.ts')!;
    expect(store.text).toMatch(/gcm\(/);
    expect(store.text).toMatch(/Keychain\.setGenericPassword/);
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
