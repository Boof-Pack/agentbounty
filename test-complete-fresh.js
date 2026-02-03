const anchor = require("@coral-xyz/anchor");
const { Keypair, SystemProgram, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const fs = require("fs");

const PROGRAM_ID = new anchor.web3.PublicKey("9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK");

async function test() {
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
  
  // Create fresh wallets
  const creator = Keypair.generate();
  const claimer = Keypair.generate();
  
  console.log("🔑 Fresh wallets:");
  console.log(`  Creator: ${creator.publicKey.toString()}`);
  console.log(`  Claimer: ${claimer.publicKey.toString()}`);
  
  // Fund wallets
  console.log("\n💰 Requesting airdrops...");
  const creatorAirdrop = await connection.requestAirdrop(creator.publicKey, 2 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(creatorAirdrop);
  
  const claimerAirdrop = await connection.requestAirdrop(claimer.publicKey, 1 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(claimerAirdrop);
  
  console.log("✅ Wallets funded");
  
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
  
  const bountyId = Math.floor(Math.random() * 1000000);
  const [bountyPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("bounty"), Buffer.from(bountyId.toString())],
    PROGRAM_ID
  );
  
  console.log(`\n🎯 Bounty ID: ${bountyId}`);
  console.log(`   Bounty PDA: ${bountyPda.toString()}`);
  
  // Step 1: Create bounty
  console.log("\n📝 Creating bounty...");
  const createTx = await program.methods
    .createBounty(
      bountyId.toString(),
      "Test bounty for approve_work",
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
  
  console.log(`✅ Create signature: ${createTx}`);
  
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
  
  console.log(`✅ Claim signature: ${claimTx}`);
  
  // Step 3: Submit work
  console.log("\n📤 Submitting work...");
  const submitTx = await program.methods
    .submitWork("https://github.com/test/proof")
    .accounts({
      claimer: claimer.publicKey,
      bounty: bountyPda,
    })
    .signers([claimer])
    .rpc();
  
  console.log(`✅ Submit signature: ${submitTx}`);
  
  // Step 4: Approve work (THE 8TH SIGNATURE!)
  console.log("\n✨ Approving work...");
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
  
  console.log(`✅✅✅ APPROVE SIGNATURE: ${approveTx}`);
  console.log("\n🎉 8/8 COMPLETE! All bounty functions verified!");
  console.log(`\nExplorer: https://explorer.solana.com/tx/${approveTx}?cluster=devnet`);
}

test().catch(err => {
  console.error("❌ Error:", err.message);
  console.error(err);
  process.exit(1);
});
