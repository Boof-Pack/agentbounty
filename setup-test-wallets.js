const { Keypair, Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');

async function main() {
  // Use default Solana wallet as poster
  const posterPath = process.env.HOME + '/.config/solana/id.json';
  const posterSecret = JSON.parse(fs.readFileSync(posterPath, 'utf-8'));
  const posterWallet = Keypair.fromSecretKey(new Uint8Array(posterSecret));
  
  console.log('Poster wallet (existing):', posterWallet.publicKey.toString());
  
  // Create new claimer wallet
  const claimerWallet = Keypair.generate();
  const claimerPath = '/root/.openclaw/workspace/wallet-claimer.json';
  fs.writeFileSync(claimerPath, JSON.stringify(Array.from(claimerWallet.secretKey)));
  
  console.log('Claimer wallet (new):    ', claimerWallet.publicKey.toString());
  
  // Check balances
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const posterBalance = await connection.getBalance(posterWallet.publicKey);
  const claimerBalance = await connection.getBalance(claimerWallet.publicKey);
  
  console.log('\nBalances:');
  console.log('Poster:  ', (posterBalance / LAMPORTS_PER_SOL).toFixed(4), 'SOL');
  console.log('Claimer: ', (claimerBalance / LAMPORTS_PER_SOL).toFixed(4), 'SOL');
  
  if (claimerBalance === 0) {
    console.log('\n⚠️  Claimer needs SOL! Airdropping 1 SOL...');
    try {
      const airdropSig = await connection.requestAirdrop(claimerWallet.publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(airdropSig);
      console.log('✅ Airdrop successful:', airdropSig);
    } catch (e) {
      console.log('❌ Airdrop failed (rate limit). Use: solana airdrop 1', claimerWallet.publicKey.toString(), '--url devnet');
    }
  }
  
  console.log('\n✅ Wallets ready!');
  console.log('Poster path: ', posterPath);
  console.log('Claimer path:', claimerPath);
}

main().catch(console.error);
