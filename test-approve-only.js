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

const PROGRAM_ID = new PublicKey('9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

const INSTRUCTIONS = {
  approveWork: [181, 118, 45, 143, 204, 88, 237, 109],
};

async function main() {
  const posterSecret = JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf-8'));
  const claimerSecret = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/wallet-claimer.json', 'utf-8'));
  
  const poster = Keypair.fromSecretKey(new Uint8Array(posterSecret));
  const claimer = Keypair.fromSecretKey(new Uint8Array(claimerSecret));
  
  // Bounty #6 which already exists and is submitted
  const bountyId = 6;
  const bountyIdBuffer = Buffer.alloc(8);
  bountyIdBuffer.writeBigUInt64LE(BigInt(bountyId));
  
  const [bountyPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('bounty'), bountyIdBuffer],
    PROGRAM_ID
  );
  
  const [protocolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol')],
    PROGRAM_ID
  );
  
  const [feeVaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('fee_vault')],
    PROGRAM_ID
  );
  
  console.log('Testing approve on bounty #6');
  console.log('Bounty PDA:', bountyPDA.toString());
  
  const claimerBalance = await connection.getBalance(claimer.publicKey);
  console.log('Claimer balance before:', (claimerBalance / LAMPORTS_PER_SOL).toFixed(4), 'SOL\n');
  
  const approveData = Buffer.from(INSTRUCTIONS.approveWork);
  
  const approveIx = new TransactionInstruction({
    keys: [
      { pubkey: protocolPDA, isSigner: false, isWritable: false },
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
  
  console.log('✅ APPROVE/PAYOUT SUCCESSFUL!');
  console.log('Signature:', approveSig);
  console.log('Explorer: https://explorer.solana.com/tx/' + approveSig + '?cluster=devnet\n');
  
  const finalBalance = await connection.getBalance(claimer.publicKey);
  const earned = (finalBalance - claimerBalance) / LAMPORTS_PER_SOL;
  
  console.log('Claimer earned:', earned.toFixed(4), 'SOL');
  console.log('Final balance:', (finalBalance / LAMPORTS_PER_SOL).toFixed(4), 'SOL\n');
  
  console.log('🎉 8/8 TRANSACTIONS COMPLETE! 🎉');
}

main().catch(console.error);
