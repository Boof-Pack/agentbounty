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
  // Use existing funded wallets
  const poster = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json'))));
  const claimer = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('/root/.openclaw/workspace/wallet-claimer.json'))));
  
  console.log('Poster: ', poster.publicKey.toString());
  console.log('Claimer:', claimer.publicKey.toString());
  
  const [protocolPDA] = PublicKey.findProgramAddressSync([Buffer.from('protocol')], PROGRAM_ID);
  const [feeVaultPDA] = PublicKey.findProgramAddressSync([Buffer.from('fee_vault')], PROGRAM_ID);
  
  // Get total bounties
  const pAcc = await connection.getAccountInfo(protocolPDA);
  const totalBounties = pAcc.data.readBigUInt64LE(40);
  
  const idBuf = Buffer.alloc(8);
  idBuf.writeBigUInt64LE(totalBounties);
  const [bountyPDA] = PublicKey.findProgramAddressSync([Buffer.from('bounty'), idBuf], PROGRAM_ID);
  
  console.log(`\nBounty #${totalBounties}`);
  console.log(`PDA: ${bountyPDA.toString()}\n`);
  
  // 1. Create
  console.log('1. Creating...');
  const create = new Transaction().add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: protocolPDA, isSigner: false, isWritable: true },
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
      { pubkey: poster.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      Buffer.from(DISC.createBounty),
      str('8th sig test'),
      str('Testing approve_work'),
      u64(0.1 * LAMPORTS_PER_SOL),
      i64(Math.floor(Date.now()/1000) + 86400),
    ]),
  }));
  create.feePayer = poster.publicKey;
  const createSig = await sendAndConfirmTransaction(connection, create, [poster], {commitment: 'confirmed'});
  console.log(`✅ ${createSig}\n`);
  
  await new Promise(r => setTimeout(r, 3000));
  
  // 2. Claim
  console.log('2. Claiming...');
  const claim = new Transaction().add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
      { pubkey: claimer.publicKey, isSigner: true, isWritable: false },
    ],
    data: Buffer.from(DISC.claimBounty),
  }));
  claim.feePayer = claimer.publicKey;
  const claimSig = await sendAndConfirmTransaction(connection, claim, [claimer], {commitment: 'confirmed'});
  console.log(`✅ ${claimSig}\n`);
  
  await new Promise(r => setTimeout(r, 3000));
  
  // 3. Submit
  console.log('3. Submitting...');
  const submit = new Transaction().add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
      { pubkey: claimer.publicKey, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([
      Buffer.from(DISC.submitWork),
      str('https://github.com/Boof-Pack/agentbounty'),
    ]),
  }));
  submit.feePayer = claimer.publicKey;
  const submitSig = await sendAndConfirmTransaction(connection, submit, [claimer], {commitment: 'confirmed'});
  console.log(`✅ ${submitSig}\n`);
  
  await new Promise(r => setTimeout(r, 3000));
  
  // 4. APPROVE - 8th signature!
  console.log('4. APPROVING (8th sig)...');
  const approve = new Transaction().add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: protocolPDA, isSigner: false, isWritable: true },
      { pubkey: bountyPDA, isSigner: false, isWritable: true },
      { pubkey: feeVaultPDA, isSigner: false, isWritable: true },
      { pubkey: claimer.publicKey, isSigner: false, isWritable: true },
      { pubkey: poster.publicKey, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(DISC.approveWork),
  }));
  approve.feePayer = poster.publicKey;
  const approveSig = await sendAndConfirmTransaction(connection, approve, [poster], {commitment: 'confirmed'});
  
  console.log(`\n🎉 8/8 COMPLETE!\n`);
  console.log(`8th signature: ${approveSig}`);
  console.log(`https://explorer.solana.com/tx/${approveSig}?cluster=devnet\n`);
}

run().catch(e => {
  console.error('\n❌', e.message);
  if (e.logs) e.logs.forEach(l => console.error(l));
  process.exit(1);
});
