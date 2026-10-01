import {ethers} from 'ethers';

/** UUID-like session id for on-chain PaymentLogged / replay protection. */
export function createSessionId(): string {
  const sessionIdHex = ethers.hexlify(ethers.randomBytes(16)).replace('0x', '');
  return `${sessionIdHex.slice(0, 8)}-${sessionIdHex.slice(8, 12)}-4${sessionIdHex.slice(13, 16)}-8${sessionIdHex.slice(17, 20)}-${sessionIdHex.slice(20, 32)}`;
}

export function createSessionIdHash(): string {
  return ethers.keccak256(ethers.solidityPacked(['string'], [createSessionId()]));
}
