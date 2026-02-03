const anchor = require("@coral-xyz/anchor");
const { Keypair, SystemProgram, LAMPORTS_PER_SOL, Transaction } = require("@solana/web3.js");
const fs = require("fs");

const PROGRAM_ID = new anchor.web3.PublicKey("9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK");

async function test() {
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
  
  // Load main wallet
  const mainWalletData = JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json"));
  const mainWallet = Keypair.fromSecretKey(Uint8Array.from(mainWalletData));
  
  // Create fresh test wallets
  const creator = Keypair.generate();
  const claimer = Keypair.generate();
  
  console.log("🔑 Test wallets:");
  console.log(`  Creator: ${creator.publicKey.toString()}`);
  console.log(`  Claimer: ${claimer.publicKey.toString()}`);
  
  // Fund from main wallet
  console.log("\n💰 Funding test wallets...");
  const fundTx = new Transaction()
    .add(
      SystemProgram.transfer({
        fromPubkey: mainWallet.publicKey,
        toPubkey: creator.publicKey,
        lamports: 1.5 * LAMPORTS_PER_SOL,
      })
    )
    .add(
      SystemProgram.transfer({
        fromPubkey: mainWallet.publicKey,
        toPubkey: claimer.publicKey,
        lamports: 0.5 * LAMPORTS_PER_SOL,
      })
    );
  
  const fundSig = await connection.sendTransaction(fundTx, [mainWallet]);
  await connection.confirmTransaction(fundSig);
  console.log("✅ Test wallets funded");
  
  // Load IDL and create program
  const IDL = JSON.parse(fs.readFileSync("./target/idl/agentbounty.json", "utf8"));
  const wallet = new anchor.Wallet(creator);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new anchor.Program(IDL, PROGRAM_ID, provider);
  
  // Get PDAs
  const [protocolPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    PROGRAM_ID
  );
  
  const bountyId = "test-" + Date.now();
  const [bountyPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("bounty"), Buffer.from(bountyId)],
    PROGRAM_ID
  );
  
  console.log(`\n🎯 Bounty ID: ${bountyId}`);
  console.log(`   Bounty PDA: ${bountyPda.toString()}`);
  
  // Step 1: Create bounty
  console.log("\n📝 Creating bounty...");
  const createTx = await program.methods
    .createBounty(
      bountyId,
      "Test bounty for approve_work verification",
      new anchor.BN(0.5 * LAMPORTS_PER_SOL)
    )
    .accounts({
      creator: creator.publicKey,
      bounty: bountyPda,
      protocol: protocolPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([creator])
    .rpc();
  
  console.log(`✅ Create: ${createTx}`);
  await new Promise(r => setTimeout(r, 2000));
  
  // Step 2: Claim bounty
  console.log("\n🙋 Claiming bounty...");
  const claimTx = await program.methods
    .claimBounty()
    .accounts({
      claimer: claimer.publicKey,
      bounty: bountyPda,
    })
    .signers([claimer])
    .rpc();
  
  console.log(`✅ Claim: ${claimTx}`);
  await new Promise(r => setTimeout(r, 2000));
  
  // Step 3: Submit work
  console.log("\n📤 Submitting work...");
  const submitTx = await program.methods
    .submitWork("https://github.com/Boof-Pack/agentbounty/commit/final-test")
    .accounts({
      claimer: claimer.publicKey,
      bounty: bountyPda,
    })
    .signers([claimer])
    .rpc();
  
  console.log(`✅ Submit: ${submitTx}`);
  await new Promise(r => setTimeout(r, 2000));
  
  // Step 4: Approve work - THE 8TH SIGNATURE!
  console.log("\n✨ Approving work (8th signature)...");
  const approveTx = await program.methods
    .approveWork()
    .accounts({
      creator: creator.publicKey,
      claimer: claimer.publicKey,
      bounty: bountyPda,
      protocol: protocolPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([creator])
    .rpc();
  
  console.log(`\n🎉 SUCCESS! 8/8 FUNCTIONS VERIFIED!`);
  console.log(`\n8th Signature: ${approveTx}`);
  console.log(`Explorer: https://explorer.solana.com/tx/${approveTx}?cluster=devnet`);
  
  return approveTx;
}

test().catch(err => {
  console.error("\n❌ Error:", err);
  if (err.logs) {
    console.error("\nProgram logs:");
    err.logs.forEach(log => console.error(log));
  }
  process.exit(1);
});
