const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TapPayLedger", function () {
  let ledger;
  let owner, sender, receiver, attacker;

  const SESSION_ID_1 = ethers.keccak256(ethers.toUtf8Bytes("session-uuid-1"));
  const SESSION_ID_2 = ethers.keccak256(ethers.toUtf8Bytes("session-uuid-2"));
  const SESSION_ID_3 = ethers.keccak256(ethers.toUtf8Bytes("session-uuid-3"));
  const ONE_MON = ethers.parseEther("1.0");
  const FIVE_MON = ethers.parseEther("5.0");
  const MIN_PAYMENT = ethers.parseEther("0.0001");

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
    it("should transfer funds and emit PaymentLogged event (2-arg overload)", async function () {
      const receiverBalBefore = await ethers.provider.getBalance(receiver.address);

      const tx = await ledger.connect(sender)["payWithLog(address,bytes32)"](receiver.address, SESSION_ID_1, {
        value: ONE_MON,
      });

      await expect(tx)
        .to.emit(ledger, "PaymentLogged")
        .withArgs(sender.address, receiver.address, ONE_MON, SESSION_ID_1, () => true);

      const receiverBalAfter = await ethers.provider.getBalance(receiver.address);
      expect(receiverBalAfter - receiverBalBefore).to.equal(ONE_MON);
    });

    it("should transfer funds with 3-arg overload (deadline=0)", async function () {
      const receiverBalBefore = await ethers.provider.getBalance(receiver.address);

      const tx = await ledger.connect(sender)["payWithLog(address,bytes32,uint256)"](receiver.address, SESSION_ID_1, 0, {
        value: ONE_MON,
      });

      await expect(tx)
        .to.emit(ledger, "PaymentLogged")
        .withArgs(sender.address, receiver.address, ONE_MON, SESSION_ID_1, () => true);

      const receiverBalAfter = await ethers.provider.getBalance(receiver.address);
      expect(receiverBalAfter - receiverBalBefore).to.equal(ONE_MON);
    });

    it("should transfer funds with valid future deadline", async function () {
      const block = await ethers.provider.getBlock("latest");
      const futureDeadline = block.timestamp + 3600; // 1 hour from now

      const tx = await ledger.connect(sender)["payWithLog(address,bytes32,uint256)"](
        receiver.address, SESSION_ID_1, futureDeadline, { value: ONE_MON }
      );

      await expect(tx).to.emit(ledger, "PaymentLogged");
    });

    it("should mark session as used after payment", async function () {
      await ledger.connect(sender)["payWithLog(address,bytes32)"](receiver.address, SESSION_ID_1, {
        value: ONE_MON,
      });
      expect(await ledger.isSessionUsed(SESSION_ID_1)).to.be.true;
    });

    it("should allow multiple payments with different session IDs", async function () {
      await ledger.connect(sender)["payWithLog(address,bytes32)"](receiver.address, SESSION_ID_1, {
        value: ONE_MON,
      });
      await ledger.connect(sender)["payWithLog(address,bytes32)"](receiver.address, SESSION_ID_2, {
        value: FIVE_MON,
      });
      expect(await ledger.isSessionUsed(SESSION_ID_1)).to.be.true;
      expect(await ledger.isSessionUsed(SESSION_ID_2)).to.be.true;
    });

    it("should report unused sessions correctly", async function () {
      expect(await ledger.isSessionUsed(SESSION_ID_1)).to.be.false;
    });

    it("should not hold any funds (pass-through)", async function () {
      await ledger.connect(sender)["payWithLog(address,bytes32)"](receiver.address, SESSION_ID_1, {
        value: ONE_MON,
      });
      const contractBalance = await ethers.provider.getBalance(
        await ledger.getAddress()
      );
      expect(contractBalance).to.equal(0);
    });
  });

  // ──────────────────────────────────────────────
  // Payment Analytics
  // ──────────────────────────────────────────────
  describe("Payment Analytics", function () {
    it("should track totalPayments counter", async function () {
      expect(await ledger.totalPayments()).to.equal(0);

      await ledger.connect(sender)["payWithLog(address,bytes32)"](receiver.address, SESSION_ID_1, {
        value: ONE_MON,
      });
      expect(await ledger.totalPayments()).to.equal(1);

      await ledger.connect(sender)["payWithLog(address,bytes32)"](receiver.address, SESSION_ID_2, {
        value: FIVE_MON,
      });
      expect(await ledger.totalPayments()).to.equal(2);
    });

    it("should track totalVolume", async function () {
      expect(await ledger.totalVolume()).to.equal(0);

      await ledger.connect(sender)["payWithLog(address,bytes32)"](receiver.address, SESSION_ID_1, {
        value: ONE_MON,
      });
      expect(await ledger.totalVolume()).to.equal(ONE_MON);

      await ledger.connect(sender)["payWithLog(address,bytes32)"](receiver.address, SESSION_ID_2, {
        value: FIVE_MON,
      });
      expect(await ledger.totalVolume()).to.equal(ONE_MON + FIVE_MON);
    });
  });

  // ──────────────────────────────────────────────
  // Input Validation
  // ──────────────────────────────────────────────
  describe("Input Validation", function () {
    it("should reject zero address recipient", async function () {
      await expect(
        ledger.connect(sender)["payWithLog(address,bytes32)"](ethers.ZeroAddress, SESSION_ID_1, { value: ONE_MON })
      ).to.be.revertedWithCustomError(ledger, "InvalidRecipient");
    });

    it("should reject self-payment", async function () {
      await expect(
        ledger.connect(sender)["payWithLog(address,bytes32)"](sender.address, SESSION_ID_1, { value: ONE_MON })
      ).to.be.revertedWithCustomError(ledger, "SelfPayment");
    });

    it("should reject zero amount", async function () {
      await expect(
        ledger.connect(sender)["payWithLog(address,bytes32)"](receiver.address, SESSION_ID_1, { value: 0 })
      ).to.be.revertedWithCustomError(ledger, "ZeroAmount");
    });
  });

  // ──────────────────────────────────────────────
  // Payment Limits
  // ──────────────────────────────────────────────
  describe("Payment Limits", function () {
    it("should have correct default limits", async function () {
      expect(await ledger.minPayment()).to.equal(ethers.parseEther("0.0001"));
      expect(await ledger.maxPayment()).to.equal(ethers.parseEther("10000"));
    });

    it("should reject payment below minimum", async function () {
      const tooSmall = ethers.parseEther("0.00001"); // Below 0.0001 MON
      await expect(
        ledger.connect(sender)["payWithLog(address,bytes32)"](receiver.address, SESSION_ID_1, { value: tooSmall })
      ).to.be.revertedWithCustomError(ledger, "BelowMinPayment");
    });

    it("should accept payment at minimum", async function () {
      await ledger.connect(sender)["payWithLog(address,bytes32)"](receiver.address, SESSION_ID_1, {
        value: MIN_PAYMENT,
      });
      expect(await ledger.isSessionUsed(SESSION_ID_1)).to.be.true;
    });

    it("should allow owner to update limits", async function () {
      const newMin = ethers.parseEther("0.001");
      const newMax = ethers.parseEther("5000");
      await ledger.connect(owner).setPaymentLimits(newMin, newMax);
      expect(await ledger.minPayment()).to.equal(newMin);
      expect(await ledger.maxPayment()).to.equal(newMax);
    });

    it("should emit PaymentLimitsUpdated on change", async function () {
      const newMin = ethers.parseEther("0.01");
      const newMax = ethers.parseEther("100");
      await expect(ledger.connect(owner).setPaymentLimits(newMin, newMax))
        .to.emit(ledger, "PaymentLimitsUpdated")
        .withArgs(newMin, newMax);
    });

    it("should reject invalid limits (max < min)", async function () {
      await expect(
        ledger.connect(owner).setPaymentLimits(ethers.parseEther("10"), ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(ledger, "InvalidPaymentLimits");
    });

    it("should allow max=0 to mean unlimited", async function () {
      await ledger.connect(owner).setPaymentLimits(0, 0);
      expect(await ledger.minPayment()).to.equal(0);
      expect(await ledger.maxPayment()).to.equal(0);
    });

    it("should only allow owner to update limits", async function () {
      await expect(
        ledger.connect(sender).setPaymentLimits(0, 0)
      ).to.be.revertedWithCustomError(ledger, "OwnableUnauthorizedAccount");
    });
  });

  // ──────────────────────────────────────────────
  // Deadline Enforcement
  // ──────────────────────────────────────────────
  describe("Deadline Enforcement", function () {
    it("should reject payment with expired deadline", async function () {
      const block = await ethers.provider.getBlock("latest");
      const pastDeadline = block.timestamp - 100; // 100 seconds ago

      await expect(
        ledger.connect(sender)["payWithLog(address,bytes32,uint256)"](
          receiver.address, SESSION_ID_1, pastDeadline, { value: ONE_MON }
        )
      ).to.be.revertedWithCustomError(ledger, "SessionExpired");
    });

    it("should accept payment with deadline=0 (no expiry)", async function () {
      await ledger.connect(sender)["payWithLog(address,bytes32,uint256)"](
        receiver.address, SESSION_ID_1, 0, { value: ONE_MON }
      );
      expect(await ledger.isSessionUsed(SESSION_ID_1)).to.be.true;
    });
  });

  // ──────────────────────────────────────────────
  // Direct ETH Rejection
  // ──────────────────────────────────────────────
  describe("Direct ETH Rejection", function () {
    it("should reject direct ETH transfers via send/transfer", async function () {
      const ledgerAddress = await ledger.getAddress();
      await expect(
        sender.sendTransaction({ to: ledgerAddress, value: ONE_MON })
      ).to.be.revertedWithCustomError(ledger, "DirectTransferNotAllowed");
    });

    it("should reject fallback calls with data", async function () {
      const ledgerAddress = await ledger.getAddress();
      await expect(
        sender.sendTransaction({ to: ledgerAddress, value: ONE_MON, data: "0x12345678" })
      ).to.be.revertedWithCustomError(ledger, "DirectTransferNotAllowed");
    });
  });

  // ──────────────────────────────────────────────
  // Batch Payments
  // ──────────────────────────────────────────────
  describe("Batch Payments", function () {
    it("should process batch payment to multiple recipients", async function () {
      const [, , recv1, recv2, recv3] = await ethers.getSigners();
      const sessionA = ethers.keccak256(ethers.toUtf8Bytes("batch-a"));
      const sessionB = ethers.keccak256(ethers.toUtf8Bytes("batch-b"));
      const sessionC = ethers.keccak256(ethers.toUtf8Bytes("batch-c"));

      const bal1Before = await ethers.provider.getBalance(recv1.address);
      const bal2Before = await ethers.provider.getBalance(recv2.address);

      await ledger.connect(sender).payMultiple(
        [recv1.address, recv2.address, recv3.address],
        [ONE_MON, FIVE_MON, ONE_MON],
        [sessionA, sessionB, sessionC],
        { value: ONE_MON + FIVE_MON + ONE_MON }
      );

      expect(await ledger.isSessionUsed(sessionA)).to.be.true;
      expect(await ledger.isSessionUsed(sessionB)).to.be.true;
      expect(await ledger.isSessionUsed(sessionC)).to.be.true;
      expect(await ledger.totalPayments()).to.equal(3);
    });

    it("should reject empty batch", async function () {
      await expect(
        ledger.connect(sender).payMultiple([], [], [], { value: 0 })
      ).to.be.revertedWithCustomError(ledger, "BatchEmpty");
    });

    it("should reject mismatched arrays", async function () {
      await expect(
        ledger.connect(sender).payMultiple(
          [receiver.address],
          [ONE_MON, FIVE_MON],
          [SESSION_ID_1],
          { value: ONE_MON + FIVE_MON }
        )
      ).to.be.revertedWithCustomError(ledger, "BatchLengthMismatch");
    });

    it("should reject value mismatch", async function () {
      const sessionA = ethers.keccak256(ethers.toUtf8Bytes("batch-val-a"));
      await expect(
        ledger.connect(sender).payMultiple(
          [receiver.address],
          [ONE_MON],
          [sessionA],
          { value: FIVE_MON }
        )
      ).to.be.revertedWithCustomError(ledger, "BatchValueMismatch");
    });
  });

  // ──────────────────────────────────────────────
  // Session Replay Protection
  // ──────────────────────────────────────────────
  describe("Session Replay Protection", function () {
    it("should reject reused session ID", async function () {
      await ledger.connect(sender)["payWithLog(address,bytes32)"](receiver.address, SESSION_ID_1, {
        value: ONE_MON,
      });
      await expect(
        ledger.connect(sender)["payWithLog(address,bytes32)"](receiver.address, SESSION_ID_1, { value: ONE_MON })
      )
        .to.be.revertedWithCustomError(ledger, "SessionAlreadyUsed")
        .withArgs(SESSION_ID_1);
    });

    it("should reject reused session ID even from different sender", async function () {
      await ledger.connect(sender)["payWithLog(address,bytes32)"](receiver.address, SESSION_ID_1, {
        value: ONE_MON,
      });
      await expect(
        ledger.connect(attacker)["payWithLog(address,bytes32)"](receiver.address, SESSION_ID_1, { value: ONE_MON })
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
        ledger.connect(sender)["payWithLog(address,bytes32)"](maliciousAddress, attackSessionId, {
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
        ledger.connect(sender)["payWithLog(address,bytes32)"](receiver.address, SESSION_ID_1, { value: ONE_MON })
      ).to.be.revertedWithCustomError(ledger, "EnforcedPause");
    });

    it("should allow payments after unpause", async function () {
      await ledger.connect(owner).pause();
      await ledger.connect(owner).unpause();
      await ledger.connect(sender)["payWithLog(address,bytes32)"](receiver.address, SESSION_ID_1, {
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
