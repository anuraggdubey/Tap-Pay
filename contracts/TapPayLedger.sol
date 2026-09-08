// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TapPayLedger
 * @notice Payment logging contract with session-based replay protection for TapPay on Monad.
 */
contract TapPayLedger {
    // Custom Errors
    error InvalidRecipient();
    error ZeroAmount();
    error SessionAlreadyProcessed(bytes32 sessionIdHash);
    error TransferFailed();

    // Events
    event PaymentProcessed(
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes32 indexed sessionIdHash,
        uint256 timestamp
    );

    // Replay protection: track processed session hashes
    mapping(bytes32 => bool) public processedSessions;

    /**
     * @notice Pay a recipient with an on-chain event log and session replay protection
     * @param to The recipient wallet address
     * @param sessionIdHash Keccak256 hash of the session UUID to prevent double execution
     */
    function payWithLog(address payable to, bytes32 sessionIdHash) external payable {
        if (to == address(0) || to == msg.sender) {
            revert InvalidRecipient();
        }
        if (msg.value == 0) {
            revert ZeroAmount();
        }
        if (processedSessions[sessionIdHash]) {
            revert SessionAlreadyProcessed(sessionIdHash);
        }

        // Mark session as spent
        processedSessions[sessionIdHash] = true;

        // Forward native MON to recipient
        (bool success, ) = to.call{value: msg.value}("");
        if (!success) {
            revert TransferFailed();
        }

        emit PaymentProcessed(msg.sender, to, msg.value, sessionIdHash, block.timestamp);
    }

    /**
     * @notice Check if a session has already been settled
     * @param sessionIdHash Keccak256 hash of the session UUID
     */
    function isSessionProcessed(bytes32 sessionIdHash) external view returns (bool) {
        return processedSessions[sessionIdHash];
    }
}
