import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';

const PROGRAM_ID = new PublicKey('9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK');

async function main() {
  console.log('\n=== MINIMAL BOUNTY FLOW TEST ===\n');

  // Setup connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load wallets
  const posterSecret = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/wallet-poster.json', 'utf-8'));
  const claimerSecret = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/wallet-claimer.json', 'utf-8'));
  
  const posterWallet = Keypair.fromSecretKey(new Uint8Array(posterSecret));
  const claimerWallet = Keypair.fromSecretKey(new Uint8Array(claimerSecret));
  
  console.log('Poster:', posterWallet.publicKey.toString());
  console.log('Claimer:', claimerWallet.publicKey.toString());
  
  // Load IDL
  const idlJson = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/agentbounty/api/idl.json', 'utf-8'));
  
  // Create provider
  const wallet = new Wallet(posterWallet);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  
  // Create program
  const program = new Program(idlJson, PROGRAM_ID, provider);
  
  console.log('\n✅ Program loaded successfully\n');
  
  // Check balances
  const posterBalance = await connection.getBalance(posterWallet.publicKey);
  const claimerBalance = await connection.getBalance(claimerWallet.publicKey);
  
  console.log(`Poster balance: ${posterBalance / LAMPORTS_PER_SOL} SOL`);
  console.log(`Claimer balance: ${claimerBalance / LAMPORTS_PER_SOL} SOL\n`);
  
  // Step 1: Initialize platform (if needed)
  const [platformPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform')],
    PROGRAM_ID
  );
  
  console.log('Platform PDA:', platformPDA.toString());
  
  try {
    const platformAccount = await program.account.platform.fetch(platformPDA);
    console.log('✅ Platform already initialized');
    console.log('   Authority:', platformAccount.authority.toString());
    console.log('   Total bounties:', platformAccount.totalBounties.toString());
    console.log('   Fee basis points:', platformAccount.feeBasisPoints);
  } catch (e) {
    console.log('Platform not initialized, initializing...');
    const tx = await program.methods
      .initialize(200) // 2% fee
      .accounts({
        platform: platformPDA,
        authority: posterWallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log('✅ Platform initialized!');
    console.log('   Transaction:', tx);
    console.log('   Explorer: https://explorer.solana.com/tx/' + tx + '?cluster=devnet\n');
  }
  
  // Step 2: Create a bounty
  const bountyId = Date.now(); // Use timestamp as unique ID
  const [bountyPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('bounty'), posterWallet.publicKey.toBuffer(), Buffer.from(bountyId.toString())],
    PROGRAM_ID
  );
  
  console.log('\nCreating bounty #' + bountyId);
  console.log('Bounty PDA:', bountyPDA.toString());
  
  const createTx = await program.methods
    .createBounty(
      bountyId.toString(),
      'Test Bounty: Verify Price Feed Integration',
      new anchor.BN(0.1 * LAMPORTS_PER_SOL), // 0.1 SOL reward
      Math.floor(Date.now() / 1000) + 86400 // 24h deadline
    )
    .accounts({
      bounty: bountyPDA,
      poster: posterWallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
  
  console.log('✅ Bounty created!');
  console.log('   Transaction:', createTx);
  console.log('   Explorer: https://explorer.solana.com/tx/' + createTx + '?cluster=devnet');
  
  const bountyAccount = await program.account.bounty.fetch(bountyPDA);
  console.log('   Reward: ', bountyAccount.reward.toNumber() / LAMPORTS_PER_SOL, 'SOL');
  console.log('   Status:', Object.keys(bountyAccount.status)[0]);
  
  // Step 3: Claim the bounty (from claimer wallet)
  const claimerProvider = new AnchorProvider(
    connection,
    new Wallet(claimerWallet),
    { commitment: 'confirmed' }
  );
  const claimerProgram = new Program(idlJson, PROGRAM_ID, claimerProvider);
  
  console.log('\nClaiming bounty as claimer...');
  
  const claimTx = await claimerProgram.methods
    .claimBounty()
    .accounts({
      bounty: bountyPDA,
      claimer: claimerWallet.publicKey,
    })
    .rpc();
  
  console.log('✅ Bounty claimed!');
  console.log('   Transaction:', claimTx);
  console.log('   Explorer: https://explorer.solana.com/tx/' + claimTx + '?cluster=devnet');
  
  // Step 4: Submit proof
  console.log('\nSubmitting proof...');
  
  const submitTx = await claimerProgram.methods
    .submitProof('https://github.com/test/proof-of-work')
    .accounts({
      bounty: bountyPDA,
      claimer: claimerWallet.publicKey,
    })
    .rpc();
  
  console.log('✅ Proof submitted!');
  console.log('   Transaction:', submitTx);
  console.log('   Explorer: https://explorer.solana.com/tx/' + submitTx + '?cluster=devnet');
  
  // Step 5: Approve and payout (back to poster wallet)
  console.log('\nApproving submission and paying out...');
  
  const approveTx = await program.methods
    .approveSubmission()
    .accounts({
      bounty: bountyPDA,
      platform: platformPDA,
      poster: posterWallet.publicKey,
      claimer: claimerWallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
  
  console.log('✅ Bounty approved and paid out!');
  console.log('   Transaction:', approveTx);
  console.log('   Explorer: https://explorer.solana.com/tx/' + approveTx + '?cluster=devnet');
  
  // Final balance check
  const finalClaimerBalance = await connection.getBalance(claimerWallet.publicKey);
  const earned = (finalClaimerBalance - claimerBalance) / LAMPORTS_PER_SOL;
  
  console.log('\n=== RESULTS ===');
  console.log('Claimer earned:', earned, 'SOL');
  console.log('Final claimer balance:', finalClaimerBalance / LAMPORTS_PER_SOL, 'SOL');
  
  console.log('\n🎉 FULL BOUNTY FLOW COMPLETE! 🎉\n');
  console.log('Transaction signatures:');
  console.log('1. Create:', createTx);
  console.log('2. Claim:', claimTx);
  console.log('3. Submit:', submitTx);
  console.log('4. Approve:', approveTx);
  console.log('\nAll verified on Solana Explorer (devnet)\n');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
