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

    it("should fail if token is not whitelisted and enforcement is on", async function () {
      const amount = ethers.parseUnits("10", 6);
      const mockToken = await (await ethers.getContractFactory("MockERC20")).deploy("Fake", "FAKE");
      await mockToken.waitForDeployment();
      
      await expect(
        ledger.connect(sender).payERC20WithLog(await mockToken.getAddress(), recipient.address, amount, sessionIdHash)
      ).to.be.revertedWithCustomError(ledger, "UnsupportedToken");
    });
    
    it("should succeed if token is not whitelisted but enforcement is off", async function () {
      const amount = ethers.parseUnits("10", 6);
      const mockToken = await (await ethers.getContractFactory("MockERC20")).deploy("Fake", "FAKE");
      await mockToken.waitForDeployment();
      const mockTokenAddress = await mockToken.getAddress();
      
      await mockToken.mint(sender.address, amount);
      await mockToken.connect(sender).approve(await ledger.getAddress(), amount);
      
      // Turn off whitelist enforcement
      await ledger.setTokenWhitelistEnforcement(false);
      
      await expect(ledger.connect(sender).payERC20WithLog(mockTokenAddress, recipient.address, amount, sessionIdHash))
        .to.emit(ledger, "PaymentLogged")
        .withArgs(sender.address, recipient.address, mockTokenAddress, amount, sessionIdHash);
    });

    it("should fail without approval", async function () {
      const amount = ethers.parseUnits("10", 6);
      
      await expect(
        ledger.connect(sender).payERC20WithLog(await ausd.getAddress(), recipient.address, amount, sessionIdHash)
      ).to.be.reverted;
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
    it("should reject self payments", async function () {
      await expect(
        ledger.connect(sender).payWithLog(sender.address, sessionIdHash, { value: 100 })
      ).to.be.revertedWithCustomError(ledger, "SelfPayment");
    });

    it("should reject zero amount payments", async function () {
      await expect(
        ledger.connect(sender).payWithLog(recipient.address, sessionIdHash, { value: 0 })
      ).to.be.revertedWithCustomError(ledger, "ZeroAmount");
    });
  });
});
