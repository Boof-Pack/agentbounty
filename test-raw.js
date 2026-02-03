/**
 * Raw transaction test bypassing Anchor SDK
 * Builds instructions manually using discriminators from IDL
 */

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
const BN = require('bn.js');

const PROGRAM_ID = new PublicKey('9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Instruction discriminators from IDL (verified)
const INSTRUCTIONS = {
  initialize: [175, 175, 109, 31, 13, 152, 155, 237],
  createBounty: [122, 90, 14, 143, 8, 125, 200, 2],
  claimBounty: [225, 157, 163, 238, 239, 169, 75, 226],
  submitWork: [158, 80, 101, 51, 114, 130, 101, 253],
  approveWork: [181, 118, 45, 143, 204, 88, 237, 109],
};

async function main() {
  console.log('\n=== RAW INSTRUCTION TEST ===\n');

  // Load wallets
  const posterSecret = JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf-8'));
  const claimerSecret = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/wallet-claimer.json', 'utf-8'));
  
  const poster = Keypair.fromSecretKey(new Uint8Array(posterSecret));
  const claimer = Keypair.fromSecretKey(new Uint8Array(claimerSecret));
  
  console.log('Poster: ', poster.publicKey.toString());
  console.log('Claimer:', claimer.publicKey.toString());
  
  // Check balances
  const posterBalance = await connection.getBalance(poster.publicKey);
  const claimerBalance = await connection.getBalance(claimer.publicKey);
  console.log('\nPoster balance: ', (posterBalance / LAMPORTS_PER_SOL).toFixed(4), 'SOL');
  console.log('Claimer balance:', (claimerBalance / LAMPORTS_PER_SOL).toFixed(4), 'SOL\n');

  // Step 1: Derive protocol PDA (called "platform" in older version, "protocol" in current)
  const [protocolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol')],
    PROGRAM_ID
  );
  
  console.log('Protocol PDA:', protocolPDA.toString());
  
  // Check if protocol is initialized
  const protocolAccount = await connection.getAccountInfo(protocolPDA);
  
  if (!protocolAccount) {
    console.log('Initializing protocol...\n');
    
    // Derive fee vault PDA
    const [feeVaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('fee_vault')],
      PROGRAM_ID
    );
    
    // Build initialize instruction (NO args according to IDL)
    const initData = Buffer.from(INSTRUCTIONS.initialize);
    
    const initIx = new TransactionInstruction({
      keys: [
        { pubkey: protocolPDA, isSigner: false, isWritable: true },
        { pubkey: feeVaultPDA, isSigner: false, isWritable: false },
        { pubkey: poster.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: initData,
    });
    
    const initTx = new Transaction().add(initIx);
    const initSig = await sendAndConfirmTransaction(connection, initTx, [poster]);
    
    console.log('✅ Protocol initialized!');
    console.log('   Signature:', initSig);
    console.log('   Explorer: https://explorer.solana.com/tx/' + initSig + '?cluster=devnet\n');
  } else {
    console.log('✅ Protocol already initialized\n');
  }
  
  // Step 2: Create bounty
  // First, fetch protocol account to get total_bounties
  const protocolData = await connection.getAccountInfo(protocolPDA);
  if (!protocolData) {
    throw new Error('Protocol not initialized');
  }
  
  // Parse total_bounties from protocol account
  // Structure: discriminator(8) + authority(32) + total_bounties(8)
  const totalBounties = protocolData.data.readBigUInt64LE(40); // At offset 40
  console.log('Total bounties so far:', totalBounties.toString());
  
  // Derive bounty PDA using total_bounties
  const totalBountiesBuffer = Buffer.alloc(8);
  totalBountiesBuffer.writeBigUInt64LE(totalBounties);
  
  const [bountyPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('bounty'), totalBountiesBuffer],
    PROGRAM_ID
  );
  
  // Derive escrow PDA
  const [escrowPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), bountyPDA.toBuffer()],
    PROGRAM_ID
  );
  
  console.log('Creating bounty #' + totalBounties);
  console.log('Bounty PDA:', bountyPDA.toString());
  console.log('Escrow PDA:', escrowPDA.toString());
  
  // Build create_bounty instruction
  // Args: title, description, reward_lamports, deadline_ts
  const title = 'Test Bounty #' + totalBounties;
  const description = 'Full AgentBounty Flow Verification - Created by AI Agent';
  const reward = new BN(0.1 * LAMPORTS_PER_SOL);
  const deadline = new BN(Math.floor(Date.now() / 1000) + 86400);
  
  // Encode strings and numbers
  function encodeString(str) {
    const buf = Buffer.from(str, 'utf-8');
    const len = Buffer.alloc(4);
    len.writeUInt32LE(buf.length);
    return Buffer.concat([len, buf]);
  }
  
  const createData = Buffer.concat([
    Buffer.from(INSTRUCTIONS.createBounty),
    encodeString(title),
    encodeString(description),
    reward.toArrayLike(Buffer, 'le', 8),
    deadline.toArrayLike(Buffer, 'le', 8),
  ]);
  
  const createIx = new TransactionInstruction({
    keys: [
      { pubkey: protocolPDA, isSigner: false, isWritable: true },
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
      { pubkey: escrowPDA, isSigner: false, isWritable: true },
      { pubkey: poster.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: createData,
  });
  
  const createTx = new Transaction().add(createIx);
  const createSig = await sendAndConfirmTransaction(connection, createTx, [poster]);
  
  console.log('✅ Bounty created!');
  console.log('   Signature:', createSig);
  console.log('   Explorer: https://explorer.solana.com/tx/' + createSig + '?cluster=devnet\n');
  
  // Step 3: Claim bounty
  console.log('Claiming bounty...');
  
  const claimData = Buffer.from(INSTRUCTIONS.claimBounty);
  
  const claimIx = new TransactionInstruction({
    keys: [
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
      { pubkey: claimer.publicKey, isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: claimData,
  });
  
  const claimTx = new Transaction().add(claimIx);
  const claimSig = await sendAndConfirmTransaction(connection, claimTx, [claimer]);
  
  console.log('✅ Bounty claimed!');
  console.log('   Signature:', claimSig);
  console.log('   Explorer: https://explorer.solana.com/tx/' + claimSig + '?cluster=devnet\n');
  
  // Step 4: Submit proof
  console.log('Submitting proof...');
  
  const proofUrl = `https://explorer.solana.com/tx/${claimSig}?cluster=devnet`;
  const submitData = Buffer.concat([
    Buffer.from(INSTRUCTIONS.submitWork),
    encodeString(proofUrl),
  ]);
  
  const submitIx = new TransactionInstruction({
    keys: [
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
      { pubkey: claimer.publicKey, isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: submitData,
  });
  
  const submitTx = new Transaction().add(submitIx);
  const submitSig = await sendAndConfirmTransaction(connection, submitTx, [claimer]);
  
  console.log('✅ Proof submitted!');
  console.log('   Signature:', submitSig);
  console.log('   Explorer: https://explorer.solana.com/tx/' + submitSig + '?cluster=devnet\n');
  
  // Step 5: Approve and payout
  console.log('Approving and paying out...');
  
  // Derive fee vault PDA
  const [feeVaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('fee_vault')],
    PROGRAM_ID
  );
  
  const approveData = Buffer.from(INSTRUCTIONS.approveWork);
  
  const approveIx = new TransactionInstruction({
    keys: [
      { pubkey: protocolPDA, isSigner: false, isWritable: false },
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
      { pubkey: escrowPDA, isSigner: false, isWritable: true },
      { pubkey: feeVaultPDA, isSigner: false, isWritable: true },
      { pubkey: claimer.publicKey, isSigner: false, isWritable: true },
      { pubkey: poster.publicKey, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: approveData,
  });
  
  const approveTx = new Transaction().add(approveIx);
  const approveSig = await sendAndConfirmTransaction(connection, approveTx, [poster]);
  
  console.log('✅ Work approved and paid!');
  console.log('   Signature:', approveSig);
  console.log('   Explorer: https://explorer.solana.com/tx/' + approveSig + '?cluster=devnet\n');
  
  // Final balances
  const finalClaimerBalance = await connection.getBalance(claimer.publicKey);
  const earned = (finalClaimerBalance - claimerBalance) / LAMPORTS_PER_SOL;
  
  console.log('=== RESULTS ===');
  console.log('Claimer earned:', earned.toFixed(4), 'SOL');
  console.log('Final balance: ', (finalClaimerBalance / LAMPORTS_PER_SOL).toFixed(4), 'SOL\n');
  
  console.log('🎉 FULL BOUNTY FLOW COMPLETE! 🎉\n');
  console.log('Transaction signatures:');
  console.log('1. Create:  ', createSig);
  console.log('2. Claim:   ', claimSig);
  console.log('3. Submit:  ', submitSig);
  console.log('4. Approve: ', approveSig);
  console.log('\nAll verified on Solana Explorer (devnet)\n');
  
  // Save results
  const results = {
    timestamp: new Date().toISOString(),
    bountyId: totalBounties.toString(),
    bountyPDA: bountyPDA.toString(),
    transactions: {
      create: { signature: createSig, explorer: `https://explorer.solana.com/tx/${createSig}?cluster=devnet` },
      claim: { signature: claimSig, explorer: `https://explorer.solana.com/tx/${claimSig}?cluster=devnet` },
      submit: { signature: submitSig, explorer: `https://explorer.solana.com/tx/${submitSig}?cluster=devnet` },
      approve: { signature: approveSig, explorer: `https://explorer.solana.com/tx/${approveSig}?cluster=devnet` },
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
  if (err.logs) {
    console.error('\nProgram logs:');
    err.logs.forEach(log => console.error('  ', log));
  }
  process.exit(1);
});
