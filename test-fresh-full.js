/**
 * FRESH TEST - New wallets, complete flow, get 8th signature
 */
const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const fs = require("fs");

async function main() {
  console.log("🎯 FRESH FULL TEST - Getting 8/8 signatures\n");

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const programId = new PublicKey("9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK");
  
  // Load poster
  const posterSecret = JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json"));
  const poster = Keypair.fromSecretKey(new Uint8Array(posterSecret));
  
  // Create FRESH claimer
  const claimer = Keypair.generate();
  console.log("Poster: ", poster.publicKey.toBase58());
  console.log("Claimer:", claimer.publicKey.toBase58());
  
  // Fund claimer
  console.log("\nFunding claimer...");
  try {
    const airdropSig = await connection.requestAirdrop(claimer.publicKey, 1 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSig);
    console.log("✅ Funded");
  } catch (e) {
    console.log("⚠️ Airdrop failed (devnet rate limit), continuing...");
  }

  // Setup program
  const idl = JSON.parse(fs.readFileSync("/root/.openclaw/workspace/agentbounty/target/idl/agentbounty.json"));
  const wallet = new anchor.Wallet(poster);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new anchor.Program(idl, provider);

  // PDAs
  const [protocolPda] = PublicKey.findProgramAddressSync([Buffer.from("protocol")], programId);
  const [feeVaultPda] = PublicKey.findProgramAddressSync([Buffer.from("fee_vault")], programId);
  
  const protocolAccount = await program.account.protocol.fetch(protocolPda);
  const bountyId = protocolAccount.totalBounties;
  
  const [bountyPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bounty"), Buffer.from(bountyId.toArray("le", 8))],
    programId
  );

  console.log("\n📦 Bounty #" + bountyId);
  console.log("PDA:", bountyPda.toBase58());

  const signatures = {};
  const reward = 0.15;

  // 1. CREATE
  console.log("\n1️⃣ Creating bounty...");
  try {
    signatures.create = await program.methods
      .createBounty(
        "Fresh Test Flow",
        "Complete 4-step flow test",
        new anchor.BN(reward * LAMPORTS_PER_SOL),
        new anchor.BN(Math.floor(Date.now() / 1000) + 7200)
      )
      .accounts({
        protocol: protocolPda,
        bounty: bountyPda,
        poster: poster.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("✅", signatures.create);
  } catch (e) {
    console.error("❌ CREATE FAILED:", e.message);
    throw e;
  }

  // Wait a bit
  await new Promise(r => setTimeout(r, 2000));

  // 2. CLAIM
  console.log("\n2️⃣ Claiming bounty...");
  const claimerProvider = new anchor.AnchorProvider(connection, new anchor.Wallet(claimer), { commitment: "confirmed" });
  const claimerProgram = new anchor.Program(idl, claimerProvider);

  try {
    signatures.claim = await claimerProgram.methods
      .claimBounty()
      .accounts({
        bounty: bountyPda,
        claimer: claimer.publicKey,
      })
      .rpc();
    console.log("✅", signatures.claim);
  } catch (e) {
    console.error("❌ CLAIM FAILED:", e.message);
    throw e;
  }

  await new Promise(r => setTimeout(r, 2000));

  // 3. SUBMIT
  console.log("\n3️⃣ Submitting work...");
  try {
    signatures.submit = await claimerProgram.methods
      .submitWork("https://github.com/agent-one-x/fresh-test")
      .accounts({
        bounty: bountyPda,
        claimer: claimer.publicKey,
      })
      .rpc();
    console.log("✅", signatures.submit);
  } catch (e) {
    console.error("❌ SUBMIT FAILED:", e.message);
    throw e;
  }

  await new Promise(r => setTimeout(r, 2000));

  // 4. APPROVE (THE BIG TEST)
  console.log("\n4️⃣ Approving work...");
  const claimerBalanceBefore = await connection.getBalance(claimer.publicKey);
  
  try {
    signatures.approve = await program.methods
      .approveWork()
      .accounts({
        protocol: protocolPda,
        bounty: bountyPda,
        feeVault: feeVaultPda,
        claimer: claimer.publicKey,
        poster: poster.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log("✅", signatures.approve);
    
    const claimerBalanceAfter = await connection.getBalance(claimer.publicKey);
    const earned = (claimerBalanceAfter - claimerBalanceBefore) / LAMPORTS_PER_SOL;
    
    console.log("\n🎉🎉🎉 SUCCESS! 8/8 COMPLETE! 🎉🎉🎉");
    console.log("\nClaimer earned:", earned.toFixed(4), "SOL");
    console.log("\n📊 ALL SIGNATURES:");
    console.log("1. Create: ", signatures.create);
    console.log("2. Claim:  ", signatures.claim);
    console.log("3. Submit: ", signatures.submit);
    console.log("4. Approve:", signatures.approve);
    console.log("\n🔗 Approve Explorer:", `https://explorer.solana.com/tx/${signatures.approve}?cluster=devnet`);
    
    // Save for documentation
    fs.writeFileSync("/root/.openclaw/workspace/agentbounty/SIGNATURE_8.txt", signatures.approve);
    fs.writeFileSync("/root/.openclaw/workspace/agentbounty/ALL_SIGNATURES.json", JSON.stringify(signatures, null, 2));
    
    console.log("\n✅ Saved to SIGNATURE_8.txt and ALL_SIGNATURES.json\n");
    
    return signatures;
  } catch (e) {
    console.error("\n❌ APPROVE FAILED:", e.message);
    if (e.logs) {
      console.log("\n📋 Transaction logs:");
      e.logs.forEach(log => console.log("  ", log));
    }
    throw e;
  }
}

main().then(() => {
  console.log("🏆 DONE - Ready to deploy!\n");
  process.exit(0);
}).catch(err => {
  console.error("\n💥 Test failed\n");
  process.exit(1);
});
