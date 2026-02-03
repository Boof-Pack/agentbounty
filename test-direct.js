// Direct test using @solana/web3.js - no Anchor SDK
const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} = require('@solana/web3.js');
const fs = require('fs');
const borsh = require('borsh');

const PROGRAM_ID = new PublicKey('9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Load wallets
const posterWallet = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync('/root/.openclaw/workspace/wallet-poster.json')))
);
const claimerWallet = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync('/root/.openclaw/workspace/wallet-claimer.json')))
);

console.log('Poster:', posterWallet.publicKey.toString());
console.log('Claimer:', claimerWallet.publicKey.toString());

// Instruction discriminators (first 8 bytes of SHA256 hash of "global:instruction_name")
const INITIALIZE_IX = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]); // initialize
const CREATE_BOUNTY_IX = Buffer.from([123, 234, 145, 67, 89, 234, 123, 45]); // create_bounty (placeholder)
const CLAIM_BOUNTY_IX = Buffer.from([234, 123, 45, 67, 89, 123, 234, 145]); // claim_bounty (placeholder)

// We need to compute actual discriminators - let me use a simpler approach
// Let's use anchor-cli to get the IDL and parse it properly

async function main() {
  console.log('\n=== DIRECT BOUNTY FLOW TEST ===\n');

  // Check balances
  const posterBalance = await connection.getBalance(posterWallet.publicKey);
  const claimerBalance = await connection.getBalance(claimerWallet.publicKey);
  
  console.log(`Poster balance: ${posterBalance / LAMPORTS_PER_SOL} SOL`);
  console.log(`Claimer balance: ${claimerBalance / LAMPORTS_PER_SOL} SOL\n`);

  // For now, let's just verify the program exists and get account info
  const programInfo = await connection.getAccountInfo(PROGRAM_ID);
  
  if (!programInfo) {
    console.error('Program not found!');
    process.exit(1);
  }
  
  console.log('✅ Program exists on devnet');
  console.log('Program owner:', programInfo.owner.toString());
  console.log('Program executable:', programInfo.executable);
  console.log('Program data length:', programInfo.data.length, 'bytes\n');

  // Let's use anchor CLI to actually test
  console.log('Switching to Anchor CLI approach...\n');
}

main().catch(console.error);
