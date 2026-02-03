const anchor = require('@coral-xyz/anchor');
const { Program, AnchorProvider, Wallet } = require('@coral-xyz/anchor');
const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');

const PROGRAM_ID = new PublicKey('9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK');

async function main() {
  console.log('\n=== FULL BOUNTY FLOW TEST ===\n');

  // Setup connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load wallets
  const posterSecret = JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf-8'));
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
  anchor.setProvider(provider);
  
  // Create program
  const program = new Program(idlJson, PROGRAM_ID, provider);
  
  console.log('✅ Program loaded successfully\n');
  
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
    const platformAccount = await connection.getAccountInfo(platformPDA);
    if (platformAccount) {
      console.log('✅ Platform already initialized\n');
    } else {
      throw new Error('Not initialized');
    }
  } catch (e) {
    console.log('Initializing platform...');
    const tx = await program.methods
      .initialize(200) // 2% fee
      .accounts({
        platform: platformPDA,
        authority: posterWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log('✅ Platform initialized!');
    console.log('   Transaction:', tx);
    console.log('   Explorer: https://explorer.solana.com/tx/' + tx + '?cluster=devnet\n');
    
    // Wait for confirmation
    await connection.confirmTransaction(tx);
  }
  
  // Step 2: Create a bounty
  const bountyId = 'test-' + Date.now();
  const [bountyPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('bounty'), posterWallet.publicKey.toBuffer(), Buffer.from(bountyId)],
    PROGRAM_ID
  );
  
  console.log('Creating bounty:', bountyId);
  console.log('Bounty PDA:', bountyPDA.toString());
  
  const createTx = await program.methods
    .createBounty(
      bountyId,
      'Test Bounty: Verify AgentBounty Integration',
      new anchor.BN(0.1 * LAMPORTS_PER_SOL), // 0.1 SOL reward
      new anchor.BN(Math.floor(Date.now() / 1000) + 86400) // 24h deadline
    )
    .accounts({
      bounty: bountyPDA,
      poster: posterWallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  
  await connection.confirmTransaction(createTx);
  
  console.log('✅ Bounty created!');
  console.log('   Transaction:', createTx);
  console.log('   Explorer: https://explorer.solana.com/tx/' + createTx + '?cluster=devnet\n');
  
  // Step 3: Claim the bounty (from claimer wallet)
  const claimerProvider = new AnchorProvider(
    connection,
    new Wallet(claimerWallet),
    { commitment: 'confirmed' }
  );
  const claimerProgram = new Program(idlJson, PROGRAM_ID, claimerProvider);
  
  console.log('Claiming bounty as claimer...');
  
  const claimTx = await claimerProgram.methods
    .claimBounty()
    .accounts({
      bounty: bountyPDA,
      claimer: claimerWallet.publicKey,
    })
    .rpc();
  
  await connection.confirmTransaction(claimTx);
  
  console.log('✅ Bounty claimed!');
  console.log('   Transaction:', claimTx);
  console.log('   Explorer: https://explorer.solana.com/tx/' + claimTx + '?cluster=devnet\n');
  
  // Step 4: Submit proof
  console.log('Submitting proof...');
  
  const submitTx = await claimerProgram.methods
    .submitProof('https://explorer.solana.com/tx/' + claimTx + '?cluster=devnet')
    .accounts({
      bounty: bountyPDA,
      claimer: claimerWallet.publicKey,
    })
    .rpc();
  
  await connection.confirmTransaction(submitTx);
  
  console.log('✅ Proof submitted!');
  console.log('   Transaction:', submitTx);
  console.log('   Explorer: https://explorer.solana.com/tx/' + submitTx + '?cluster=devnet\n');
  
  // Step 5: Approve and payout (back to poster wallet)
  console.log('Approving submission and paying out...');
  
  const approveTx = await program.methods
    .approveSubmission()
    .accounts({
      bounty: bountyPDA,
      platform: platformPDA,
      poster: posterWallet.publicKey,
      claimer: claimerWallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  
  await connection.confirmTransaction(approveTx);
  
  console.log('✅ Bounty approved and paid out!');
  console.log('   Transaction:', approveTx);
  console.log('   Explorer: https://explorer.solana.com/tx/' + approveTx + '?cluster=devnet\n');
  
  // Final balance check
  const finalClaimerBalance = await connection.getBalance(claimerWallet.publicKey);
  const earned = (finalClaimerBalance - claimerBalance) / LAMPORTS_PER_SOL;
  
  console.log('=== RESULTS ===');
  console.log('Claimer earned:', earned.toFixed(4), 'SOL');
  console.log('Final claimer balance:', (finalClaimerBalance / LAMPORTS_PER_SOL).toFixed(4), 'SOL\n');
  
  console.log('🎉 FULL BOUNTY FLOW COMPLETE! 🎉\n');
  console.log('Transaction signatures:');
  console.log('1. Create:  ', createTx);
  console.log('2. Claim:   ', claimTx);
  console.log('3. Submit:  ', submitTx);
  console.log('4. Approve: ', approveTx);
  console.log('\nAll verified on Solana Explorer (devnet)\n');
  
  // Save results
  const results = {
    timestamp: new Date().toISOString(),
    bountyId,
    bountyPDA: bountyPDA.toString(),
    transactions: {
      create: { signature: createTx, explorer: `https://explorer.solana.com/tx/${createTx}?cluster=devnet` },
      claim: { signature: claimTx, explorer: `https://explorer.solana.com/tx/${claimTx}?cluster=devnet` },
      submit: { signature: submitTx, explorer: `https://explorer.solana.com/tx/${submitTx}?cluster=devnet` },
      approve: { signature: approveTx, explorer: `https://explorer.solana.com/tx/${approveTx}?cluster=devnet` },
    },
    earned: earned.toFixed(4) + ' SOL',
  };
  
  fs.writeFileSync(
    '/root/.openclaw/workspace/agentbounty/TEST_RESULTS.json',
    JSON.stringify(results, null, 2)
  );
  
  console.log('✅ Results saved to TEST_RESULTS.json\n');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
