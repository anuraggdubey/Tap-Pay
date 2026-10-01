const { ethers } = require('ethers');

async function main() {
  const provider = new ethers.JsonRpcProvider('https://rpc.monad.xyz');

  console.log('=== UsernameRegistry ===');
  const regABI = [
    'function owner() view returns (address)',
    'function MIN_LEN() view returns (uint8)',
    'function MAX_LEN() view returns (uint8)',
    'function totalRegistrations() view returns (uint256)',
    'function isAvailable(string) view returns (bool)',
    'function paused() view returns (bool)',
  ];
  const reg = new ethers.Contract('0x458DD61Db411ec1feFC069B7B094a983E3a3E265', regABI, provider);
  console.log('  Owner:', await reg.owner());
  console.log('  Min username len:', Number(await reg.MIN_LEN()));
  console.log('  Max username len:', Number(await reg.MAX_LEN()));
  console.log('  Total registrations:', Number(await reg.totalRegistrations()));
  console.log('  Is "tappay" available:', await reg.isAvailable('tappay'));
  console.log('  Paused:', await reg.paused());

  console.log('\n=== TapPayLedger ===');
  const ledgerABI = [
    'function owner() view returns (address)',
    'function minPayment() view returns (uint256)',
    'function maxPayment() view returns (uint256)',
    'function totalPayments() view returns (uint256)',
    'function totalVolume() view returns (uint256)',
    'function paused() view returns (bool)',
    'function MAX_BATCH_SIZE() view returns (uint256)',
  ];
  const ledger = new ethers.Contract('0x03907aE845E016f5F1605BAE4e6392C3491e03f1', ledgerABI, provider);
  console.log('  Owner:', await ledger.owner());
  console.log('  Min payment:', ethers.formatEther(await ledger.minPayment()), 'MON');
  console.log('  Max payment:', ethers.formatEther(await ledger.maxPayment()), 'MON');
  console.log('  Total payments:', Number(await ledger.totalPayments()));
  console.log('  Total volume:', ethers.formatEther(await ledger.totalVolume()), 'MON');
  console.log('  Max batch size:', Number(await ledger.MAX_BATCH_SIZE()));
  console.log('  Paused:', await ledger.paused());

  console.log('\n=== MultiTokenLedger ===');
  const multiABI = [
    'function owner() view returns (address)',
    'function enforceTokenWhitelist() view returns (bool)',
    'function supportedTokens(address) view returns (bool)',
    'function paused() view returns (bool)',
  ];
  const multi = new ethers.Contract('0x15319f757FC0e600E681bC0bffD69541916F8860', multiABI, provider);
  console.log('  Owner:', await multi.owner());
  console.log('  Whitelist enforced:', await multi.enforceTokenWhitelist());
  console.log('  AUSD whitelisted:', await multi.supportedTokens('0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a'));
  console.log('  USDC whitelisted:', await multi.supportedTokens('0x754704Bc059F8C67012fEd69BC8A327a5aafb603'));
  console.log('  USDT whitelisted:', await multi.supportedTokens('0xe7cd86e13AC4309349F30B3435a9d337750fC82D'));
  console.log('  Paused:', await multi.paused());

  // Deployer balance
  console.log('\n=== Deployer Wallet ===');
  const balance = await provider.getBalance('0x1406Fe936D971A0dAE9a19DD3354b900B08Fa002');
  console.log('  MON Balance:', ethers.formatEther(balance), 'MON');
}

main().catch(console.error);
