const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const fs = require("fs");

async function testApprove() {
  console.log("🧪 Testing approve_work fix...\n");

  // Setup
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const programId = new PublicKey("9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK");
  
  // Load wallets
  const posterKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync("/root/.config/solana/id.json")))
  );
  
  // Create a new claimer keypair or load existing
  let claimerKeypair;
  const claimerPath = "/root/.openclaw/workspace/agentbounty/test-claimer-temp.json";
  if (fs.existsSync(claimerPath)) {
    claimerKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(claimerPath)))
    );
  } else {
    claimerKeypair = Keypair.generate();
    fs.writeFileSync(claimerPath, JSON.stringify(Array.from(claimerKeypair.secretKey)));
    console.log("Created new claimer wallet");
    
    // Fund claimer with 1 SOL
    console.log("Funding claimer with 1 SOL...");
    const fundTx = await connection.requestAirdrop(claimerKeypair.publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(fundTx);
    console.log("Claimer funded\n");
  }

  console.log("Poster:", posterKeypair.publicKey.toBase58());
  console.log("Claimer:", claimerKeypair.publicKey.toBase58());

  // Load IDL
  const idl = JSON.parse(fs.readFileSync("/root/.openclaw/workspace/agentbounty/target/idl/agentbounty.json"));
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(posterKeypair),
    { commitment: "confirmed" }
  );
  const program = new anchor.Program(idl, provider);

  // Derive PDAs
  const [protocolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    programId
  );

  // Get current bounty count
  const protocolAccount = await program.account.protocol.fetch(protocolPda);
  const bountyId = protocolAccount.totalBounties;

  const [bountyPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bounty"), Buffer.from(bountyId.toArray("le", 8))],
    programId
  );

  const [feeVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("fee_vault")],
    programId
  );

  console.log("\n📦 Creating bounty #" + bountyId + "...");
  
  // Step 1: Create bounty
  provider.wallet = new anchor.Wallet(posterKeypair);
  const createTx = await program.methods
    .createBounty(
      "Test Approve Fix",
      "Testing the approve_work function with protocol mut fix",
      new anchor.BN(0.2 * LAMPORTS_PER_SOL),
      new anchor.BN(Math.floor(Date.now() / 1000) + 3600)
    )
    .accounts({
      protocol: protocolPda,
      bounty: bountyPda,
      poster: posterKeypair.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("✅ Created:", createTx);

  // Step 2: Claim bounty
  console.log("\n🤝 Claiming bounty...");
  provider.wallet = new anchor.Wallet(claimerKeypair);
  const claimTx = await program.methods
    .claimBounty()
    .accounts({
      bounty: bountyPda,
      claimer: claimerKeypair.publicKey,
    })
    .rpc();

  console.log("✅ Claimed:", claimTx);

  // Step 3: Submit work
  console.log("\n📤 Submitting work...");
  const submitTx = await program.methods
    .submitWork("https://github.com/test/approve-fix")
    .accounts({
      bounty: bountyPda,
      claimer: claimerKeypair.publicKey,
    })
    .rpc();

  console.log("✅ Submitted:", submitTx);

  // Step 4: Approve work (THIS IS THE TEST)
  console.log("\n✨ Approving work (THE FIX TEST)...");
  try {
    provider.wallet = new anchor.Wallet(posterKeypair);
    const approveTx = await program.methods
      .approveWork()
      .accounts({
        protocol: protocolPda,
        bounty: bountyPda,
        feeVault: feeVaultPda,
        claimer: claimerKeypair.publicKey,
        poster: posterKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ APPROVED:", approveTx);
    console.log("\n🎉 SUCCESS! The approve_work function is FIXED!");
    console.log("\n🔗 Transaction signature #8:", approveTx);
    
    return approveTx;
  } catch (error) {
    console.error("\n❌ FAILED:", error.message);
    if (error.logs) {
      console.log("\nLogs:");
      error.logs.forEach(log => console.log(log));
    }
    throw error;
  }
}

testApprove().then(sig => {
  console.log("\n📊 8/8 TRANSACTION SIGNATURES COMPLETE!");
  process.exit(0);
}).catch(err => {
  console.error("\n💥 Test failed:", err);
  process.exit(1);
});
