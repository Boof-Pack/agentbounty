/**
 * Final test of complete bounty flow with all fixes
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
  initialize: [175, 175, 109, 31, 13, 152, 155, 237],
  createBounty: [122, 90, 14, 143, 8, 125, 200, 2],
  claimBounty: [225, 157, 163, 238, 239, 169, 75, 226],
  submitWork: [158, 80, 101, 51, 114, 130, 101, 253],
  approveWork: [181, 118, 45, 143, 204, 88, 237, 109],
};

async function main() {
  console.log('\n🎯 FINAL TEST - Complete Bounty Flow\n');

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
  
  console.log('\nProtocol PDA:', protocolPDA.toString());
  
  // Get bounty ID
  const protocolData = await connection.getAccountInfo(protocolPDA);
  const totalBounties = protocolData.data.readBigUInt64LE(40);
  console.log('Total bounties:', totalBounties.toString());
  
  const totalBountiesBuffer = Buffer.alloc(8);
  totalBountiesBuffer.writeBigUInt64LE(totalBounties);
  
  const [bountyPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('bounty'), totalBountiesBuffer],
    PROGRAM_ID
  );
  
  const [escrowPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), bountyPDA.toBuffer()],
    PROGRAM_ID
  );
  
  console.log('\nBounty #' + totalBounties);
  console.log('Bounty PDA:', bountyPDA.toString());
  console.log('Escrow PDA:', escrowPDA.toString());
  
  // Helper
  function encodeString(str) {
    const buf = Buffer.from(str, 'utf-8');
    const len = Buffer.alloc(4);
    len.writeUInt32LE(buf.length);
    return Buffer.concat([len, buf]);
  }
  
  // 1. CREATE
  console.log('\n1️⃣  Creating bounty...');
  const reward = new BN(0.15 * LAMPORTS_PER_SOL);
  const deadline = new BN(Math.floor(Date.now() / 1000) + 7200);
  
  const createData = Buffer.concat([
    Buffer.from(INSTRUCTIONS.createBounty),
    encodeString('Final Test'),
    encodeString('Complete flow test with all fixes applied'),
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
  const sig1 = await sendAndConfirmTransaction(connection, createTx, [poster]);
  console.log('✅ Created:', sig1);
  
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
    encodeString('https://github.com/agent-one-x/final-test'),
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
  
  // 4. APPROVE (THE BIG TEST!)
  console.log('\n4️⃣  Approving work (THE FIX)...');
  const claimerBalanceBefore = await connection.getBalance(claimer.publicKey);
  
  const approveData = Buffer.from(INSTRUCTIONS.approveWork);
  
  const approveIx = new TransactionInstruction({
    keys: [
      { pubkey: protocolPDA, isSigner: false, isWritable: true }, // NOW MUT!
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
  const sig4 = await sendAndConfirmTransaction(connection, approveTx, [poster]);
  console.log('✅ APPROVED:', sig4);
  
  // Check payout
  const claimerBalanceAfter = await connection.getBalance(claimer.publicKey);
  const earned = (claimerBalanceAfter - claimerBalanceBefore) / LAMPORTS_PER_SOL;
  
  console.log('\n🎉 SUCCESS! All 4 steps completed!');
  console.log('\nClaimer earned:', earned.toFixed(4), 'SOL');
  console.log('\n📊 Transaction #8 (approve):', sig4);
  console.log('Explorer: https://explorer.solana.com/tx/' + sig4 + '?cluster=devnet');
  
  console.log('\n✅ 8/8 TRANSACTION SIGNATURES COMPLETE!');
  console.log('\nAll signatures:');
  console.log('1. Create:  ', sig1);
  console.log('2. Claim:   ', sig2);
  console.log('3. Submit:  ', sig3);
  console.log('4. Approve: ', sig4);
  console.log('\n🔥 AgentBounty is FULLY FUNCTIONAL!\n');
  
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
