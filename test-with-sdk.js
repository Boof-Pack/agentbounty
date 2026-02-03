/**
 * Test with Anchor SDK (proper signing)
 */
const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const fs = require("fs");

async function test() {
  console.log("🧪 Testing with Anchor SDK\n");

  // Setup
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const programId = new PublicKey("9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK");
  
  // Load wallets
  const posterSecret = JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json"));
  const claimerSecret = JSON.parse(fs.readFileSync("/root/.openclaw/workspace/wallet-claimer.json"));
  
  const posterKeypair = Keypair.fromSecretKey(new Uint8Array(posterSecret));
  const claimerKeypair = Keypair.fromSecretKey(new Uint8Array(claimerSecret));
  
  console.log("Poster:", posterKeypair.publicKey.toBase58());
  console.log("Claimer:", claimerKeypair.publicKey.toBase58());

  // Load IDL and create program
  const idl = JSON.parse(fs.readFileSync("/root/.openclaw/workspace/agentbounty/target/idl/agentbounty.json"));
  const wallet = new anchor.Wallet(posterKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new anchor.Program(idl, provider);

  // Derive PDAs
  const [protocolPda] = PublicKey.findProgramAddressSync([Buffer.from("protocol")], programId);
  const [feeVaultPda] = PublicKey.findProgramAddressSync([Buffer.from("fee_vault")], programId);
  
  const protocolAccount = await program.account.protocol.fetch(protocolPda);
  const bountyId = protocolAccount.totalBounties;
  
  const [bountyPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bounty"), Buffer.from(bountyId.toArray("le", 8))],
    programId
  );

  console.log("\nCreating bounty #" + bountyId);
  console.log("Bounty PDA:", bountyPda.toBase58());

  // 1. CREATE
  console.log("\n1️⃣  Creating...");
  const tx1 = await program.methods
    .createBounty(
      "SDK Test",
      "Simple pattern test",
      new anchor.BN(0.15 * LAMPORTS_PER_SOL),
      new anchor.BN(Math.floor(Date.now() / 1000) + 7200)
    )
    .accounts({
      protocol: protocolPda,
      bounty: bountyPda,
      poster: posterKeypair.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([posterKeypair])
    .rpc();
  console.log("✅ Created:", tx1);

  // Check balance
  const bountyBalance = await connection.getBalance(bountyPda);
  console.log("   Bounty balance:", (bountyBalance / LAMPORTS_PER_SOL).toFixed(4), "SOL");

  // 2. CLAIM
  console.log("\n2️⃣  Claiming...");
  const claimerProvider = new anchor.AnchorProvider(connection, new anchor.Wallet(claimerKeypair), { commitment: "confirmed" });
  const claimerProgram = new anchor.Program(idl, claimerProvider);

  const tx2 = await claimerProgram.methods
    .claimBounty()
    .accounts({
      bounty: bountyPda,
      claimer: claimerKeypair.publicKey,
    })
    .rpc();
  console.log("✅ Claimed:", tx2);

  // 3. SUBMIT
  console.log("\n3️⃣  Submitting...");
  const tx3 = await claimerProgram.methods
    .submitWork("https://github.com/agent-one-x/test")
    .accounts({
      bounty: bountyPda,
      claimer: claimerKeypair.publicKey,
    })
    .rpc();
  console.log("✅ Submitted:", tx3);

  // 4. APPROVE
  console.log("\n4️⃣  Approving...");
  const claimerBalanceBefore = await connection.getBalance(claimerKeypair.publicKey);
  
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
  
  console.log("✅ APPROVED:", tx4);
  
  const claimerBalanceAfter = await connection.getBalance(claimerKeypair.publicKey);
  const earned = (claimerBalanceAfter - claimerBalanceBefore) / LAMPORTS_PER_SOL;
  
  console.log("\n🎉 SUCCESS! All 4 steps completed!");
  console.log("Claimer earned:", earned.toFixed(4), "SOL");
  console.log("\n📊 Transaction #8:", tx4);
  console.log("Explorer: https://explorer.solana.com/tx/" + tx4 + "?cluster=devnet");
  console.log("\n✅ 8/8 SIGNATURES COMPLETE!\n");
  
  // Save
  fs.writeFileSync("/root/.openclaw/workspace/agentbounty/SIGNATURE_8.txt", tx4);
  
  return tx4;
}

test().then(() => process.exit(0)).catch(err => {
  console.error("\n❌ Error:", err.message || err);
  if (err.logs) {
    console.log("\nLogs:");
    err.logs.forEach(log => console.log(log));
  }
  process.exit(1);
});
