// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MultiTokenLedger
 * @dev A stateless ledger for processing both native MON and ERC-20 token payments.
 * Ensures payments are logged on-chain with a session ID for the NFC receipt system.
 * This contract does NOT hold custody of any user funds — it is a direct pass-through.
 *
 * Designed for the Agora Bounty to support AUSD, USDC, USDT alongside native MON.
 */
contract MultiTokenLedger is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Custom Errors ────────────────────────────────────────────────

    error InvalidRecipient();
    error SelfPayment();
    error ZeroAmount();
    error SessionAlreadyProcessed(bytes32 sessionIdHash);
    error TransferFailed();
    error ZeroReceivedAmount();
    error UnsupportedToken();

    // ─── State Variables ──────────────────────────────────────────────

    // Replay protection: tracks which sessions have already been processed
    // Maps a hashed session ID to a boolean (true = processed)
    mapping(bytes32 => bool) public processedSessions;

    // Only explicitly supported tokens may be used for payments.
    mapping(address => bool) public supportedTokens;

    // ─── Events ───────────────────────────────────────────────────────

    /**
     * @dev Emitted when a payment is successfully processed.
     * @param from Sender address
     * @param to Recipient address
     * @param token Token address (address(0) for native MON)
     * @param amount Amount received by the recipient
     * @param sessionIdHash Hash of the NFC session ID
     */
    event PaymentLogged(
        address indexed from,
        address indexed to,
        address indexed token,
        uint256 amount,
        bytes32 sessionIdHash
    );

    event TokenWhitelistUpdated(address indexed token, bool isSupported);

    // ─── Constructor ──────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {
        // Contract owner is the deployer
    }

    // ─── Main Payment Functions ───────────────────────────────────────

    /**
     * @dev Process a native MON payment and log the session.
     * Inherits behavior from the original TapPayLedger.
     *
     * @param to The recipient address
     * @param sessionIdHash The SHA-256 hash of the NFC session ID for replay protection
     */
    function payWithLog(address to, bytes32 sessionIdHash) 
        external 
        payable 
        whenNotPaused 
        nonReentrant 
    {
        _validatePaymentParams(to, msg.value, sessionIdHash);

        // Mark session as processed
        processedSessions[sessionIdHash] = true;

        // Execute native transfer
        (bool success, ) = to.call{value: msg.value}("");
        if (!success) {
            revert TransferFailed();
        }

        emit PaymentLogged(msg.sender, to, address(0), msg.value, sessionIdHash);
    }

    /**
     * @dev Process an ERC-20 token payment and log the session.
     * The sender must first `approve` this contract to spend the amount.
     *
     * @param token The ERC-20 token contract address (e.g., AUSD)
     * @param to The recipient address
     * @param amount The amount of tokens to transfer
     * @param sessionIdHash The SHA-256 hash of the NFC session ID for replay protection
     */
    function payERC20WithLog(
        address token,
        address to,
        uint256 amount,
        bytes32 sessionIdHash
    ) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        if (!supportedTokens[token]) {
            revert UnsupportedToken();
        }

        _validatePaymentParams(to, amount, sessionIdHash);

        // Mark session as processed
        processedSessions[sessionIdHash] = true;

        IERC20 erc20 = IERC20(token);
        uint256 balanceBefore = erc20.balanceOf(to);
        erc20.safeTransferFrom(msg.sender, to, amount);
        uint256 received = erc20.balanceOf(to) - balanceBefore;
        if (received == 0) {
            revert ZeroReceivedAmount();
        }

        emit PaymentLogged(msg.sender, to, token, received, sessionIdHash);
    }

    // ─── Internal Helpers ─────────────────────────────────────────────

    function _validatePaymentParams(
        address to, 
        uint256 amount, 
        bytes32 sessionIdHash
    ) internal view {
        if (to == address(0)) {
            revert InvalidRecipient();
        }
        if (to == msg.sender) {
            revert SelfPayment();
        }
        if (amount == 0) {
            revert ZeroAmount();
        }
        if (processedSessions[sessionIdHash]) {
            revert SessionAlreadyProcessed(sessionIdHash);
        }
    }

    // ─── Admin Functions ──────────────────────────────────────────────

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setSupportedToken(address token, bool isSupported) external onlyOwner {
        supportedTokens[token] = isSupported;
        emit TokenWhitelistUpdated(token, isSupported);
    }
}
