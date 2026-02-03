/**
 * Fresh test with new protocol seed to test approve_work fix
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

// Instruction discriminators from IDL
const INSTRUCTIONS = {
  initialize: [175, 175, 109, 31, 13, 152, 155, 237],
  createBounty: [122, 90, 14, 143, 8, 125, 200, 2],
  claimBounty: [225, 157, 163, 238, 239, 169, 75, 226],
  submitWork: [158, 80, 101, 51, 114, 130, 101, 253],
  approveWork: [181, 118, 45, 143, 204, 88, 237, 109],
};

async function main() {
  console.log('\n=== TESTING APPROVE_WORK FIX ===\n');

  // Load wallets
  const posterSecret = JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf-8'));
  const claimerSecret = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/wallet-claimer.json', 'utf-8'));
  
  const poster = Keypair.fromSecretKey(new Uint8Array(posterSecret));
  const claimer = Keypair.fromSecretKey(new Uint8Array(claimerSecret));
  
  console.log('Poster: ', poster.publicKey.toString());
  console.log('Claimer:', claimer.publicKey.toString());

  // Use a versioned protocol seed to start fresh
  const protocolSeed = 'protocol_v2';
  const [protocolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from(protocolSeed)],
    PROGRAM_ID
  );
  
  const [feeVaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('fee_vault_v2')],
    PROGRAM_ID
  );
  
  console.log('\nProtocol PDA (v2):', protocolPDA.toString());
  console.log('Fee Vault PDA (v2):', feeVaultPDA.toString());
  
  // Check if protocol is initialized
  const protocolAccount = await connection.getAccountInfo(protocolPDA);
  
  if (!protocolAccount) {
    console.log('\nInitializing fresh protocol...');
    
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
    
    console.log('✅ Protocol initialized:', initSig);
  } else {
    console.log('\n✅ Protocol already initialized');
  }
  
  // Get total bounties
  const protocolData = await connection.getAccountInfo(protocolPDA);
  const totalBounties = protocolData.data.readBigUInt64LE(40);
  console.log('\nTotal bounties:', totalBounties.toString());
  
  // Derive bounty PDA
  const totalBountiesBuffer = Buffer.alloc(8);
  totalBountiesBuffer.writeBigUInt64LE(totalBounties);
  
  const [bountyPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('bounty'), totalBountiesBuffer],
    PROGRAM_ID
  );
  
  console.log('Creating bounty #' + totalBounties);
  console.log('Bounty PDA:', bountyPDA.toString());
  
  // Helper to encode strings
  function encodeString(str) {
    const buf = Buffer.from(str, 'utf-8');
    const len = Buffer.alloc(4);
    len.writeUInt32LE(buf.length);
    return Buffer.concat([len, buf]);
  }
  
  // 1. CREATE
  const reward = new BN(0.15 * LAMPORTS_PER_SOL);
  const deadline = new BN(Math.floor(Date.now() / 1000) + 3600);
  
  const createData = Buffer.concat([
    Buffer.from(INSTRUCTIONS.createBounty),
    encodeString('Approve Fix Test'),
    encodeString('Testing approve_work with protocol mut fix'),
    reward.toArrayLike(Buffer, 'le', 8),
    deadline.toArrayLike(Buffer, 'le', 8),
  ]);
  
  const createIx = new TransactionInstruction({
    keys: [
      { pubkey: protocolPDA, isSigner: false, isWritable: true },
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
      { pubkey: poster.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: createData,
  });
  
  console.log('\n1. Creating bounty...');
  const createTx = new Transaction().add(createIx);
  const createSig = await sendAndConfirmTransaction(connection, createTx, [poster]);
  console.log('✅ Created:', createSig);
  
  // 2. CLAIM
  console.log('\n2. Claiming bounty...');
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
  console.log('✅ Claimed:', claimSig);
  
  // 3. SUBMIT
  console.log('\n3. Submitting work...');
  const submitData = Buffer.concat([
    Buffer.from(INSTRUCTIONS.submitWork),
    encodeString('https://github.com/fix/approve'),
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
  console.log('✅ Submitted:', submitSig);
  
  // 4. APPROVE (THE FIX TEST)
  console.log('\n4. Approving work (THE FIX)...');
  const claimerBalanceBefore = await connection.getBalance(claimer.publicKey);
  
  const approveData = Buffer.from(INSTRUCTIONS.approveWork);
  
  const approveIx = new TransactionInstruction({
    keys: [
      { pubkey: protocolPDA, isSigner: false, isWritable: true }, // FIXED: now mut
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
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
  console.log('✅ APPROVED:', approveSig);
  
  // Check payout
  const claimerBalanceAfter = await connection.getBalance(claimer.publicKey);
  const earned = (claimerBalanceAfter - claimerBalanceBefore) / LAMPORTS_PER_SOL;
  
  console.log('\n🎉 SUCCESS! approve_work is FIXED!');
  console.log('\nClaimer earned:', earned.toFixed(4), 'SOL');
  console.log('\n📊 TRANSACTION #8:', approveSig);
  console.log('Explorer:', `https://explorer.solana.com/tx/${approveSig}?cluster=devnet`);
  
  console.log('\n✅ 8/8 SIGNATURES COMPLETE!\n');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  if (err.logs) {
    console.error('\nLogs:');
    err.logs.forEach(log => console.error(' ', log));
  }
  process.exit(1);
});
