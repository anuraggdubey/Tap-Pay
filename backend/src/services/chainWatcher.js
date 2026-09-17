const { ethers } = require("ethers");
const config = require("../config");

// Minimal ABIs — only the events/functions we need

const LEDGER_ABI = [
  "event PaymentLogged(address indexed from, address indexed to, uint256 amount, bytes32 sessionId, uint256 timestamp)",
];

/**
 * Create a provider with failover across multiple RPCs
 */
function createProvider() {
  for (const url of config.rpcUrls) {
    try {
      return new ethers.JsonRpcProvider(url, {
        chainId: config.chainId,
        name: "monad-testnet",
      });
    } catch {
      continue;
    }
  }
  throw new Error("All RPC endpoints failed");
}



/**
 * Verify that a txHash contains a real PaymentLogged event and return the status
 * @returns {{ confirmed: boolean, from?: string, to?: string, amount?: string }}
 */
async function verifyPayment(txHash) {
  try {
    const provider = createProvider();
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) return { confirmed: false };
    if (receipt.status !== 1) return { confirmed: false, failed: true };

    const iface = new ethers.Interface(LEDGER_ABI);

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics, data: log.data });
        if (parsed && parsed.name === "PaymentLogged") {
          return {
            confirmed: true,
            from: parsed.args[0],
            to: parsed.args[1],
            amount: parsed.args[2].toString(),
            sessionId: parsed.args[3],
          };
        }
      } catch {
        // Not our event, skip
      }
    }
    return { confirmed: false };
  } catch {
    return { confirmed: false };
  }
}

module.exports = { createProvider, verifyPayment };
