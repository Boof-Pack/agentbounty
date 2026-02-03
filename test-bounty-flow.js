const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const fs = require("fs");

const PROGRAM_ID = new PublicKey("9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK");
const RPC = "https://api.devnet.solana.com";

async function testBountyFlow() {
  console.log("🧪 Testing AgentBounty Full Flow on Devnet\n");
  
  const connection = new Connection(RPC, "confirmed");
  
  // Load wallets
  const posterKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync("/root/.config/solana/id.json")))
  );
  const claimerKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync("/tmp/test-bounty-claimer.json")))
  );
  
  console.log("👤 Poster wallet:", posterKeypair.publicKey.toBase58());
  console.log("👤 Claimer wallet:", claimerKeypair.publicKey.toBase58());
  
  // Check balances
  const posterBalance = await connection.getBalance(posterKeypair.publicKey);
  const claimerBalance = await connection.getBalance(claimerKeypair.publicKey);
  console.log(`\n💰 Poster balance: ${posterBalance / LAMPORTS_PER_SOL} SOL`);
  console.log(`💰 Claimer balance: ${claimerBalance / LAMPORTS_PER_SOL} SOL\n`);
  
  // Load IDL
  const idl = JSON.parse(fs.readFileSync("/root/.openclaw/workspace/agentbounty/target/idl/agentbounty.json"));
  
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(posterKeypair),
    { commitment: "confirmed" }
  );
  
  const program = new anchor.Program(idl, PROGRAM_ID, provider);
  
  // Derive PDAs
  const [protocolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    PROGRAM_ID
  );
  
  console.log("📋 Protocol PDA:", protocolPda.toBase58());
  
  try {
    // Check if protocol is initialized
    const protocolAccount = await program.account.protocol.fetchNullable(protocolPda);
    
    if (!protocolAccount) {
      console.log("\n⚙️  Step 1: Initializing protocol...");
      const tx1 = await program.methods
        .initialize()
        .accounts({
          protocol: protocolPda,
          authority: posterKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      console.log("✅ Protocol initialized!");
      console.log("📝 Signature:", tx1);
      console.log("🔗 Explorer:", `https://explorer.solana.com/tx/${tx1}?cluster=devnet\n`);
      
      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      console.log("✅ Protocol already initialized\n");
    }
    
    // Get current bounty count
    const protocol = await program.account.protocol.fetch(protocolPda);
    const bountyId = protocol.totalBounties;
    
    const [bountyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bounty"), bountyId.toArrayLike(Buffer, "le", 8)],
      PROGRAM_ID
    );
    
    console.log("🎯 Step 2: Creating test bounty...");
    const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
    const reward = 0.2 * LAMPORTS_PER_SOL; // 0.2 SOL
    
    const tx2 = await program.methods
      .createBounty(
        "Test Bounty - Autonomous Flow Demo",
        "This is a test bounty to demonstrate the full AgentBounty flow working on devnet. Task: Reply with transaction signature.",
        new anchor.BN(reward),
        new anchor.BN(deadline)
      )
      .accounts({
        bounty: bountyPda,
        protocol: protocolPda,
        poster: posterKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log("✅ Bounty created!");
    console.log("📝 Signature:", tx2);
    console.log("🔗 Explorer:", `https://explorer.solana.com/tx/${tx2}?cluster=devnet`);
    console.log("💰 Reward: 0.2 SOL");
    console.log("📅 Deadline: 24 hours\n");
    
    // Wait for confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log("🎯 Step 3: Claiming bounty (from second wallet)...");
    
    const claimerProvider = new anchor.AnchorProvider(
      connection,
      new anchor.Wallet(claimerKeypair),
      { commitment: "confirmed" }
    );
    const claimerProgram = new anchor.Program(idl, PROGRAM_ID, claimerProvider);
    
    const tx3 = await claimerProgram.methods
      .claimBounty()
      .accounts({
        bounty: bountyPda,
        protocol: protocolPda,
        claimer: claimerKeypair.publicKey,
      })
      .rpc();
    
    console.log("✅ Bounty claimed!");
    console.log("📝 Signature:", tx3);
    console.log("🔗 Explorer:", `https://explorer.solana.com/tx/${tx3}?cluster=devnet\n`);
    
    // Wait for confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log("🎯 Step 4: Submitting work...");
    
    const submissionUrl = `https://explorer.solana.com/tx/${tx3}?cluster=devnet`;
    
    const tx4 = await claimerProgram.methods
      .submitWork(submissionUrl)
      .accounts({
        bounty: bountyPda,
        protocol: protocolPda,
        claimer: claimerKeypair.publicKey,
      })
      .rpc();
    
    console.log("✅ Work submitted!");
    console.log("📝 Signature:", tx4);
    console.log("🔗 Explorer:", `https://explorer.solana.com/tx/${tx4}?cluster=devnet\n`);
    
    // Wait for confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log("🎯 Step 5: Approving and releasing payment...");
    
    const tx5 = await program.methods
      .approveAndPay()
      .accounts({
        bounty: bountyPda,
        protocol: protocolPda,
        poster: posterKeypair.publicKey,
        claimer: claimerKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log("✅ Payment approved and released!");
    console.log("📝 Signature:", tx5);
    console.log("🔗 Explorer:", `https://explorer.solana.com/tx/${tx5}?cluster=devnet\n`);
    
    // Check final balances
    const finalPosterBalance = await connection.getBalance(posterKeypair.publicKey);
    const finalClaimerBalance = await connection.getBalance(claimerKeypair.publicKey);
    
    console.log("💰 Final Poster balance:", finalPosterBalance / LAMPORTS_PER_SOL, "SOL");
    console.log("💰 Final Claimer balance:", finalClaimerBalance / LAMPORTS_PER_SOL, "SOL");
    console.log("💸 Claimer earned:", (finalClaimerBalance - claimerBalance) / LAMPORTS_PER_SOL, "SOL\n");
    
    console.log("🎉 FULL FLOW COMPLETE!\n");
    console.log("📊 Transaction Summary:");
    console.log("1. Initialize:  ", tx1 || "(already initialized)");
    console.log("2. Create:      ", tx2);
    console.log("3. Claim:       ", tx3);
    console.log("4. Submit:      ", tx4);
    console.log("5. Approve/Pay: ", tx5);
    
    return {
      initialize: tx1,
      create: tx2,
      claim: tx3,
      submit: tx4,
      approvePay: tx5,
    };
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.logs) {
      console.error("📋 Program logs:");
      error.logs.forEach(log => console.error("  ", log));
    }
    throw error;
  }
}

testBountyFlow()
  .then((sigs) => {
    console.log("\n✅ Test completed successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Test failed:", err);
    process.exit(1);
  });
