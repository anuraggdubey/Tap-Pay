/**
 * Registry Service — UsernameRegistry contract interactions
 *
 * Handles on-chain username registration, resolution, and reverse lookup
 * via the deployed UsernameRegistry smart contract on Monad testnet.
 */

import {ethers} from 'ethers';
import {getProvider, loadPrivateKey} from './wallet';
import {MONAD_CONFIG} from '../config/monad';

// Minimal ABI for UsernameRegistry — only the functions we call
const REGISTRY_ABI = [
  'function register(string calldata username) external',
  'function release() external',
  'function resolve(string calldata username) external view returns (address)',
  'function reverseResolve(address user) external view returns (string)',
  'event UsernameRegistered(string username, address indexed owner)',
  'event UsernameReleased(string username, address indexed owner)',
  'error InvalidUsernameLength(uint256 length)',
  'error InvalidCharacter(bytes1 char, uint256 position)',
  'error UsernameTaken(string username)',
  'error AlreadyRegistered(address user)',
  'error NotRegistered(address user)',
];

/**
 * Get a read-only contract instance
 */
function getRegistryContract(): ethers.Contract {
  const provider = getProvider();
  return new ethers.Contract(
    MONAD_CONFIG.contracts.usernameRegistry,
    REGISTRY_ABI,
    provider,
  );
}

/**
 * Get a write-enabled contract instance (with signer)
 */
async function getRegistryContractWithSigner(): Promise<ethers.Contract | null> {
  const key = await loadPrivateKey();
  if (!key) {
    return null;
  }
  const provider = getProvider();
  const wallet = new ethers.Wallet(key, provider);
  return new ethers.Contract(
    MONAD_CONFIG.contracts.usernameRegistry,
    REGISTRY_ABI,
    wallet,
  );
}

/**
 * Register a username on-chain
 * @returns Transaction hash on success, or error message
 */
export async function registerUsername(
  username: string,
): Promise<{txHash: string | null; error?: string}> {
  try {
    const contract = await getRegistryContractWithSigner();
    if (!contract) {
      return {txHash: null, error: 'Wallet not found'};
    }

    const tx = await contract.register(username);
    return {txHash: tx.hash};
  } catch (error: any) {
    // Parse custom Solidity errors
    if (error.reason) {
      return {txHash: null, error: error.reason};
    }
    return {txHash: null, error: error.message || 'Registration failed'};
  }
}

/**
 * Release your current username on-chain
 */
export async function releaseUsername(): Promise<{txHash: string | null; error?: string}> {
  try {
    const contract = await getRegistryContractWithSigner();
    if (!contract) {
      return {txHash: null, error: 'Wallet not found'};
    }

    const tx = await contract.release();
    return {txHash: tx.hash};
  } catch (error: any) {
    return {txHash: null, error: error.reason || error.message || 'Release failed'};
  }
}

/**
 * Resolve a username to a wallet address
 * @returns The address, or null if not found
 */
export async function resolveUsername(username: string): Promise<string | null> {
  try {
    const contract = getRegistryContract();
    const resolved = await contract.resolve(username);
    // Zero address means username is not registered
    if (!resolved || resolved === ethers.ZeroAddress) {
      return null;
    }
    return resolved;
  } catch {
    return null;
  }
}

/**
 * Reverse-resolve an address to a username
 * @returns The username, or null if not registered
 */
export async function reverseResolveAddress(address: string): Promise<string | null> {
  try {
    const contract = getRegistryContract();
    const username = await contract.reverseResolve(address);
    // Empty string or falsy means no username registered
    if (!username || username.trim() === '') {
      return null;
    }
    return username;
  } catch {
    return null;
  }
}

/**
 * Alias for reverseResolveAddress
 */
export const reverseResolve = reverseResolveAddress;

