const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TapPayLedger", function () {
  let ledger;
  let owner, sender, receiver, attacker;

  const SESSION_ID_1 = ethers.keccak256(ethers.toUtf8Bytes("session-uuid-1"));
  const SESSION_ID_2 = ethers.keccak256(ethers.toUtf8Bytes("session-uuid-2"));
  const ONE_MON = ethers.parseEther("1.0");
  const FIVE_MON = ethers.parseEther("5.0");

  beforeEach(async function () {
    [owner, sender, receiver, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TapPayLedger");
    ledger = await Factory.deploy();
    await ledger.waitForDeployment();
  });

  // ──────────────────────────────────────────────
  // Happy Path
  // ──────────────────────────────────────────────
  describe("Happy Path", function () {
    it("should transfer funds and emit PaymentLogged event", async function () {
      const receiverBalBefore = await ethers.provider.getBalance(receiver.address);

      const tx = await ledger.connect(sender).payWithLog(receiver.address, SESSION_ID_1, {
        value: ONE_MON,
      });

      await expect(tx)
        .to.emit(ledger, "PaymentLogged")
        .withArgs(sender.address, receiver.address, ONE_MON, SESSION_ID_1, () => true);

      const receiverBalAfter = await ethers.provider.getBalance(receiver.address);
      expect(receiverBalAfter - receiverBalBefore).to.equal(ONE_MON);
    });

    it("should mark session as used after payment", async function () {
      await ledger.connect(sender).payWithLog(receiver.address, SESSION_ID_1, {
        value: ONE_MON,
      });
      expect(await ledger.isSessionUsed(SESSION_ID_1)).to.be.true;
    });

    it("should allow multiple payments with different session IDs", async function () {
      await ledger.connect(sender).payWithLog(receiver.address, SESSION_ID_1, {
        value: ONE_MON,
      });
      await ledger.connect(sender).payWithLog(receiver.address, SESSION_ID_2, {
        value: FIVE_MON,
      });
      expect(await ledger.isSessionUsed(SESSION_ID_1)).to.be.true;
      expect(await ledger.isSessionUsed(SESSION_ID_2)).to.be.true;
    });

    it("should report unused sessions correctly", async function () {
      expect(await ledger.isSessionUsed(SESSION_ID_1)).to.be.false;
    });

    it("should not hold any funds (pass-through)", async function () {
      await ledger.connect(sender).payWithLog(receiver.address, SESSION_ID_1, {
        value: ONE_MON,
      });
      const contractBalance = await ethers.provider.getBalance(
        await ledger.getAddress()
      );
      expect(contractBalance).to.equal(0);
    });
  });

  // ──────────────────────────────────────────────
  // Input Validation
  // ──────────────────────────────────────────────
  describe("Input Validation", function () {
    it("should reject zero address recipient", async function () {
      await expect(
        ledger.connect(sender).payWithLog(ethers.ZeroAddress, SESSION_ID_1, { value: ONE_MON })
      ).to.be.revertedWithCustomError(ledger, "InvalidRecipient");
    });

    it("should reject self-payment", async function () {
      await expect(
        ledger.connect(sender).payWithLog(sender.address, SESSION_ID_1, { value: ONE_MON })
      ).to.be.revertedWithCustomError(ledger, "SelfPayment");
    });

    it("should reject zero amount", async function () {
      await expect(
        ledger.connect(sender).payWithLog(receiver.address, SESSION_ID_1, { value: 0 })
      ).to.be.revertedWithCustomError(ledger, "ZeroAmount");
    });
  });

  // ──────────────────────────────────────────────
  // Session Replay Protection
  // ──────────────────────────────────────────────
  describe("Session Replay Protection", function () {
    it("should reject reused session ID", async function () {
      await ledger.connect(sender).payWithLog(receiver.address, SESSION_ID_1, {
        value: ONE_MON,
      });
      await expect(
        ledger.connect(sender).payWithLog(receiver.address, SESSION_ID_1, { value: ONE_MON })
      )
        .to.be.revertedWithCustomError(ledger, "SessionAlreadyUsed")
        .withArgs(SESSION_ID_1);
    });

    it("should reject reused session ID even from different sender", async function () {
      await ledger.connect(sender).payWithLog(receiver.address, SESSION_ID_1, {
        value: ONE_MON,
      });
      await expect(
        ledger.connect(attacker).payWithLog(receiver.address, SESSION_ID_1, { value: ONE_MON })
      )
        .to.be.revertedWithCustomError(ledger, "SessionAlreadyUsed")
        .withArgs(SESSION_ID_1);
    });
  });

  // ──────────────────────────────────────────────
  // Reentrancy Protection
  // ──────────────────────────────────────────────
  describe("Reentrancy Protection", function () {
    it("should resist reentrancy attack via malicious receiver", async function () {
      // Deploy a malicious contract that tries to re-enter payWithLog on receive
      const MaliciousFactory = await ethers.getContractFactory("ReentrancyAttacker");
      const malicious = await MaliciousFactory.deploy(await ledger.getAddress());
      await malicious.waitForDeployment();

      const maliciousAddress = await malicious.getAddress();
      const attackSessionId = ethers.keccak256(ethers.toUtf8Bytes("attack-session"));
      const attackSessionId2 = ethers.keccak256(ethers.toUtf8Bytes("attack-session-2"));

      // Set up the malicious contract with a second session ID for re-entry
      await malicious.setReentryParams(receiver.address, attackSessionId2);

      // The malicious contract tries to re-enter when it receives funds
      // This should revert due to ReentrancyGuard
      await expect(
        ledger.connect(sender).payWithLog(maliciousAddress, attackSessionId, {
          value: ONE_MON,
        })
      ).to.be.reverted;
    });
  });

  // ──────────────────────────────────────────────
  // Pause / Unpause
  // ──────────────────────────────────────────────
  describe("Pause / Unpause", function () {
    it("should block payments when paused", async function () {
      await ledger.connect(owner).pause();
      await expect(
        ledger.connect(sender).payWithLog(receiver.address, SESSION_ID_1, { value: ONE_MON })
      ).to.be.revertedWithCustomError(ledger, "EnforcedPause");
    });

    it("should allow payments after unpause", async function () {
      await ledger.connect(owner).pause();
      await ledger.connect(owner).unpause();
      await ledger.connect(sender).payWithLog(receiver.address, SESSION_ID_1, {
        value: ONE_MON,
      });
      expect(await ledger.isSessionUsed(SESSION_ID_1)).to.be.true;
    });

    it("should only allow owner to pause", async function () {
      await expect(
        ledger.connect(sender).pause()
      ).to.be.revertedWithCustomError(ledger, "OwnableUnauthorizedAccount");
    });

    it("should only allow owner to unpause", async function () {
      await ledger.connect(owner).pause();
      await expect(
        ledger.connect(sender).unpause()
      ).to.be.revertedWithCustomError(ledger, "OwnableUnauthorizedAccount");
    });
  });

  // ──────────────────────────────────────────────
  // Ownership (Ownable2Step)
  // ──────────────────────────────────────────────
  describe("Ownership (Ownable2Step)", function () {
    it("should set deployer as initial owner", async function () {
      expect(await ledger.owner()).to.equal(owner.address);
    });

    it("should require two-step ownership transfer", async function () {
      await ledger.connect(owner).transferOwnership(sender.address);
      expect(await ledger.owner()).to.equal(owner.address);
      await ledger.connect(sender).acceptOwnership();
      expect(await ledger.owner()).to.equal(sender.address);
    });
  });
});
