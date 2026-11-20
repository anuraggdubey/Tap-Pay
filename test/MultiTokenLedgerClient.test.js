const {expect} = require('chai');
const {ethers} = require('hardhat');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

function loadClient(ledgerAddress) {
  const filename = path.resolve(__dirname, '../src/services/multiTokenLedger.ts');
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  });
  const client = new Module(filename, module);
  client.filename = filename;
  client.paths = module.paths;
  client.require = id => {
    if (id === '../config/monad') {
      return {MONAD_CONFIG: {contracts: {multiTokenLedger: ledgerAddress}}};
    }
    if (id === '../utils/paymentSession') {
      return {createSessionIdHash: () => ethers.hexlify(ethers.randomBytes(32))};
    }
    return require(id);
  };
  client._compile(compiled.outputText, filename);
  return client.exports;
}

describe('MultiTokenLedger client with USDT-like approvals', function () {
  let ledger, token, sender, recipient, client, ledgerAddress, tokenAddress;

  beforeEach(async function () {
    [, sender, recipient] = await ethers.getSigners();
    ledger = await (await ethers.getContractFactory('MultiTokenLedger')).deploy();
    token = await (await ethers.getContractFactory('NoReturnToken')).deploy();
    ledgerAddress = await ledger.getAddress();
    tokenAddress = await token.getAddress();
    client = loadClient(ledgerAddress);
    await ledger.setSupportedToken(tokenAddress, true);
    await token.mint(sender.address, 100n);
  });

  for (const initial of [0n, 5n, 20n, 10n]) {
    it(`pays with no-return approvals from allowance ${initial}`, async function () {
      await token.connect(sender).approve(ledgerAddress, initial);
      if (initial !== 0n) {
        await expect(token.connect(sender).approve(ledgerAddress, 10n))
          .to.be.revertedWith('Reset allowance first');
      }
      const tx = await client.sendErc20ViaMultiTokenLedger(sender, tokenAddress, recipient.address, 10n);
      expect((await tx.wait()).status).to.equal(1);
      expect(await token.balanceOf(recipient.address)).to.equal(10n);
      expect(await token.allowance(sender.address, ledgerAddress)).to.equal(0n);
    });
  }

  it('returns the broadcast transaction without waiting or sending a revoke', async function () {
    let payment, broadcasts = 0, waits = 0;
    const signer = new Proxy(sender, {
      get(target, property) {
        if (property === 'sendTransaction') {
          return async request => {
            broadcasts++;
            const tx = await target.sendTransaction(request);
            if (request.to.toLowerCase() !== ledgerAddress.toLowerCase()) {
              return tx;
            }
            payment = new Proxy(tx, {
              get(response, key) {
                if (key === 'wait') {
                  return () => { waits++; throw new Error('receipt timeout'); };
                }
                return Reflect.get(response, key);
              },
            });
            return payment;
          };
        }
        const value = Reflect.get(target, property);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    const tx = await client.sendErc20ViaMultiTokenLedger(signer, tokenAddress, recipient.address, 10n);
    expect(tx.hash).to.equal(payment.hash);
    expect(waits).to.equal(0);
    expect(broadcasts).to.equal(2);
    expect(await token.balanceOf(recipient.address)).to.equal(10n);
  });

  it('revokes the exact allowance when payment estimation fails after approval', async function () {
    await token.connect(sender).approve(ledgerAddress, 5n);
    await ledger.setSupportedToken(tokenAddress, false);
    await expect(client.sendErc20ViaMultiTokenLedger(sender, tokenAddress, recipient.address, 10n))
      .to.be.rejected;
    expect(await token.allowance(sender.address, ledgerAddress)).to.equal(0n);
    expect(await token.balanceOf(sender.address)).to.equal(100n);
    expect(await token.balanceOf(recipient.address)).to.equal(0n);
  });
});
