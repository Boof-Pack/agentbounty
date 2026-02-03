const { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const fs = require('fs');

async function main() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load wallets
  const posterSecret = JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf-8'));
  const claimerSecret = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/wallet-claimer.json', 'utf-8'));
  
  const poster = Keypair.fromSecretKey(new Uint8Array(posterSecret));
  const claimer = Keypair.fromSecretKey(new Uint8Array(claimerSecret));
  
  console.log('Transferring 1 SOL from poster to claimer...');
  console.log('From:', poster.publicKey.toString());
  console.log('To:  ', claimer.publicKey.toString());
  
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: poster.publicKey,
      toPubkey: claimer.publicKey,
      lamports: 1 * LAMPORTS_PER_SOL,
    })
  );
  
  const signature = await sendAndConfirmTransaction(connection, transaction, [poster]);
  
  console.log('✅ Transfer complete!');
  console.log('Signature:', signature);
  console.log('Explorer: https://explorer.solana.com/tx/' + signature + '?cluster=devnet');
  
  const balance = await connection.getBalance(claimer.publicKey);
  console.log('Claimer balance:', (balance / LAMPORTS_PER_SOL).toFixed(4), 'SOL');
}

main().catch(console.error);
