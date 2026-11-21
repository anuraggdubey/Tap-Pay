/**
 * A JSON-RPC provider that broadcasts a signed transaction to every configured endpoint.
 *
 * The raw transaction is already signed locally, so sending the identical bytes to several
 * nodes is idempotent (same hash, same nonce): it cannot double-spend. It removes the
 * single point of censorship / dropping that "silent failover" had: one honest endpoint is
 * enough for the payment to reach the network. The trade-off is that each endpoint learns about
 * the payment; users who care can set their own RPC (see rpcSettings.ts), which is then the
 * only endpoint used.
 */

import {ethers} from 'ethers';

export class FanoutProvider extends ethers.JsonRpcProvider {
  private peers: ethers.JsonRpcProvider[];

  constructor(
    url: string,
    network: ethers.Networkish,
    options: ethers.JsonRpcApiProviderOptions,
    peerUrls: string[],
  ) {
    super(url, network, options);
    this.peers = peerUrls.map(peerUrl => new ethers.JsonRpcProvider(peerUrl, network, options));
  }

  async broadcastTransaction(signedTx: string): Promise<ethers.TransactionResponse> {
    // Explicit prototype call (not `super`) so it behaves the same under every Babel transform.
    const own = ethers.JsonRpcProvider.prototype.broadcastTransaction.call(this, signedTx);
    const results = await Promise.allSettled([
      own,
      ...this.peers.map(peer => peer.broadcastTransaction(signedTx)),
    ]);
    const accepted = results.find(
      (r): r is PromiseFulfilledResult<ethers.TransactionResponse> => r.status === 'fulfilled',
    );
    if (accepted) {
      return accepted.value;
    }
    const first = results[0] as PromiseRejectedResult;
    throw first.reason;
  }
}
