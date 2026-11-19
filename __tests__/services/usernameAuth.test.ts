import {ethers} from 'ethers';
import {
  buildUsernameAuthMessage,
  normalizeUsername,
} from '../../src/services/usernameAuth';

describe('username ownership proof', () => {
  it('builds a stable, deterministic message', () => {
    const msg = buildUsernameAuthMessage({
      action: 'register',
      username: 'Alice',
      walletAddress: '0xAbC0000000000000000000000000000000000001',
      chainId: 143,
      issuedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(msg).toBe(
      [
        'TapPay username ownership proof',
        'action: register',
        'username: alice',
        'wallet: 0xabc0000000000000000000000000000000000001',
        'chain: 143',
        'issued: 2026-01-01T00:00:00.000Z',
      ].join('\n'),
    );
  });

  it('a signature recovers back to the signing wallet (what the server checks)', async () => {
    const wallet = ethers.Wallet.createRandom();
    const message = buildUsernameAuthMessage({
      action: 'register',
      username: 'alice',
      walletAddress: wallet.address,
      chainId: 143,
      issuedAt: new Date().toISOString(),
    });
    const signature = await wallet.signMessage(message);
    expect(ethers.verifyMessage(message, signature).toLowerCase()).toBe(
      wallet.address.toLowerCase(),
    );
  });

  it('a different wallet cannot produce a signature that recovers to the victim', async () => {
    const victim = ethers.Wallet.createRandom();
    const attacker = ethers.Wallet.createRandom();
    const message = buildUsernameAuthMessage({
      action: 'register',
      username: 'alice',
      walletAddress: victim.address, // attacker claims the victim's wallet
      chainId: 143,
      issuedAt: new Date().toISOString(),
    });
    const signature = await attacker.signMessage(message);
    expect(ethers.verifyMessage(message, signature).toLowerCase()).not.toBe(
      victim.address.toLowerCase(),
    );
  });

  it('normalizes look-alikes', () => {
    expect(normalizeUsername('Al1c0')).toBe('allco');
  });
});
