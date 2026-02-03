/**
 * Complete flow using manual instructions (we know this works)
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
  console.log('\n🎯 COMPLETE FLOW TEST\n');

  // Load wallets
  const posterSecret = JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json'));
  const poster = Keypair.fromSecretKey(new Uint8Array(posterSecret));
  
  // Create fresh claimer
  const claimer = Keypair.generate();
  console.log('Poster: ', poster.publicKey.toString());
  console.log('Claimer:', claimer.publicKey.toString());
  
  // Fund claimer from poster
  console.log('\nFunding claimer from poster...');
  const fundTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: poster.publicKey,
      toPubkey: claimer.publicKey,
      lamports: 0.5 * LAMPORTS_PER_SOL,
    })
  );
  await sendAndConfirmTransaction(connection, fundTx, [poster]);
  console.log('✅ Funded\n');

  // PDAs
  const [protocolPDA] = PublicKey.findProgramAddressSync([Buffer.from('protocol')], PROGRAM_ID);
  const [feeVaultPDA] = PublicKey.findProgramAddressSync([Buffer.from('fee_vault')], PROGRAM_ID);
  
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
  
  console.log('Creating bounty #' + totalBounties);
  console.log('Bounty PDA:', bountyPDA.toString());
  
  function encodeString(str) {
    const buf = Buffer.from(str, 'utf-8');
    const len = Buffer.alloc(4);
    len.writeUInt32LE(buf.length);
    return Buffer.concat([len, buf]);
  }
  
  const sigs = {};
  
  // 1. CREATE
  console.log('\n1️⃣ Creating bounty...');
  const reward = new BN(0.15 * LAMPORTS_PER_SOL);
  const deadline = new BN(Math.floor(Date.now() / 1000) + 7200);
  
  const createData = Buffer.concat([
    Buffer.from(INSTRUCTIONS.createBounty),
    encodeString('Complete Flow Test'),
    encodeString('Testing all 4 steps including approve'),
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
  
  sigs.create = await sendAndConfirmTransaction(connection, new Transaction().add(createIx), [poster]);
  console.log('✅', sigs.create);
  
  // 2. CLAIM
  console.log('\n2️⃣ Claiming bounty...');
  const claimData = Buffer.from(INSTRUCTIONS.claimBounty);
  
  const claimIx = new TransactionInstruction({
    keys: [
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
      { pubkey: claimer.publicKey, isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: claimData,
  });
  
  sigs.claim = await sendAndConfirmTransaction(connection, new Transaction().add(claimIx), [claimer]);
  console.log('✅', sigs.claim);
  
  // 3. SUBMIT
  console.log('\n3️⃣ Submitting work...');
  const submitData = Buffer.concat([
    Buffer.from(INSTRUCTIONS.submitWork),
    encodeString('https://github.com/agent-one-x/complete-test'),
  ]);
  
  const submitIx = new TransactionInstruction({
    keys: [
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
      { pubkey: claimer.publicKey, isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: submitData,
  });
  
  sigs.submit = await sendAndConfirmTransaction(connection, new Transaction().add(submitIx), [claimer]);
  console.log('✅', sigs.submit);
  
  // 4. APPROVE
  console.log('\n4️⃣ Approving work (THE BIG TEST)...');
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
  
  sigs.approve = await sendAndConfirmTransaction(connection, new Transaction().add(approveIx), [poster]);
  console.log('✅', sigs.approve);
  
  const claimerBalanceAfter = await connection.getBalance(claimer.publicKey);
  const earned = (claimerBalanceAfter - claimerBalanceBefore) / LAMPORTS_PER_SOL;
  
  console.log('\n🎉🎉🎉 SUCCESS! 8/8 COMPLETE! 🎉🎉🎉');
  console.log('\nClaimer earned:', earned.toFixed(4), 'SOL');
  console.log('\n📊 ALL SIGNATURES:');
  console.log('1. Create: ', sigs.create);
  console.log('2. Claim:  ', sigs.claim);
  console.log('3. Submit: ', sigs.submit);
  console.log('4. Approve:', sigs.approve);
  console.log('\n🔗 View on Explorer:', `https://explorer.solana.com/tx/${sigs.approve}?cluster=devnet`);
  
  // Save
  fs.writeFileSync('/root/.openclaw/workspace/agentbounty/SIGNATURE_8.txt', sigs.approve);
  fs.writeFileSync('/root/.openclaw/workspace/agentbounty/ALL_SIGNATURES.json', JSON.stringify(sigs, null, 2));
  
  console.log('\n✅ Results saved\n');
  console.log('🏆 READY TO DEPLOY!\n');
  
  return sigs;
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message);
  if (err.logs) {
    console.error('\nLogs:');
    err.logs.forEach(log => console.error(' ', log));
  }
  process.exit(1);
});
