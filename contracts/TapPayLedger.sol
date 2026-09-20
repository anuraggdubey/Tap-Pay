// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title TapPayLedger
 * @notice Hardened payment logging contract with session-based replay protection for TapPay on Monad.
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
 *      - Payment limits (min/max) to prevent dust-spam and limit exposure
 *      - Deadline enforcement for session expiry
 *      - Direct ETH send rejection (no accidental fund locking)
 */
contract TapPayLedger is ReentrancyGuard, Pausable, Ownable2Step {
    // ──────────────────────────────────────────────
    // Custom Errors (saves ~200 gas/revert vs require strings)
    // ──────────────────────────────────────────────
    error InvalidRecipient();
    error SelfPayment();
    error ZeroAmount();
    error BelowMinPayment(uint256 amount, uint256 minPayment);
    error AboveMaxPayment(uint256 amount, uint256 maxPayment);
    error SessionAlreadyUsed(bytes32 sessionId);
    error SessionExpired(bytes32 sessionId, uint256 deadline);
    error TransferFailed();
    error DirectTransferNotAllowed();
    error InvalidPaymentLimits(uint256 min, uint256 max);
    error BatchLengthMismatch();
    error BatchEmpty();
    error BatchTooLarge(uint256 length, uint256 maxBatchSize);
    error BatchValueMismatch(uint256 sent, uint256 required);

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

    event PaymentLimitsUpdated(uint256 minPayment, uint256 maxPayment);

    // ──────────────────────────────────────────────
    // Constants
    // ──────────────────────────────────────────────
    uint256 public constant MAX_BATCH_SIZE = 10;

    // ──────────────────────────────────────────────
    // Storage — payment limits (configurable by owner)
    // ──────────────────────────────────────────────
    uint256 public minPayment;
    uint256 public maxPayment;

    // ──────────────────────────────────────────────
    // Storage — analytics
    // ──────────────────────────────────────────────
    uint256 public totalPayments;
    uint256 public totalVolume;

    // ──────────────────────────────────────────────
    // Storage — replay protection
    // ──────────────────────────────────────────────
    mapping(bytes32 => bool) public usedSessionIds;

    // ──────────────────────────────────────────────
    // Constructor — OZ v5 pattern
    // ──────────────────────────────────────────────
    constructor() Ownable(msg.sender) {
        // Default limits: 0.0001 MON min, 10,000 MON max
        minPayment = 0.0001 ether;
        maxPayment = 10_000 ether;
    }

    // ──────────────────────────────────────────────
    // External Functions
    // ──────────────────────────────────────────────

    /**
     * @notice Pay a recipient with an on-chain event log and session replay protection
     * @param to The recipient wallet address
     * @param sessionId Session identifier from the NFC handshake (prevents replay)
     * @param deadline Unix timestamp after which the session is expired (0 = no deadline)
     * @dev Checks-effects-interactions: usedSessionIds marked BEFORE external .call
     */
    function payWithLog(address to, bytes32 sessionId, uint256 deadline)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        _validateAndPay(to, msg.value, sessionId, deadline);
    }

    /**
     * @notice Backward-compatible payWithLog without deadline (deadline = 0 = no expiry)
     * @param to The recipient wallet address
     * @param sessionId Session identifier from the NFC handshake (prevents replay)
     */
    function payWithLog(address to, bytes32 sessionId)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        _validateAndPay(to, msg.value, sessionId, 0);
    }

    /**
     * @notice Batch payment — pay multiple recipients in a single transaction
     * @param recipients Array of recipient addresses
     * @param amounts Array of payment amounts (must match recipients length)
     * @param sessionIds Array of session IDs (must match recipients length)
     * @dev Total msg.value must equal sum of amounts. Gas-efficient for multi-tap flows.
     */
    function payMultiple(
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes32[] calldata sessionIds
    )
        external
        payable
        whenNotPaused
        nonReentrant
    {
        uint256 len = recipients.length;
        if (len == 0) revert BatchEmpty();
        if (len > MAX_BATCH_SIZE) revert BatchTooLarge(len, MAX_BATCH_SIZE);
        if (amounts.length != len || sessionIds.length != len) revert BatchLengthMismatch();

        // Verify total value matches sum of amounts
        uint256 totalRequired = 0;
        for (uint256 i = 0; i < len; i++) {
            totalRequired += amounts[i];
        }
        if (msg.value != totalRequired) revert BatchValueMismatch(msg.value, totalRequired);

        // Process each payment with its individual amount
        for (uint256 i = 0; i < len; i++) {
            _validateAndPay(recipients[i], amounts[i], sessionIds[i], 0);
        }
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
    // Owner Controls
    // ──────────────────────────────────────────────

    /**
     * @notice Update payment limits
     * @param _minPayment New minimum payment amount (can be 0 to disable)
     * @param _maxPayment New maximum payment amount (must be >= _minPayment, 0 = unlimited)
     */
    function setPaymentLimits(uint256 _minPayment, uint256 _maxPayment) external onlyOwner {
        if (_maxPayment != 0 && _maxPayment < _minPayment) {
            revert InvalidPaymentLimits(_minPayment, _maxPayment);
        }
        minPayment = _minPayment;
        maxPayment = _maxPayment;
        emit PaymentLimitsUpdated(_minPayment, _maxPayment);
    }

    // ──────────────────────────────────────────────
    // Emergency Controls (owner-only)
    // ──────────────────────────────────────────────
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ──────────────────────────────────────────────
    // Reject direct ETH sends (prevent accidental fund locking)
    // ──────────────────────────────────────────────
    receive() external payable {
        revert DirectTransferNotAllowed();
    }

    fallback() external payable {
        revert DirectTransferNotAllowed();
    }

    // ──────────────────────────────────────────────
    // Internal
    // ──────────────────────────────────────────────

    /**
     * @dev Core payment logic — shared by single and batch payment functions
     * @param to Recipient address
     * @param amount Payment amount in wei
     * @param sessionId Session identifier for replay protection
     * @param deadline Unix timestamp for session expiry (0 = no deadline)
     */
    function _validateAndPay(address to, uint256 amount, bytes32 sessionId, uint256 deadline) internal {
        if (to == address(0)) revert InvalidRecipient();
        if (to == msg.sender) revert SelfPayment();
        if (amount == 0) revert ZeroAmount();
        if (amount < minPayment) revert BelowMinPayment(amount, minPayment);
        if (maxPayment != 0 && amount > maxPayment) revert AboveMaxPayment(amount, maxPayment);
        if (usedSessionIds[sessionId]) revert SessionAlreadyUsed(sessionId);
        if (deadline != 0 && block.timestamp > deadline) revert SessionExpired(sessionId, deadline);

        // Effects: mark session as used BEFORE external call (CEI pattern)
        usedSessionIds[sessionId] = true;

        // Analytics
        unchecked {
            totalPayments++;
            totalVolume += amount;
        }

        // Interactions: forward native MON to recipient
        (bool sent, ) = to.call{value: amount}("");
        if (!sent) revert TransferFailed();

        emit PaymentLogged(msg.sender, to, amount, sessionId, block.timestamp);
    }
}
