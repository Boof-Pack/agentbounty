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

const DISC = {
  initialize: [175, 175, 109, 31, 13, 152, 155, 237],
  createBounty: [122, 90, 14, 143, 8, 125, 200, 2],
  claimBounty: [225, 157, 163, 238, 239, 169, 75, 226],
  submitWork: [158, 80, 101, 51, 114, 130, 101, 253],
  approveWork: [181, 118, 45, 143, 204, 88, 237, 109],
};

function str(s) {
  const buf = Buffer.from(s);
  const len = Buffer.alloc(4);
  len.writeUInt32LE(buf.length);
  return Buffer.concat([len, buf]);
}

function u64(n) {
  return new BN(n).toArrayLike(Buffer, 'le', 8);
}

function i64(n) {
  return new BN(n).toArrayLike(Buffer, 'le', 8);
}

async function run() {
  console.log('\n=== FRESH PROTOCOL APPROACH FOR 8TH SIG ===\n');
  
  // Create completely fresh wallets
  const authority = Keypair.generate();
  const creator = Keypair.generate();
  const claimer = Keypair.generate();
  
  console.log('Fresh wallets created:');
  console.log('  Authority:', authority.publicKey.toString());
  console.log('  Creator:', creator.publicKey.toString());
  console.log('  Claimer:', claimer.publicKey.toString());
  
  // Fund from main wallet
  const main = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json'))));
  
  console.log('\nFunding...');
  const fundTx = new Transaction()
    .add(SystemProgram.transfer({
      fromPubkey: main.publicKey,
      toPubkey: creator.publicKey,
      lamports: 0.3 * LAMPORTS_PER_SOL,
    }))
    .add(SystemProgram.transfer({
      fromPubkey: main.publicKey,
      toPubkey: claimer.publicKey,
      lamports: 0.1 * LAMPORTS_PER_SOL,
    }));
  
  await sendAndConfirmTransaction(connection, fundTx, [main]);
  console.log('✅ Funded\n');
  
  // Derive fresh protocol PDA with a unique seed
  const uniqueSeed = `protocol-${Date.now()}`;
  const [protocolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from(uniqueSeed)],
    PROGRAM_ID
  );
  
  const [feeVaultPDA] = PublicKey.findProgramAddressSync([Buffer.from('fee_vault')], PROGRAM_ID);
  
  console.log('Protocol PDA:', protocolPDA.toString());
  console.log('Using seed:', uniqueSeed);
  
  // Check if this PDA exists
  const existing = await connection.getAccountInfo(protocolPDA);
  if (existing) {
    console.log('\n❌ PDA already exists! Try again with different timestamp.');
    process.exit(1);
  }
  
  console.log('✅ Fresh PDA confirmed\n');
  
  // Initialize NEW protocol
  console.log('Initializing fresh protocol...');
  const initTx = new Transaction().add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: protocolPDA, isSigner: false, isWritable: true },
      { pubkey: feeVaultPDA, isSigner: false, isWritable: false },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(DISC.initialize),
  }));
  
  const initSig = await sendAndConfirmTransaction(connection, initTx, [authority]);
  console.log(`✅ Initialized: ${initSig}\n`);
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Now use THIS protocol's bounty system
  const idBuf = Buffer.alloc(8);
  idBuf.writeBigUInt64LE(BigInt(0)); // First bounty
  
  const [bountyPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('bounty'), idBuf],
    PROGRAM_ID
  );
  
  console.log('Bounty PDA:', bountyPDA.toString());
  console.log();
  
  // Full flow
  console.log('1. Creating bounty...');
  const createTx = new Transaction().add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: protocolPDA, isSigner: false, isWritable: true },
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
      { pubkey: creator.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      Buffer.from(DISC.createBounty),
      str('8th sig test'),
      str('Fresh protocol test'),
      u64(0.1 * LAMPORTS_PER_SOL),
      i64(Math.floor(Date.now()/1000) + 86400),
    ]),
  }));
  const createSig = await sendAndConfirmTransaction(connection, createTx, [creator]);
  console.log(`✅ ${createSig}\n`);
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('2. Claiming...');
  const claimTx = new Transaction().add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
      { pubkey: claimer.publicKey, isSigner: true, isWritable: false },
    ],
    data: Buffer.from(DISC.claimBounty),
  }));
  const claimSig = await sendAndConfirmTransaction(connection, claimTx, [claimer]);
  console.log(`✅ ${claimSig}\n`);
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('3. Submitting...');
  const submitTx = new Transaction().add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
      { pubkey: claimer.publicKey, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([Buffer.from(DISC.submitWork), str('https://github.com/Boof-Pack/agentbounty')]),
  }));
  const submitSig = await sendAndConfirmTransaction(connection, submitTx, [claimer]);
  console.log(`✅ ${submitSig}\n`);
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('4. APPROVING (8th sig!)...');
  const approveTx = new Transaction().add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: protocolPDA, isSigner: false, isWritable: true },
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
      { pubkey: feeVaultPDA, isSigner: false, isWritable: true },
      { pubkey: claimer.publicKey, isSigner: false, isWritable: true },
      { pubkey: creator.publicKey, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(DISC.approveWork),
  }));
  const approveSig = await sendAndConfirmTransaction(connection, approveTx, [creator]);
  
  console.log(`\n🎉🎉🎉 8/8 COMPLETE! 🎉🎉🎉\n`);
  console.log(`8th Signature: ${approveSig}`);
  console.log(`https://explorer.solana.com/tx/${approveSig}?cluster=devnet\n`);
}

run().catch(e => {
  console.error('\n❌', e.message);
  if (e.logs) e.logs.forEach(l => console.error('  ', l));
  process.exit(1);
});
