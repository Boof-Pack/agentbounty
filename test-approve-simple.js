// Simple test: Create, claim, submit, and approve a bounty using Anchor SDK
const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const fs = require("fs");

async function test() {
  console.log("🧪 Testing approve_work fix\n");

  // Setup
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const programId = new PublicKey("9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK");
  
  // Load poster wallet
  const posterSecret = JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json"));
  const posterKeypair = Keypair.fromSecretKey(new Uint8Array(posterSecret));
  
  // Create claimer wallet
  const claimerKeypair = Keypair.generate();
  console.log("Poster:", posterKeypair.publicKey.toBase58());
  console.log("Claimer:", claimerKeypair.publicKey.toBase58());
  
  // Fund claimer
  console.log("\nFunding claimer...");
  try {
    const airdropSig = await connection.requestAirdrop(claimerKeypair.publicKey, 1 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSig);
    console.log("Funded\n");
  } catch (e) {
    console.error("Airdrop failed (devnet may be rate limited), continuing anyway...");
    console.log("You may need to fund the claimer manually if needed\n");
  }

  // Load IDL and create program
  const idl = JSON.parse(fs.readFileSync("/root/.openclaw/workspace/agentbounty/target/idl/agentbounty.json"));
  const wallet = new anchor.Wallet(posterKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);
  const program = new anchor.Program(idl, provider);

  // Derive PDAs
  const [protocolPda] = PublicKey.findProgramAddressSync([Buffer.from("protocol")], programId);
  const protocolAccount = await program.account.protocol.fetch(protocolPda);
  const bountyId = protocolAccount.totalBounties;
  
  const [bountyPda, bountyBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("bounty"), Buffer.from(bountyId.toArray("le", 8))],
    programId
  );
  
  const [feeVaultPda] = PublicKey.findProgramAddressSync([Buffer.from("fee_vault")], programId);

  console.log("Creating bounty #" + bountyId);

  // 1. CREATE
  try {
    const tx1 = await program.methods
      .createBounty(
        "SDK Test",
        "Testing SDK-based flow",
        new anchor.BN(0.15 * LAMPORTS_PER_SOL),
        new anchor.BN(Math.floor(Date.now() / 1000) + 7200)
      )
      .accounts({
        protocol: protocolPda,
        bounty: bountyPda,
        poster: posterKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("✅ 1. Created:", tx1);
  } catch (e) {
    console.error("❌ Create failed:", e.message);
    throw e;
  }

  // 2. CLAIM (switch to claimer)
  const claimerWallet = new anchor.Wallet(claimerKeypair);
  const claimerProvider = new anchor.AnchorProvider(connection, claimerWallet, { commitment: "confirmed" });
  const claimerProgram = new anchor.Program(idl, claimerProvider);

  try {
    const tx2 = await claimerProgram.methods
      .claimBounty()
      .accounts({
        bounty: bountyPda,
        claimer: claimerKeypair.publicKey,
      })
      .rpc();
    console.log("✅ 2. Claimed:", tx2);
  } catch (e) {
    console.error("❌ Claim failed:", e.message);
    throw e;
  }

  // 3. SUBMIT
  try {
    const tx3 = await claimerProgram.methods
      .submitWork("https://github.com/test")
      .accounts({
        bounty: bountyPda,
        claimer: claimerKeypair.publicKey,
      })
      .rpc();
    console.log("✅ 3. Submitted:", tx3);
  } catch (e) {
    console.error("❌ Submit failed:", e.message);
    throw e;
  }

  // 4. APPROVE (back to poster) - THE FIX TEST
  const claimerBalanceBefore = await connection.getBalance(claimerKeypair.publicKey);
  
  try {
    const tx4 = await program.methods
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
    
    console.log("✅ 4. APPROVED:", tx4);
    
    const claimerBalanceAfter = await connection.getBalance(claimerKeypair.publicKey);
    const earned = (claimerBalanceAfter - claimerBalanceBefore) / LAMPORTS_PER_SOL;
    
    console.log("\n🎉 SUCCESS! approve_work is FIXED!");
    console.log("Claimer earned:", earned.toFixed(4), "SOL");
    console.log("\n📊 Transaction #8:", tx4);
    console.log("Explorer: https://explorer.solana.com/tx/" + tx4 + "?cluster=devnet");
    console.log("\n✅ 8/8 TRANSACTION SIGNATURES COMPLETE!\n");
    
    return tx4;
  } catch (e) {
    console.error("❌ Approve failed:", e.message);
    if (e.logs) {
      console.log("\nLogs:");
      e.logs.forEach(log => console.log(log));
    }
    throw e;
  }
}

test().then(() => process.exit(0)).catch(err => {
  console.error("\n💥 Test failed:", err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
