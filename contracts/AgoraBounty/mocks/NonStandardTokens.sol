// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./MockERC20.sol";
import "../MultiTokenLedger.sol";

contract NoReturnToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
    }

    function transferFrom(address from, address to, uint256 amount) external {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
    }
}

contract FalseReturnToken is MockERC20 {
    constructor() MockERC20("False Return", "FALSE") {}

    function transferFrom(address, address, uint256) public pure override returns (bool) {
        return false;
    }
}

contract FeeOnTransferToken is MockERC20 {
    uint256 public immutable feeBps;

    constructor(uint256 fee) MockERC20("Fee Token", "FEE") {
        require(fee <= 10_000, "Invalid fee");
        feeBps = fee;
    }

    function _update(address from, address to, uint256 amount) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 fee = amount * feeBps / 10_000;
            super._update(from, address(0), fee);
            amount -= fee;
        }
        super._update(from, to, amount);
    }
}

contract CallbackToken is MockERC20 {
    MultiTokenLedger public immutable ledger;
    bytes32 public sessionIdHash;
    bytes32 public reentrySessionIdHash;

    constructor(address target) MockERC20("Callback Token", "CALL") {
        ledger = MultiTokenLedger(target);
    }

    function setSessions(bytes32 session, bytes32 reentrySession) external {
        sessionIdHash = session;
        reentrySessionIdHash = reentrySession;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        require(ledger.processedSessions(from, sessionIdHash), "Session not marked before callback");
        ledger.payERC20WithLog(address(this), to, amount, reentrySessionIdHash);
        return super.transferFrom(from, to, amount);
    }
}
