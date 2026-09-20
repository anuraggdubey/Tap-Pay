// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title UsernameRegistry
 * @notice Hardened on-chain mapping between human-readable usernames and Monad wallet addresses for TapPay.
 * @dev Fully on-chain identity layer — the hackathon differentiator.
 *      One username per address, enforced on-chain.
 *      Lowercase-only + alphanumeric + underscore charset enforced on-chain.
 *      Uses OZ v5 Pausable + Ownable2Step for safety.
 *
 *      Security additions:
 *      - Admin force-remove for abusive/inappropriate usernames
 *      - Registration counter for analytics
 *      - isAvailable() view for UI pre-checks
 *      - Indexed username hash in events for efficient off-chain filtering
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
    error CannotRemoveZeroAddress();

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────
    event UsernameRegistered(string username, address indexed owner, bytes32 indexed usernameHash);
    event UsernameReleased(string username, address indexed owner, bytes32 indexed usernameHash);
    event UsernameForceRemoved(string username, address indexed formerOwner, address indexed removedBy);

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

    // Analytics
    uint256 public totalRegistrations;

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

        unchecked {
            totalRegistrations++;
        }

        emit UsernameRegistered(username, msg.sender, keccak256(bytes(username)));
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

        emit UsernameReleased(username, msg.sender, keccak256(bytes(username)));
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

    /**
     * @notice Check if a username is available for registration
     * @param username The username to check
     * @return True if the username is not taken
     */
    function isAvailable(string calldata username) external view returns (bool) {
        return _usernameToAddress[username] == address(0);
    }

    // ──────────────────────────────────────────────
    // Admin Controls (owner-only)
    // ──────────────────────────────────────────────

    /**
     * @notice Force-remove a user's username (for abusive/inappropriate names)
     * @param user The address whose username should be removed
     * @dev Only callable by the contract owner. Clears both mappings.
     */
    function adminRemove(address user) external onlyOwner {
        if (user == address(0)) revert CannotRemoveZeroAddress();
        string memory username = _addressToUsername[user];
        if (bytes(username).length == 0) revert NotRegistered(user);

        delete _usernameToAddress[username];
        delete _addressToUsername[user];

        emit UsernameForceRemoved(username, user, msg.sender);
    }

    // ──────────────────────────────────────────────
    // Emergency Controls (owner-only)
    // ──────────────────────────────────────────────
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
