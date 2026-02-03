const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey } = require("@solana/web3.js");

const PROGRAM_ID = new PublicKey("9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK");
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

async function checkBounties() {
  const IDL = require("./target/idl/agentbounty.json");
  const provider = anchor.AnchorProvider.local("https://api.devnet.solana.com");
  const program = new anchor.Program(IDL, PROGRAM_ID, provider);

  // Get all bounty accounts
  const bounties = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      { dataSize: 265 } // Bounty account size
    ]
  });

  console.log(`Found ${bounties.length} bounty accounts\n`);

  for (const { pubkey, account } of bounties) {
    try {
      const bountyData = await program.account.bounty.fetch(pubkey);
      console.log(`Bounty: ${pubkey.toString()}`);
      console.log(`  ID: ${bountyData.id}`);
      console.log(`  Creator: ${bountyData.creator.toString()}`);
      console.log(`  Status: ${Object.keys(bountyData.status)[0]}`);
      console.log(`  Amount: ${bountyData.amount.toNumber() / 1e9} SOL`);
      if (bountyData.claimer) {
        console.log(`  Claimer: ${bountyData.claimer.toString()}`);
      }
      console.log();
    } catch (e) {
      console.log(`Failed to parse ${pubkey.toString()}: ${e.message}`);
    }
  }
}

checkBounties().catch(console.error);
