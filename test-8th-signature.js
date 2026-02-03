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

function serializeString(str) {
  const len = Buffer.alloc(4);
  len.writeUInt32LE(str.length, 0);
  return Buffer.concat([len, Buffer.from(str, 'utf8')]);
}

function serializeU64(num) {
  const bn = new BN(num);
  const buf = Buffer.alloc(8);
  bn.toArrayLike(Buffer, 'le', 8).copy(buf);
  return buf;
}

async function main() {
  console.log('\n=== GETTING 8TH SIGNATURE ===\n');

  // Load main wallet
  const mainSecret = JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf-8'));
  const main = Keypair.fromSecretKey(new Uint8Array(mainSecret));
  
  // Create fresh test wallets
  const creator = Keypair.generate();
  const claimer = Keypair.generate();
  
  console.log('Creator:', creator.publicKey.toString());
  console.log('Claimer:', claimer.publicKey.toString());
  
  // Fund test wallets
  console.log('\nFunding test wallets...');
  const fundTx = new Transaction()
    .add(
      SystemProgram.transfer({
        fromPubkey: main.publicKey,
        toPubkey: creator.publicKey,
        lamports: 1.5 * LAMPORTS_PER_SOL,
      })
    )
    .add(
      SystemProgram.transfer({
        fromPubkey: main.publicKey,
        toPubkey: claimer.publicKey,
        lamports: 0.5 * LAMPORTS_PER_SOL,
      })
    );
  
  await sendAndConfirmTransaction(connection, fundTx, [main]);
  console.log('✅ Funded\n');

  // PDAs
  const [protocolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol')],
    PROGRAM_ID
  );
  
  const bountyId = `final-test-${Date.now()}`;
  const [bountyPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('bounty'), Buffer.from(bountyId)],
    PROGRAM_ID
  );
  
  console.log('Bounty ID:', bountyId);
  console.log('Bounty PDA:', bountyPDA.toString());
  console.log();
  
  // 1. CREATE BOUNTY
  console.log('1️⃣  Creating bounty...');
  const createData = Buffer.concat([
    Buffer.from(INSTRUCTIONS.createBounty),
    serializeString(bountyId),
    serializeString("Final test for 8th signature"),
    serializeU64(0.5 * LAMPORTS_PER_SOL),
  ]);
  
  const createIx = new TransactionInstruction({
    keys: [
      { pubkey: creator.publicKey, isSigner: true, isWritable: true },
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
      { pubkey: protocolPDA, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: createData,
  });
  
  const createTx = new Transaction().add(createIx);
  const createSig = await sendAndConfirmTransaction(connection, createTx, [creator]);
  console.log(`✅ Created: ${createSig}\n`);
  await new Promise(r => setTimeout(r, 2000));
  
  // 2. CLAIM BOUNTY
  console.log('2️⃣  Claiming bounty...');
  const claimData = Buffer.from(INSTRUCTIONS.claimBounty);
  
  const claimIx = new TransactionInstruction({
    keys: [
      { pubkey: claimer.publicKey, isSigner: true, isWritable: false },
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
    ],
    programId: PROGRAM_ID,
    data: claimData,
  });
  
  const claimTx = new Transaction().add(claimIx);
  const claimSig = await sendAndConfirmTransaction(connection, claimTx, [claimer]);
  console.log(`✅ Claimed: ${claimSig}\n`);
  await new Promise(r => setTimeout(r, 2000));
  
  // 3. SUBMIT WORK
  console.log('3️⃣  Submitting work...');
  const submitData = Buffer.concat([
    Buffer.from(INSTRUCTIONS.submitWork),
    serializeString("https://github.com/Boof-Pack/agentbounty/final-proof"),
  ]);
  
  const submitIx = new TransactionInstruction({
    keys: [
      { pubkey: claimer.publicKey, isSigner: true, isWritable: false },
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
    ],
    programId: PROGRAM_ID,
    data: submitData,
  });
  
  const submitTx = new Transaction().add(submitIx);
  const submitSig = await sendAndConfirmTransaction(connection, submitTx, [claimer]);
  console.log(`✅ Submitted: ${submitSig}\n`);
  await new Promise(r => setTimeout(r, 2000));
  
  // 4. APPROVE WORK - THE 8TH SIGNATURE!
  console.log('4️⃣  Approving work (8th signature)...');
  const approveData = Buffer.from(INSTRUCTIONS.approveWork);
  
  const approveIx = new TransactionInstruction({
    keys: [
      { pubkey: creator.publicKey, isSigner: true, isWritable: true },
      { pubkey: claimer.publicKey, isSigner: false, isWritable: true },
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
      { pubkey: protocolPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: approveData,
  });
  
  const approveTx = new Transaction().add(approveIx);
  const approveSig = await sendAndConfirmTransaction(connection, approveTx, [creator]);
  
  console.log(`\n🎉🎉🎉 SUCCESS! 8/8 COMPLETE! 🎉🎉🎉`);
  console.log(`\n8th Signature: ${approveSig}`);
  console.log(`Explorer: https://explorer.solana.com/tx/${approveSig}?cluster=devnet`);
  console.log(`\n✅ All bounty functions verified on-chain!`);
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  if (err.logs) {
    console.error('\nProgram logs:');
    err.logs.forEach(log => console.error('  ', log));
  }
  process.exit(1);
});
