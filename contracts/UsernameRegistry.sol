// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title UsernameRegistry
 * @notice On-chain mapping between human-readable usernames and Monad wallet addresses for TapPay.
 */
contract UsernameRegistry {
    // Custom Errors
    error InvalidUsernameLength(uint256 length);
    error InvalidCharacter(bytes1 char, uint256 position);
    error UsernameTaken(string username);
    error AlreadyRegistered(address user);
    error NotRegistered(address user);

    // Events
    event UsernameRegistered(string username, address indexed owner);
    event UsernameReleased(string username, address indexed owner);

    // Storage mappings
    mapping(string => address) private _usernameToAddress;
    mapping(address => string) private _addressToUsername;

    /**
     * @notice Register a unique username for msg.sender
     * @param username The chosen username (3-20 characters: a-z, 0-9, _)
     */
    function register(string calldata username) external {
        bytes memory userBytes = bytes(username);
        uint256 len = userBytes.length;

        if (len < 3 || len > 20) {
            revert InvalidUsernameLength(len);
        }

        // Validate characters: a-z, 0-9, _
        for (uint256 i = 0; i < len; i++) {
            bytes1 b = userBytes[i];
            bool isLower = (b >= 0x61 && b <= 0x7A); // a-z
            bool isDigit = (b >= 0x30 && b <= 0x39); // 0-9
            bool isUnderscore = (b == 0x5F);        // _
            if (!isLower && !isDigit && !isUnderscore) {
                revert InvalidCharacter(b, i);
            }
        }

        if (_usernameToAddress[username] != address(0)) {
            revert UsernameTaken(username);
        }

        if (bytes(_addressToUsername[msg.sender]).length != 0) {
            revert AlreadyRegistered(msg.sender);
        }

        _usernameToAddress[username] = msg.sender;
        _addressToUsername[msg.sender] = username;

        emit UsernameRegistered(username, msg.sender);
    }

    /**
     * @notice Release the current username held by msg.sender
     */
    function release() external {
        string memory username = _addressToUsername[msg.sender];
        if (bytes(username).length == 0) {
            revert NotRegistered(msg.sender);
        }

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
}
