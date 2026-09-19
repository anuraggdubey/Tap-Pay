const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UsernameRegistry", function () {
  let registry;
  let owner, alice, bob, charlie;

  beforeEach(async function () {
    [owner, alice, bob, charlie] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("UsernameRegistry");
    registry = await Factory.deploy();
    await registry.waitForDeployment();
  });

  // ──────────────────────────────────────────────
  // Happy Path
  // ──────────────────────────────────────────────
  describe("Happy Path", function () {
    it("should register a username and resolve it", async function () {
      await registry.connect(alice).register("alice_123");
      const resolved = await registry.resolve("alice_123");
      expect(resolved).to.equal(alice.address);
    });

    it("should reverse-resolve an address to a username", async function () {
      await registry.connect(alice).register("alice_123");
      const username = await registry.reverseResolve(alice.address);
      expect(username).to.equal("alice_123");
    });

    it("should emit UsernameRegistered event", async function () {
      await expect(registry.connect(alice).register("alice_123"))
        .to.emit(registry, "UsernameRegistered")
        .withArgs("alice_123", alice.address);
    });

    it("should return address(0) for unregistered username", async function () {
      const resolved = await registry.resolve("nobody");
      expect(resolved).to.equal(ethers.ZeroAddress);
    });

    it("should return empty string for unregistered address", async function () {
      const username = await registry.reverseResolve(alice.address);
      expect(username).to.equal("");
    });

    it("should allow different users to register different usernames", async function () {
      await registry.connect(alice).register("alice");
      await registry.connect(bob).register("bob_user");
      expect(await registry.resolve("alice")).to.equal(alice.address);
      expect(await registry.resolve("bob_user")).to.equal(bob.address);
    });
  });

  // ──────────────────────────────────────────────
  // Username Validation
  // ──────────────────────────────────────────────
  describe("Username Validation", function () {
    it("should reject username shorter than 3 characters", async function () {
      await expect(registry.connect(alice).register("ab"))
        .to.be.revertedWithCustomError(registry, "InvalidUsernameLength")
        .withArgs(2);
    });

    it("should reject username longer than 20 characters", async function () {
      const longName = "a".repeat(21);
      await expect(registry.connect(alice).register(longName))
        .to.be.revertedWithCustomError(registry, "InvalidUsernameLength")
        .withArgs(21);
    });

    it("should accept username with exactly 3 characters", async function () {
      await registry.connect(alice).register("abc");
      expect(await registry.resolve("abc")).to.equal(alice.address);
    });

    it("should accept username with exactly 20 characters", async function () {
      const name20 = "a".repeat(20);
      await registry.connect(alice).register(name20);
      expect(await registry.resolve(name20)).to.equal(alice.address);
    });

    it("should reject uppercase letters", async function () {
      await expect(registry.connect(alice).register("Alice"))
        .to.be.revertedWithCustomError(registry, "InvalidCharacter");
    });

    it("should reject special characters", async function () {
      await expect(registry.connect(alice).register("ali@ce"))
        .to.be.revertedWithCustomError(registry, "InvalidCharacter");
    });

    it("should reject spaces", async function () {
      await expect(registry.connect(alice).register("ali ce"))
        .to.be.revertedWithCustomError(registry, "InvalidCharacter");
    });

    it("should reject hyphens", async function () {
      await expect(registry.connect(alice).register("ali-ce"))
        .to.be.revertedWithCustomError(registry, "InvalidCharacter");
    });

    it("should accept underscores", async function () {
      await registry.connect(alice).register("ali_ce");
      expect(await registry.resolve("ali_ce")).to.equal(alice.address);
    });

    it("should accept digits", async function () {
      await registry.connect(alice).register("user123");
      expect(await registry.resolve("user123")).to.equal(alice.address);
    });

    it("should accept all-digit usernames", async function () {
      await registry.connect(alice).register("12345");
      expect(await registry.resolve("12345")).to.equal(alice.address);
    });
  });

  // ──────────────────────────────────────────────
  // Collision & Duplicate Prevention
  // ──────────────────────────────────────────────
  describe("Collision & Duplicate Prevention", function () {
    it("should reject registering an already-taken username", async function () {
      await registry.connect(alice).register("taken_name");
      await expect(registry.connect(bob).register("taken_name"))
        .to.be.revertedWithCustomError(registry, "UsernameTaken")
        .withArgs("taken_name");
    });

    it("should reject double registration from same address", async function () {
      await registry.connect(alice).register("first_name");
      await expect(registry.connect(alice).register("second_name"))
        .to.be.revertedWithCustomError(registry, "AlreadyRegistered")
        .withArgs(alice.address);
    });
  });

  // ──────────────────────────────────────────────
  // Release Flow
  // ──────────────────────────────────────────────
  describe("Release Flow", function () {
    it("should release a username and clear both mappings", async function () {
      await registry.connect(alice).register("alice_old");
      await registry.connect(alice).release();
      expect(await registry.resolve("alice_old")).to.equal(ethers.ZeroAddress);
      expect(await registry.reverseResolve(alice.address)).to.equal("");
    });

    it("should emit UsernameReleased event", async function () {
      await registry.connect(alice).register("alice_old");
      await expect(registry.connect(alice).release())
        .to.emit(registry, "UsernameReleased")
        .withArgs("alice_old", alice.address);
    });

    it("should allow re-registration after release", async function () {
      await registry.connect(alice).register("alice_old");
      await registry.connect(alice).release();
      await registry.connect(alice).register("alice_new");
      expect(await registry.resolve("alice_new")).to.equal(alice.address);
      expect(await registry.resolve("alice_old")).to.equal(ethers.ZeroAddress);
    });

    it("should allow another user to take a released username", async function () {
      await registry.connect(alice).register("cool_name");
      await registry.connect(alice).release();
      await registry.connect(bob).register("cool_name");
      expect(await registry.resolve("cool_name")).to.equal(bob.address);
    });

    it("should revert release if not registered", async function () {
      await expect(registry.connect(alice).release())
        .to.be.revertedWithCustomError(registry, "NotRegistered")
        .withArgs(alice.address);
    });
  });

  // ──────────────────────────────────────────────
  // Pause / Unpause
  // ──────────────────────────────────────────────
  describe("Pause / Unpause", function () {
    it("should block registration when paused", async function () {
      await registry.connect(owner).pause();
      await expect(registry.connect(alice).register("alice"))
        .to.be.revertedWithCustomError(registry, "EnforcedPause");
    });

    it("should allow registration after unpause", async function () {
      await registry.connect(owner).pause();
      await registry.connect(owner).unpause();
      await registry.connect(alice).register("alice");
      expect(await registry.resolve("alice")).to.equal(alice.address);
    });

    it("should allow release even when paused (non-custodial)", async function () {
      await registry.connect(alice).register("alice");
      await registry.connect(owner).pause();
      await registry.connect(alice).release();
      expect(await registry.reverseResolve(alice.address)).to.equal("");
    });

    it("should only allow owner to pause", async function () {
      await expect(registry.connect(alice).pause())
        .to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("should only allow owner to unpause", async function () {
      await registry.connect(owner).pause();
      await expect(registry.connect(alice).unpause())
        .to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  // ──────────────────────────────────────────────
  // Ownership (Ownable2Step)
  // ──────────────────────────────────────────────
  describe("Ownership (Ownable2Step)", function () {
    it("should set deployer as initial owner", async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("should require two-step ownership transfer", async function () {
      await registry.connect(owner).transferOwnership(alice.address);
      expect(await registry.owner()).to.equal(owner.address);
      await registry.connect(alice).acceptOwnership();
      expect(await registry.owner()).to.equal(alice.address);
    });

    it("should reject non-pending-owner from accepting ownership", async function () {
      await registry.connect(owner).transferOwnership(alice.address);
      await expect(registry.connect(bob).acceptOwnership())
        .to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });
});
