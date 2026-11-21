import {ethers} from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../src/config/passkey', () => ({
  PASSKEY_RP_ID: 'tappay.test',
  PASSKEY_RP_NAME: 'TapPay',
  PASSKEY_FUNCTION: 'passkey-recovery',
  isPasskeyRecoveryConfigured: () => true,
}));
jest.mock('../src/services/wallet', () => ({hasWallet: jest.fn(), signMessage: jest.fn()}));

import {
  Deps,
  PasskeyRecoveryError,
  getPasskeyStatus,
  linkPasskey,
  recoverWithPasskey,
  removePasskey,
} from '../src/services/passkeyRecovery';
import {blobDigest, decryptRecovery, encryptRecovery, toBase64Url} from '../src/services/passkeyRecovery/crypto';
import {buildPasskeyProofMessage} from '../src/services/passkeyRecovery/message';
import type {PasskeyProvider} from '../src/services/passkeyRecovery/provider';
import type {PasskeyRecoveryApi, StoredBlob, WriteParams} from '../src/services/passkeyRecovery/api';

type Row = StoredBlob;

/** In-memory stand-in for the Edge Function; verifies the wallet proof like the server does. */
function fakeApi() {
  const rows = new Map<string, Row>();
  const puts: WriteParams[] = [];
  const api: PasskeyRecoveryApi = {
    async put(p) {
      puts.push(p);
      const message = buildPasskeyProofMessage({
        action: 'put',
        credentialId: p.credentialId,
        walletAddress: p.walletAddress,
        digest: p.digest,
        issuedAt: p.issuedAt,
      });
      if (ethers.verifyMessage(message, p.signature).toLowerCase() !== p.walletAddress) {
        throw new PasskeyRecoveryError('AUTH_FAILED', 'bad signature');
      }
      if (!p.blob || blobDigest(p.blob) !== p.digest) {
        throw new PasskeyRecoveryError('AUTH_FAILED', 'bad digest');
      }
      for (const [id, row] of rows) {
        if (row.walletAddress === p.walletAddress) {
          rows.delete(id);
        }
      }
      rows.set(p.credentialId, {...p.blob, walletAddress: p.walletAddress});
    },
    async remove(p) {
      const message = buildPasskeyProofMessage({
        action: 'delete',
        credentialId: p.credentialId,
        walletAddress: p.walletAddress,
        digest: '-',
        issuedAt: p.issuedAt,
      });
      if (ethers.verifyMessage(message, p.signature).toLowerCase() !== p.walletAddress) {
        throw new PasskeyRecoveryError('AUTH_FAILED', 'bad signature');
      }
      rows.delete(p.credentialId);
    },
    async get(id) {
      const row = rows.get(id);
      if (!row) {
        throw new PasskeyRecoveryError('NOT_FOUND', 'none');
      }
      return {...row};
    },
  };
  return {api, rows, puts};
}

/** Fake authenticator with PRF. `active` is the passkey the user picks on `get()`. */
function fakeProvider() {
  const prfs = new Map<string, Uint8Array>();
  let active: string | null = null;
  let counter = 0;
  const provider: PasskeyProvider = {
    isSupported: () => true,
    async create() {
      const credentialId = toBase64Url(ethers.randomBytes(24)) + String(counter++);
      const prfOutput = ethers.randomBytes(32);
      prfs.set(credentialId, new Uint8Array(prfOutput));
      active = credentialId;
      return {credentialId, prfOutput};
    },
    async get() {
      if (!active) {
        throw new PasskeyRecoveryError('NOT_FOUND', 'no passkey');
      }
      return {credentialId: active, prfOutput: new Uint8Array(prfs.get(active)!)};
    },
  };
  return {
    provider,
    prfs,
    use: (id: string | null) => {
      active = id;
    },
    forge: (id: string, prf: Uint8Array) => {
      prfs.set(id, prf);
      active = id;
    },
  };
}

function setup() {
  const wallet = ethers.Wallet.createRandom();
  const phrase = wallet.mnemonic!.phrase;
  const address = wallet.address;
  const server = fakeApi();
  const authn = fakeProvider();
  let walletPresent = true;
  const signer = ethers.HDNodeWallet.fromPhrase(phrase);
  const deps: Deps = {
    provider: authn.provider,
    api: server.api,
    sign: async m => signer.signMessage(m),
    walletExists: async () => walletPresent,
    now: () => new Date(),
  };
  return {
    phrase,
    address,
    server,
    authn,
    deps,
    setWallet: (v: boolean) => {
      walletPresent = v;
    },
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('crypto', () => {
  const prf = ethers.randomBytes(32);
  const addr = '0x1111111111111111111111111111111111111111';

  it('round-trips and binds to credential and wallet', () => {
    const secret = {t: 'phrase' as const, v: 'one two three'};
    const blob = encryptRecovery({secret, prfOutput: prf, credentialId: 'cred-A', walletAddress: addr});
    expect(blob.ciphertext).not.toContain('one');
    expect(decryptRecovery({blob, prfOutput: prf, credentialId: 'cred-A', walletAddress: addr})).toEqual(secret);
    const other = {blob, prfOutput: prf, walletAddress: addr};
    expect(() => decryptRecovery({...other, credentialId: 'cred-B'})).toThrow(PasskeyRecoveryError);
    expect(() =>
      decryptRecovery({...other, credentialId: 'cred-A', walletAddress: '0x2222222222222222222222222222222222222222'}),
    ).toThrow(PasskeyRecoveryError);
    expect(() =>
      decryptRecovery({blob, prfOutput: ethers.randomBytes(32), credentialId: 'cred-A', walletAddress: addr}),
    ).toThrow(PasskeyRecoveryError);
  });

  it('uses a fresh nonce for every blob', () => {
    const secret = {t: 'key' as const, v: '0x' + '11'.repeat(32)};
    const a = encryptRecovery({secret, prfOutput: prf, credentialId: 'c', walletAddress: addr});
    const b = encryptRecovery({secret, prfOutput: prf, credentialId: 'c', walletAddress: addr});
    expect(a.nonce).not.toEqual(b.nonce);
    expect(a.ciphertext).not.toEqual(b.ciphertext);
  });

  it('fails closed on tampering and unknown versions', () => {
    const blob = encryptRecovery({secret: {t: 'phrase', v: 'x y z'}, prfOutput: prf, credentialId: 'c', walletAddress: addr});
    const flip = blob.ciphertext.slice(0, -2) + (blob.ciphertext.endsWith('AA') ? 'BB' : 'AA');
    expect(() => decryptRecovery({blob: {...blob, ciphertext: flip}, prfOutput: prf, credentialId: 'c', walletAddress: addr})).toThrow(
      'Could not unlock',
    );
    expect(() => decryptRecovery({blob: {...blob, version: 2}, prfOutput: prf, credentialId: 'c', walletAddress: addr})).toThrow(
      'Could not unlock',
    );
    expect(() => decryptRecovery({blob, prfOutput: new Uint8Array(8), credentialId: 'c', walletAddress: addr})).toThrow(
      'Could not unlock',
    );
  });
});

describe('link and recover', () => {
  it('link -> wipe device wallet -> recover with passkey returns the same wallet', async () => {
    const t = setup();
    const status = await linkPasskey({t: 'phrase', v: t.phrase}, t.address, t.deps);
    expect(status.linked).toBe(true);
    expect((await getPasskeyStatus()).linked).toBe(true);

    t.setWallet(false); // new / wiped device
    await AsyncStorage.clear();
    const recovered = await recoverWithPasskey(t.deps);
    expect(recovered.address).toBe(t.address);
    expect(recovered.secret).toEqual({t: 'phrase', v: t.phrase});
  });

  it('supports wallets imported from a raw private key', async () => {
    const t = setup();
    const raw = ethers.Wallet.createRandom();
    const signer = raw;
    const deps = {...t.deps, sign: async (m: string) => signer.signMessage(m)};
    await linkPasskey({t: 'key', v: raw.privateKey}, raw.address, deps);
    t.setWallet(false);
    const recovered = await recoverWithPasskey(deps);
    expect(recovered.address).toBe(raw.address);
    expect(recovered.secret.t).toBe('key');
  });

  it('never sends the phrase, key or PRF output to the server', async () => {
    const t = setup();
    await linkPasskey({t: 'phrase', v: t.phrase}, t.address, t.deps);
    const sent = JSON.stringify(t.server.puts);
    for (const word of t.phrase.split(' ')) {
      expect(sent).not.toContain(` ${word} `);
    }
    expect(sent).not.toContain(t.phrase);
    const [credentialId] = [...t.authn.prfs.keys()];
    expect(sent).not.toContain(toBase64Url(t.authn.prfs.get(credentialId)!));
  });

  it('does not log anything during link or recover', async () => {
    const spies = (['log', 'warn', 'error', 'info', 'debug'] as const).map(k => jest.spyOn(console, k).mockImplementation(() => {}));
    const t = setup();
    await linkPasskey({t: 'phrase', v: t.phrase}, t.address, t.deps);
    t.setWallet(false);
    await recoverWithPasskey(t.deps);
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
  });

  it('replaces the previous blob when linking again', async () => {
    const t = setup();
    await linkPasskey({t: 'phrase', v: t.phrase}, t.address, t.deps);
    await linkPasskey({t: 'phrase', v: t.phrase}, t.address, t.deps);
    expect(t.server.rows.size).toBe(1);
  });
});

describe('guards', () => {
  it('refuses to link without a wallet, with a mismatching secret, or an invalid secret', async () => {
    const t = setup();
    t.setWallet(false);
    await expect(linkPasskey({t: 'phrase', v: t.phrase}, t.address, t.deps)).rejects.toMatchObject({code: 'NO_WALLET'});
    t.setWallet(true);
    const other = ethers.Wallet.createRandom();
    await expect(linkPasskey({t: 'phrase', v: other.mnemonic!.phrase}, t.address, t.deps)).rejects.toMatchObject({
      code: 'INVALID_SECRET',
    });
    await expect(linkPasskey({t: 'phrase', v: 'not a real phrase'}, t.address, t.deps)).rejects.toMatchObject({
      code: 'INVALID_SECRET',
    });
    expect(t.server.rows.size).toBe(0);
  });

  it('refuses to recover when a wallet already exists', async () => {
    const t = setup();
    await linkPasskey({t: 'phrase', v: t.phrase}, t.address, t.deps);
    await expect(recoverWithPasskey(t.deps)).rejects.toMatchObject({code: 'WALLET_EXISTS'});
  });

  it('does not store anything locally if the upload fails', async () => {
    const t = setup();
    t.deps.api = {...t.server.api, put: async () => { throw new PasskeyRecoveryError('NETWORK', 'down'); }};
    await expect(linkPasskey({t: 'phrase', v: t.phrase}, t.address, t.deps)).rejects.toMatchObject({code: 'NETWORK'});
    expect((await getPasskeyStatus()).linked).toBe(false);
  });

  it('fails when device authentication is cancelled', async () => {
    const t = setup();
    t.deps.sign = async () => null;
    await expect(linkPasskey({t: 'phrase', v: t.phrase}, t.address, t.deps)).rejects.toMatchObject({code: 'AUTH_FAILED'});
    expect(t.server.rows.size).toBe(0);
  });
});

describe('wrong or tampered data fails closed', () => {
  async function linked() {
    const t = setup();
    await linkPasskey({t: 'phrase', v: t.phrase}, t.address, t.deps);
    t.setWallet(false);
    const [credentialId] = [...t.server.rows.keys()];
    return {t, credentialId};
  }

  it('wrong passkey for the stored credential', async () => {
    const {t, credentialId} = await linked();
    t.authn.forge(credentialId, ethers.randomBytes(32));
    await expect(recoverWithPasskey(t.deps)).rejects.toMatchObject({code: 'DECRYPT_FAILED'});
  });

  it('unknown passkey', async () => {
    const {t} = await linked();
    t.authn.forge('some-other-credential-id-0000', ethers.randomBytes(32));
    await expect(recoverWithPasskey(t.deps)).rejects.toMatchObject({code: 'NOT_FOUND'});
  });

  it('tampered ciphertext', async () => {
    const {t, credentialId} = await linked();
    const row = t.server.rows.get(credentialId)!;
    row.ciphertext = row.ciphertext.slice(0, -3) + (row.ciphertext.endsWith('AAA') ? 'BBB' : 'AAA');
    await expect(recoverWithPasskey(t.deps)).rejects.toMatchObject({code: 'DECRYPT_FAILED'});
  });

  it('blob moved to another wallet address', async () => {
    const {t, credentialId} = await linked();
    t.server.rows.get(credentialId)!.walletAddress = ethers.Wallet.createRandom().address.toLowerCase();
    await expect(recoverWithPasskey(t.deps)).rejects.toMatchObject({code: 'DECRYPT_FAILED'});
  });

  it('blob copied under another credential id', async () => {
    const {t, credentialId} = await linked();
    const row = t.server.rows.get(credentialId)!;
    const prf = t.authn.prfs.get(credentialId)!;
    t.server.rows.set('copied-credential-id-000000', {...row});
    t.authn.forge('copied-credential-id-000000', prf);
    await expect(recoverWithPasskey(t.deps)).rejects.toMatchObject({code: 'DECRYPT_FAILED'});
  });
});

describe('remove', () => {
  it('deletes the blob and clears status', async () => {
    const t = setup();
    await linkPasskey({t: 'phrase', v: t.phrase}, t.address, t.deps);
    expect(t.server.rows.size).toBe(1);
    const status = await removePasskey(t.address, t.deps);
    expect(status.linked).toBe(false);
    expect(t.server.rows.size).toBe(0);
    expect((await getPasskeyStatus()).linked).toBe(false);
  });

  it('is a no-op when nothing is linked', async () => {
    const t = setup();
    await expect(removePasskey(t.address, t.deps)).resolves.toEqual({linked: false});
  });
});
