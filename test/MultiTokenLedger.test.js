const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiTokenLedger", function () {
  let MultiTokenLedger, ledger;
  let MockERC20, ausd, usdc;
  let owner, sender, recipient, attacker;
  let sessionIdHash;

  beforeEach(async function () {
    [owner, sender, recipient, attacker] = await ethers.getSigners();

    // Deploy mock ERC-20 tokens
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    ausd = await MockERC20Factory.deploy("Agora Dollar", "AUSD");
    await ausd.waitForDeployment();
    
    usdc = await MockERC20Factory.deploy("USD Coin", "USDC");
    await usdc.waitForDeployment();

    // Deploy MultiTokenLedger
    MultiTokenLedger = await ethers.getContractFactory("MultiTokenLedger");
    ledger = await MultiTokenLedger.deploy();
    await ledger.waitForDeployment();

    // Setup initial state
    // Mint 1000 tokens to sender
    const amountToMint = ethers.parseUnits("1000", 6);
    await ausd.mint(sender.address, amountToMint);
    await usdc.mint(sender.address, amountToMint);

    // Whitelist tokens
    await ledger.setSupportedToken(await ausd.getAddress(), true);
    await ledger.setSupportedToken(await usdc.getAddress(), true);

    sessionIdHash = ethers.id("session-123");
  });

  describe("Native MON Payments", function () {
    it("should process native MON payment successfully", async function () {
      const amount = ethers.parseEther("1.5");
      
      const recipientInitialBalance = await ethers.provider.getBalance(recipient.address);

      await expect(ledger.connect(sender).payWithLog(recipient.address, sessionIdHash, { value: amount }))
        .to.emit(ledger, "PaymentLogged")
        .withArgs(sender.address, recipient.address, ethers.ZeroAddress, amount, sessionIdHash);

      const recipientFinalBalance = await ethers.provider.getBalance(recipient.address);
      expect(recipientFinalBalance - recipientInitialBalance).to.equal(amount);
      expect(await ledger.processedSessions(sender.address, sessionIdHash)).to.be.true;
    });

    it("should fail if session is already processed", async function () {
      const amount = ethers.parseEther("1.0");
      await ledger.connect(sender).payWithLog(recipient.address, sessionIdHash, { value: amount });
      
      await expect(
        ledger.connect(sender).payWithLog(recipient.address, sessionIdHash, { value: amount })
      ).to.be.revertedWithCustomError(ledger, "SessionAlreadyProcessed");
    });
  });

  describe("ERC-20 Payments", function () {
    it("should process AUSD payment successfully", async function () {
      const amount = ethers.parseUnits("10", 6);
      const ausdAddress = await ausd.getAddress();

      // Sender approves ledger to spend AUSD
      await ausd.connect(sender).approve(await ledger.getAddress(), amount);

      await expect(ledger.connect(sender).payERC20WithLog(ausdAddress, recipient.address, amount, sessionIdHash))
        .to.emit(ledger, "PaymentLogged")
        .withArgs(sender.address, recipient.address, ausdAddress, amount, sessionIdHash);

      expect(await ausd.balanceOf(recipient.address)).to.equal(amount);
      expect(await ledger.processedSessions(sender.address, sessionIdHash)).to.be.true;
    });

    it("should reject tokens that are not whitelisted", async function () {
      const amount = ethers.parseUnits("10", 6);
      const mockToken = await (await ethers.getContractFactory("MockERC20")).deploy("Fake", "FAKE");
      await mockToken.waitForDeployment();
      
      await expect(
        ledger.connect(sender).payERC20WithLog(await mockToken.getAddress(), recipient.address, amount, sessionIdHash)
      ).to.be.revertedWithCustomError(ledger, "UnsupportedToken");
    });
    
    it("should reject a token after its whitelist approval is revoked", async function () {
      const amount = ethers.parseUnits("10", 6);
      const tokenAddress = await ausd.getAddress();
      await ausd.connect(sender).approve(await ledger.getAddress(), amount);
      await ledger.setSupportedToken(tokenAddress, false);

      await expect(
        ledger.connect(sender).payERC20WithLog(tokenAddress, recipient.address, amount, sessionIdHash)
      ).to.be.revertedWithCustomError(ledger, "UnsupportedToken");
      expect(await ledger.processedSessions(sender.address, sessionIdHash)).to.be.false;
      expect(await ausd.balanceOf(recipient.address)).to.equal(0);
    });

    it("should prevent non-owners from whitelisting tokens", async function () {
      await expect(
        ledger.connect(sender).setSupportedToken(recipient.address, true)
      ).to.be.revertedWithCustomError(ledger, "OwnableUnauthorizedAccount")
        .withArgs(sender.address);
    });

    it("should fail without approval", async function () {
      const amount = ethers.parseUnits("10", 6);
      
      await expect(
        ledger.connect(sender).payERC20WithLog(await ausd.getAddress(), recipient.address, amount, sessionIdHash)
      ).to.be.reverted;
    });
  });

  describe("Non-standard ERC-20 payments", function () {
    const amount = ethers.parseUnits("10", 6);

    async function prepareToken(name, ...args) {
      const token = await (await ethers.getContractFactory(name)).deploy(...args);
      await token.waitForDeployment();
      await token.mint(sender.address, amount);
      await token.connect(sender).approve(await ledger.getAddress(), amount);
      await ledger.setSupportedToken(await token.getAddress(), true);
      return token;
    }

    it("should accept a USDT-like token with no transfer return value", async function () {
      const token = await prepareToken("NoReturnToken");
      const tokenAddress = await token.getAddress();

      await expect(
        ledger.connect(sender).payERC20WithLog(tokenAddress, recipient.address, amount, sessionIdHash)
      ).to.emit(ledger, "PaymentLogged")
        .withArgs(sender.address, recipient.address, tokenAddress, amount, sessionIdHash);

      expect(await token.balanceOf(recipient.address)).to.equal(amount);
      expect(await token.balanceOf(sender.address)).to.equal(0);
      expect(await token.allowance(sender.address, await ledger.getAddress())).to.equal(0);
      expect(await ledger.processedSessions(sender.address, sessionIdHash)).to.be.true;
      await expect(
        ledger.connect(sender).payERC20WithLog(tokenAddress, recipient.address, amount, sessionIdHash)
      ).to.be.revertedWithCustomError(ledger, "SessionAlreadyProcessed");
    });

    it("should reject false-returning tokens and roll back the session", async function () {
      const token = await prepareToken("FalseReturnToken");
      const tokenAddress = await token.getAddress();

      await expect(
        ledger.connect(sender).payERC20WithLog(tokenAddress, recipient.address, amount, sessionIdHash)
      ).to.be.revertedWithCustomError(ledger, "SafeERC20FailedOperation")
        .withArgs(tokenAddress);

      expect(await ledger.processedSessions(sender.address, sessionIdHash)).to.be.false;
      expect(await token.balanceOf(recipient.address)).to.equal(0);
      expect(await token.balanceOf(sender.address)).to.equal(amount);
    });

    it("should log only the received amount after a transfer fee", async function () {
      const token = await prepareToken("FeeOnTransferToken", 1000);
      const tokenAddress = await token.getAddress();
      const initialBalance = 123n;
      await token.mint(recipient.address, initialBalance);
      const received = amount * 9n / 10n;

      await expect(
        ledger.connect(sender).payERC20WithLog(tokenAddress, recipient.address, amount, sessionIdHash)
      ).to.emit(ledger, "PaymentLogged")
        .withArgs(sender.address, recipient.address, tokenAddress, received, sessionIdHash);

      expect(await token.balanceOf(recipient.address)).to.equal(initialBalance + received);
      expect(await token.balanceOf(sender.address)).to.equal(0);
      expect(await ledger.processedSessions(sender.address, sessionIdHash)).to.be.true;
    });

    it("should reject zero received tokens and roll back balances and approval", async function () {
      const token = await prepareToken("FeeOnTransferToken", 10000);
      const tokenAddress = await token.getAddress();
      await token.mint(recipient.address, 123n);

      await expect(
        ledger.connect(sender).payERC20WithLog(tokenAddress, recipient.address, amount, sessionIdHash)
      ).to.be.revertedWithCustomError(ledger, "ZeroReceivedAmount");

      expect(await ledger.processedSessions(sender.address, sessionIdHash)).to.be.false;
      expect(await token.balanceOf(sender.address)).to.equal(amount);
      expect(await token.balanceOf(recipient.address)).to.equal(123n);
      expect(await token.allowance(sender.address, await ledger.getAddress())).to.equal(amount);
      expect(await token.totalSupply()).to.equal(amount + 123n);
    });

    it("should block callback reentrancy after marking the session", async function () {
      const token = await prepareToken("CallbackToken", await ledger.getAddress());
      const reentrySession = ethers.id("reentry-session");
      await token.setSessions(sessionIdHash, reentrySession);

      await expect(
        ledger.connect(sender).payERC20WithLog(
          await token.getAddress(), recipient.address, amount, sessionIdHash
        )
      ).to.be.revertedWithCustomError(ledger, "ReentrancyGuardReentrantCall");

      expect(await ledger.processedSessions(sender.address, sessionIdHash)).to.be.false;
      expect(await ledger.processedSessions(sender.address, reentrySession)).to.be.false;
      expect(await token.balanceOf(sender.address)).to.equal(amount);
      expect(await token.balanceOf(recipient.address)).to.equal(0);
    });
  });

  describe("Per-payer replay protection", function () {
    it("should allow a native payment after another payer front-runs its session", async function () {
      const amount = ethers.parseEther("1");
      expect(await ledger.processedSessions(sender.address, sessionIdHash)).to.be.false;
      await ledger.connect(attacker).payWithLog(recipient.address, sessionIdHash, { value: 1 });
      expect(await ledger.processedSessions(attacker.address, sessionIdHash)).to.be.true;
      expect(await ledger.processedSessions(sender.address, sessionIdHash)).to.be.false;

      await expect(
        ledger.connect(sender).payWithLog(recipient.address, sessionIdHash, { value: amount })
      ).to.emit(ledger, "PaymentLogged")
        .withArgs(sender.address, recipient.address, ethers.ZeroAddress, amount, sessionIdHash);
      expect(await ledger.processedSessions(sender.address, sessionIdHash)).to.be.true;
    });

    it("should allow an ERC-20 payment after another payer front-runs its session", async function () {
      const amount = ethers.parseUnits("10", 6);
      const token = await ausd.getAddress();
      await ausd.mint(attacker.address, 1);
      await ausd.connect(attacker).approve(await ledger.getAddress(), 1);
      await ausd.connect(sender).approve(await ledger.getAddress(), amount);

      await ledger.connect(attacker).payERC20WithLog(token, recipient.address, 1, sessionIdHash);
      expect(await ledger.processedSessions(attacker.address, sessionIdHash)).to.be.true;
      expect(await ledger.processedSessions(sender.address, sessionIdHash)).to.be.false;
      await expect(
        ledger.connect(sender).payERC20WithLog(token, recipient.address, amount, sessionIdHash)
      ).to.emit(ledger, "PaymentLogged")
        .withArgs(sender.address, recipient.address, token, amount, sessionIdHash);
      expect(await ledger.processedSessions(sender.address, sessionIdHash)).to.be.true;
      expect(await ausd.balanceOf(recipient.address)).to.equal(amount + 1n);

      await expect(
        ledger.connect(sender).payERC20WithLog(token, recipient.address, amount, sessionIdHash)
      ).to.be.revertedWithCustomError(ledger, "SessionAlreadyProcessed")
        .withArgs(sessionIdHash);
      await expect(
        ledger.connect(sender).payWithLog(recipient.address, sessionIdHash, { value: 1 })
      ).to.be.revertedWithCustomError(ledger, "SessionAlreadyProcessed")
        .withArgs(sessionIdHash);
    });

    it("should reject the same payer's session across native and ERC-20 payments", async function () {
      const amount = ethers.parseUnits("10", 6);
      await ausd.connect(sender).approve(await ledger.getAddress(), amount);
      await ledger.connect(sender).payWithLog(recipient.address, sessionIdHash, { value: 1 });

      await expect(
        ledger.connect(sender).payERC20WithLog(await ausd.getAddress(), recipient.address, amount, sessionIdHash)
      ).to.be.revertedWithCustomError(ledger, "SessionAlreadyProcessed")
        .withArgs(sessionIdHash);
      expect(await ledger.processedSessions(sender.address, sessionIdHash)).to.be.true;
      expect(await ledger.processedSessions(attacker.address, sessionIdHash)).to.be.false;
      expect(await ausd.balanceOf(recipient.address)).to.equal(0);
    });
  });

  describe("Validation", function () {
    for (const [description, getRecipient] of [
      ["the zero address", () => ethers.ZeroAddress],
      ["the ledger itself", () => ledger.getAddress()],
    ]) {
      it(`should reject native payments to ${description} without consuming the session`, async function () {
        const amount = 100n;
        const recipientBalance = await ethers.provider.getBalance(recipient.address);

        await expect(
          ledger.connect(sender).payWithLog(await getRecipient(), sessionIdHash, { value: amount })
        ).to.be.revertedWithCustomError(ledger, "InvalidRecipient");

        expect(await ethers.provider.getBalance(await ledger.getAddress())).to.equal(0);
        expect(await ledger.processedSessions(sender.address, sessionIdHash)).to.be.false;
        await expect(
          ledger.connect(sender).payWithLog(recipient.address, sessionIdHash, { value: amount })
        ).to.emit(ledger, "PaymentLogged")
          .withArgs(sender.address, recipient.address, ethers.ZeroAddress, amount, sessionIdHash);
        expect(await ethers.provider.getBalance(recipient.address)).to.equal(recipientBalance + amount);
      });

      it(`should reject ERC-20 payments to ${description} without moving tokens or consuming allowance`, async function () {
        const amount = ethers.parseUnits("10", 6);
        const ledgerAddress = await ledger.getAddress();
        const senderBalance = await ausd.balanceOf(sender.address);
        await ausd.connect(sender).approve(ledgerAddress, amount);

        await expect(
          ledger.connect(sender).payERC20WithLog(await ausd.getAddress(), await getRecipient(), amount, sessionIdHash)
        ).to.be.revertedWithCustomError(ledger, "InvalidRecipient");

        expect(await ausd.balanceOf(sender.address)).to.equal(senderBalance);
        expect(await ausd.balanceOf(ledgerAddress)).to.equal(0);
        expect(await ausd.balanceOf(ethers.ZeroAddress)).to.equal(0);
        expect(await ausd.allowance(sender.address, ledgerAddress)).to.equal(amount);
        expect(await ledger.processedSessions(sender.address, sessionIdHash)).to.be.false;
        await expect(
          ledger.connect(sender).payERC20WithLog(await ausd.getAddress(), recipient.address, amount, sessionIdHash)
        ).to.emit(ledger, "PaymentLogged")
          .withArgs(sender.address, recipient.address, await ausd.getAddress(), amount, sessionIdHash);
        expect(await ausd.balanceOf(recipient.address)).to.equal(amount);
        expect(await ausd.allowance(sender.address, ledgerAddress)).to.equal(0);
      });
    }

    it("should reject self payments", async function () {
      await expect(
        ledger.connect(sender).payWithLog(sender.address, sessionIdHash, { value: 100 })
      ).to.be.revertedWithCustomError(ledger, "SelfPayment");
    });

    it("should reject ERC-20 payer-self payments without moving tokens", async function () {
      const amount = ethers.parseUnits("10", 6);
      const ledgerAddress = await ledger.getAddress();
      const senderBalance = await ausd.balanceOf(sender.address);
      await ausd.connect(sender).approve(ledgerAddress, amount);

      await expect(
        ledger.connect(sender).payERC20WithLog(await ausd.getAddress(), sender.address, amount, sessionIdHash)
      ).to.be.revertedWithCustomError(ledger, "SelfPayment");
      expect(await ausd.balanceOf(sender.address)).to.equal(senderBalance);
      expect(await ausd.allowance(sender.address, ledgerAddress)).to.equal(amount);
      expect(await ledger.processedSessions(sender.address, sessionIdHash)).to.be.false;
    });

    it("should reject zero amount payments", async function () {
      await expect(
        ledger.connect(sender).payWithLog(recipient.address, sessionIdHash, { value: 0 })
      ).to.be.revertedWithCustomError(ledger, "ZeroAmount");
    });
  });
});
