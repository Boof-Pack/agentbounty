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

function encodeString(str) {
  const buf = Buffer.from(str, 'utf-8');
  const len = Buffer.alloc(4);
  len.writeUInt32LE(buf.length);
  return Buffer.concat([len, buf]);
}

async function main() {
  console.log('\n=== FINAL APPROVE_WORK TEST ===\n');

  // Load main wallet + create test wallets
  const mainSecret = JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json'));
  const main = Keypair.fromSecretKey(new Uint8Array(mainSecret));
  const creator = Keypair.generate();
  const claimer = Keypair.generate();
  
  console.log('Poster: ', creator.publicKey.toString());
  console.log('Claimer:', claimer.publicKey.toString());
  
  // Fund test wallets
  console.log('\nFunding...');
  const fundTx = new Transaction()
    .add(SystemProgram.transfer({
      fromPubkey: main.publicKey,
      toPubkey: creator.publicKey,
      lamports: 0.4 * LAMPORTS_PER_SOL,
    }))
    .add(SystemProgram.transfer({
      fromPubkey: main.publicKey,
      toPubkey: claimer.publicKey,
      lamports: 0.2 * LAMPORTS_PER_SOL,
    }));
  
  await sendAndConfirmTransaction(connection, fundTx, [main]);
  console.log('✅ Funded\n');

  // Get PDAs
  const [protocolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol')],
    PROGRAM_ID
  );
  
  const [feeVaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('fee_vault')],
    PROGRAM_ID
  );
  
  // Get current total_bounties to derive correct bounty PDA
  const protocolData = await connection.getAccountInfo(protocolPDA);
  if (!protocolData) {
    throw new Error('Protocol not initialized');
  }
  
  // Parse total_bounties: discriminator(8) + authority(32) + total_bounties(8)
  const totalBounties = protocolData.data.readBigUInt64LE(40);
  console.log('Current total bounties:', totalBounties.toString());
  
  // Derive bounty PDA using total_bounties as u64
  const bountyIdBuffer = Buffer.alloc(8);
  bountyIdBuffer.writeBigUInt64LE(totalBounties);
  
  const [bountyPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('bounty'), bountyIdBuffer],
    PROGRAM_ID
  );
  
  console.log('Bounty PDA:', bountyPDA.toString());
  console.log();
  
  // 1. CREATE BOUNTY
  console.log('1️⃣  Creating bounty...');
  const title = `Test Bounty #${totalBounties}`;
  const description = 'Testing approve_work for 8th signature';
  const reward = new BN(0.1 * LAMPORTS_PER_SOL);
  const deadline = new BN(Math.floor(Date.now() / 1000) + 86400);
  
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
      { pubkey: creator.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: createData,
  });
  
  const createTx = new Transaction().add(createIx);
  const createSig = await sendAndConfirmTransaction(connection, createTx, [creator]);
  console.log(`✅ ${createSig}\n`);
  await new Promise(r => setTimeout(r, 2000));
  
  // 2. CLAIM BOUNTY
  console.log('2️⃣  Claiming bounty...');
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
  console.log(`✅ ${claimSig}\n`);
  await new Promise(r => setTimeout(r, 2000));
  
  // 3. SUBMIT WORK
  console.log('3️⃣  Submitting work...');
  const proofUrl = 'https://github.com/Boof-Pack/agentbounty/8th-sig';
  
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
  console.log(`✅ ${submitSig}\n`);
  await new Promise(r => setTimeout(r, 2000));
  
  // 4. APPROVE WORK - THE 8TH SIGNATURE!
  console.log('4️⃣  Approving work...');
  const approveData = Buffer.from(INSTRUCTIONS.approveWork);
  
  const approveIx = new TransactionInstruction({
    keys: [
      { pubkey: protocolPDA, isSigner: false, isWritable: true },
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
      { pubkey: feeVaultPDA, isSigner: false, isWritable: true },
      { pubkey: claimer.publicKey, isSigner: false, isWritable: true },
      { pubkey: creator.publicKey, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: approveData,
  });
  
  const approveTx = new Transaction().add(approveIx);
  const approveSig = await sendAndConfirmTransaction(connection, approveTx, [creator]);
  
  console.log(`\n🎉🎉🎉 8/8 COMPLETE! 🎉🎉🎉`);
  console.log(`\n✨ 8th Signature: ${approveSig}`);
  console.log(`🔗 https://explorer.solana.com/tx/${approveSig}?cluster=devnet\n`);
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  if (err.logs) {
    console.error('\nLogs:');
    err.logs.forEach(log => console.error('  ', log));
  }
  process.exit(1);
});
