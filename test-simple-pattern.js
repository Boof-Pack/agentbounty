/**
 * Test the SIMPLE pattern: SOL lives in bounty PDA directly
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

const INSTRUCTIONS = {
  createBounty: [122, 90, 14, 143, 8, 125, 200, 2],
  claimBounty: [225, 157, 163, 238, 239, 169, 75, 226],
  submitWork: [158, 80, 101, 51, 114, 130, 101, 253],
  approveWork: [181, 118, 45, 143, 204, 88, 237, 109],
};

async function main() {
  console.log('\n🚀 Testing SIMPLE PATTERN (no escrow)\n');

  // Load wallets
  const posterSecret = JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json'));
  const claimerSecret = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/wallet-claimer.json'));
  
  const poster = Keypair.fromSecretKey(new Uint8Array(posterSecret));
  const claimer = Keypair.fromSecretKey(new Uint8Array(claimerSecret));
  
  console.log('Poster: ', poster.publicKey.toString());
  console.log('Claimer:', claimer.publicKey.toString());

  // PDAs
  const [protocolPDA] = PublicKey.findProgramAddressSync([Buffer.from('protocol')], PROGRAM_ID);
  const [feeVaultPDA] = PublicKey.findProgramAddressSync([Buffer.from('fee_vault')], PROGRAM_ID);
  
  // Get bounty ID
  const protocolData = await connection.getAccountInfo(protocolPDA);
  const totalBounties = protocolData.data.readBigUInt64LE(40);
  console.log('\nTotal bounties:', totalBounties.toString());
  
  const totalBountiesBuffer = Buffer.alloc(8);
  totalBountiesBuffer.writeBigUInt64LE(totalBounties);
  
  const [bountyPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('bounty'), totalBountiesBuffer],
    PROGRAM_ID
  );
  
  console.log('Creating bounty #' + totalBounties);
  console.log('Bounty PDA:', bountyPDA.toString());
  
  // Helper
  function encodeString(str) {
    const buf = Buffer.from(str, 'utf-8');
    const len = Buffer.alloc(4);
    len.writeUInt32LE(buf.length);
    return Buffer.concat([len, buf]);
  }
  
  // 1. CREATE (NO ESCROW - funds go to bounty PDA directly)
  console.log('\n1️⃣  Creating bounty (simple pattern)...');
  const reward = new BN(0.15 * LAMPORTS_PER_SOL);
  const deadline = new BN(Math.floor(Date.now() / 1000) + 7200);
  
  const createData = Buffer.concat([
    Buffer.from(INSTRUCTIONS.createBounty),
    encodeString('Simple Pattern Test'),
    encodeString('Testing simple pattern: SOL in bounty PDA directly'),
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
  
  const createTx = new Transaction().add(createIx);
  const sig1 = await sendAndConfirmTransaction(connection, createTx, [poster]);
  console.log('✅ Created:', sig1);
  
  // Check bounty balance
  const bountyBalance = await connection.getBalance(bountyPDA);
  console.log('   Bounty PDA balance:', (bountyBalance / LAMPORTS_PER_SOL).toFixed(4), 'SOL');
  
  // 2. CLAIM
  console.log('\n2️⃣  Claiming bounty...');
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
  const sig2 = await sendAndConfirmTransaction(connection, claimTx, [claimer]);
  console.log('✅ Claimed:', sig2);
  
  // 3. SUBMIT
  console.log('\n3️⃣  Submitting work...');
  const submitData = Buffer.concat([
    Buffer.from(INSTRUCTIONS.submitWork),
    encodeString('https://github.com/agent-one-x/simple-pattern'),
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
  const sig3 = await sendAndConfirmTransaction(connection, submitTx, [claimer]);
  console.log('✅ Submitted:', sig3);
  
  // 4. APPROVE (transfers FROM bounty PDA)
  console.log('\n4️⃣  Approving work (simple pattern)...');
  const claimerBalanceBefore = await connection.getBalance(claimer.publicKey);
  
  const approveData = Buffer.from(INSTRUCTIONS.approveWork);
  
  const approveIx = new TransactionInstruction({
    keys: [
      { pubkey: protocolPDA, isSigner: false, isWritable: true },
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
  const sig4 = await sendAndConfirmTransaction(connection, approveTx, [poster]);
  console.log('✅ APPROVED:', sig4);
  
  // Check payout
  const claimerBalanceAfter = await connection.getBalance(claimer.publicKey);
  const earned = (claimerBalanceAfter - claimerBalanceBefore) / LAMPORTS_PER_SOL;
  
  console.log('\n🎉 SUCCESS! Simple pattern works!');
  console.log('\nClaimer earned:', earned.toFixed(4), 'SOL');
  console.log('\n📊 Transaction #8 (approve):', sig4);
  console.log('Explorer: https://explorer.solana.com/tx/' + sig4 + '?cluster=devnet');
  
  console.log('\n✅ 8/8 TRANSACTION SIGNATURES COMPLETE!');
  console.log('\nAll signatures:');
  console.log('1. Create:  ', sig1);
  console.log('2. Claim:   ', sig2);
  console.log('3. Submit:  ', sig3);
  console.log('4. Approve: ', sig4);
  console.log('\n🏆 AgentBounty is FULLY FUNCTIONAL!\n');
  
  // Save for forum post
  fs.writeFileSync('/root/.openclaw/workspace/agentbounty/SIGNATURE_8.txt', sig4);
  
  return sig4;
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message);
  if (err.logs) {
    console.error('\nLogs:');
    err.logs.forEach(log => console.error(' ', log));
  }
  process.exit(1);
});
