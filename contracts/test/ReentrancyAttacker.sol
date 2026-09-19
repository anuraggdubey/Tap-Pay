// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ReentrancyAttacker
 * @notice Test helper — malicious contract that attempts reentrancy on TapPayLedger
 * @dev Only used in tests, never deployed to production
 */
interface ITapPayLedger {
    function payWithLog(address to, bytes32 sessionId) external payable;
}

contract ReentrancyAttacker {
    ITapPayLedger public ledger;
    address public reentryTarget;
    bytes32 public reentrySessionId;
    bool public attacked;

    constructor(address _ledger) {
        ledger = ITapPayLedger(_ledger);
    }

    function setReentryParams(address _target, bytes32 _sessionId) external {
        reentryTarget = _target;
        reentrySessionId = _sessionId;
    }

    // When this contract receives ETH, attempt to re-enter the ledger
    receive() external payable {
        if (!attacked) {
            attacked = true;
            // Attempt reentrancy — should fail due to ReentrancyGuard
            ledger.payWithLog{value: msg.value}(reentryTarget, reentrySessionId);
        }
    }
}
