// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title TapPayLedger
 * @notice Payment logging contract with session-based replay protection for TapPay on Monad.
 * @dev The actual payment rail. Sender calls payWithLog() with msg.value; it forwards
 *      to receiver and logs the tap-pay event with a sessionId linking back to the
 *      off-chain NFC handshake.
 *
 *      No custody: contract never holds funds beyond a single atomic transaction.
 *      It's a pass-through logger, not an escrow.
 *
 *      Security layers:
 *      - ReentrancyGuard (defense in depth — .call forwards all gas)
 *      - Checks-effects-interactions pattern (usedSessionIds marked BEFORE external call)
 *      - Pausable emergency stop
 *      - Ownable2Step (safer ownership transfer)
 */
contract TapPayLedger is ReentrancyGuard, Pausable, Ownable2Step {
    // ──────────────────────────────────────────────
    // Custom Errors (saves ~200 gas/revert vs require strings)
    // ──────────────────────────────────────────────
    error InvalidRecipient();
    error SelfPayment();
    error ZeroAmount();
    error SessionAlreadyUsed(bytes32 sessionId);
    error TransferFailed();

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────
    event PaymentLogged(
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes32 sessionId,
        uint256 timestamp
    );

    // ──────────────────────────────────────────────
    // Storage — replay protection
    // ──────────────────────────────────────────────
    mapping(bytes32 => bool) public usedSessionIds;

    // ──────────────────────────────────────────────
    // Constructor — OZ v5 pattern
    // ──────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ──────────────────────────────────────────────
    // External Functions
    // ──────────────────────────────────────────────

    /**
     * @notice Pay a recipient with an on-chain event log and session replay protection
     * @param to The recipient wallet address
     * @param sessionId Session identifier from the NFC handshake (prevents replay)
     * @dev Checks-effects-interactions: usedSessionIds marked BEFORE external .call
     */
    function payWithLog(address to, bytes32 sessionId)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        if (to == address(0)) revert InvalidRecipient();
        if (to == msg.sender) revert SelfPayment();
        if (msg.value == 0) revert ZeroAmount();
        if (usedSessionIds[sessionId]) revert SessionAlreadyUsed(sessionId);

        // Effects: mark session as used BEFORE external call (CEI pattern)
        usedSessionIds[sessionId] = true;

        // Interactions: forward native MON to recipient
        (bool sent, ) = to.call{value: msg.value}("");
        if (!sent) revert TransferFailed();

        emit PaymentLogged(msg.sender, to, msg.value, sessionId, block.timestamp);
    }

    /**
     * @notice Check if a session ID has already been used
     * @param sessionId Session identifier to check
     * @return Whether the session has been used
     * @dev Useful for client-side pre-checks to avoid wasted gas on a guaranteed revert
     */
    function isSessionUsed(bytes32 sessionId) external view returns (bool) {
        return usedSessionIds[sessionId];
    }

    // ──────────────────────────────────────────────
    // Emergency Controls (owner-only)
    // ──────────────────────────────────────────────
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
