// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title UsernameRegistry
 * @notice On-chain mapping between human-readable usernames and Monad wallet addresses for TapPay.
 * @dev Fully on-chain identity layer — the hackathon differentiator.
 *      One username per address, enforced on-chain.
 *      Lowercase-only + alphanumeric + underscore charset enforced on-chain.
 *      Uses OZ v5 Pausable + Ownable2Step for safety.
 */
contract UsernameRegistry is Pausable, Ownable2Step {
    // ──────────────────────────────────────────────
    // Custom Errors (saves gas vs require strings)
    // ──────────────────────────────────────────────
    error InvalidUsernameLength(uint256 length);
    error InvalidCharacter(bytes1 char, uint256 position);
    error UsernameTaken(string username);
    error AlreadyRegistered(address user);
    error NotRegistered(address user);

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────
    event UsernameRegistered(string username, address indexed owner);
    event UsernameReleased(string username, address indexed owner);

    // ──────────────────────────────────────────────
    // Constants
    // ──────────────────────────────────────────────
    uint8 public constant MIN_LEN = 3;
    uint8 public constant MAX_LEN = 20;

    // ──────────────────────────────────────────────
    // Storage
    // ──────────────────────────────────────────────
    mapping(string => address) private _usernameToAddress;
    mapping(address => string) private _addressToUsername;

    // ──────────────────────────────────────────────
    // Modifiers
    // ──────────────────────────────────────────────
    modifier validUsername(string calldata username) {
        bytes memory b = bytes(username);
        if (b.length < MIN_LEN || b.length > MAX_LEN) revert InvalidUsernameLength(b.length);
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            if (!(
                (c >= 0x61 && c <= 0x7A) || // a-z
                (c >= 0x30 && c <= 0x39) || // 0-9
                (c == 0x5F)                 // _
            )) revert InvalidCharacter(c, i);
        }
        _;
    }

    // ──────────────────────────────────────────────
    // Constructor — OZ v5 pattern
    // ──────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ──────────────────────────────────────────────
    // External Functions
    // ──────────────────────────────────────────────

    /**
     * @notice Register a unique username for msg.sender
     * @param username The chosen username (3-20 characters: a-z, 0-9, _)
     */
    function register(string calldata username) external whenNotPaused validUsername(username) {
        if (_usernameToAddress[username] != address(0)) revert UsernameTaken(username);
        if (bytes(_addressToUsername[msg.sender]).length > 0) revert AlreadyRegistered(msg.sender);

        _usernameToAddress[username] = msg.sender;
        _addressToUsername[msg.sender] = username;

        emit UsernameRegistered(username, msg.sender);
    }

    /**
     * @notice Release the current username held by msg.sender, freeing both slots
     * @dev Non-custodial: users can free their username without admin intervention
     */
    function release() external {
        string memory username = _addressToUsername[msg.sender];
        if (bytes(username).length == 0) revert NotRegistered(msg.sender);

        delete _usernameToAddress[username];
        delete _addressToUsername[msg.sender];

        emit UsernameReleased(username, msg.sender);
    }

    /**
     * @notice Resolve a username to its corresponding wallet address
     * @param username The username to resolve
     * @return The bound address, or address(0) if not found
     */
    function resolve(string calldata username) external view returns (address) {
        return _usernameToAddress[username];
    }

    /**
     * @notice Reverse-resolve an address to its registered username
     * @param user The wallet address
     * @return The registered username, or empty string if unregistered
     */
    function reverseResolve(address user) external view returns (string memory) {
        return _addressToUsername[user];
    }

    // ──────────────────────────────────────────────
    // Emergency Controls (owner-only)
    // ──────────────────────────────────────────────
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
