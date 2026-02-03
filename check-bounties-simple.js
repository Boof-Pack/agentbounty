const { Connection, PublicKey } = require("@solana/web3.js");

const PROGRAM_ID = new PublicKey("9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK");
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

async function checkBounties() {
  const accounts = await connection.getProgramAccounts(PROGRAM_ID);
  
  console.log(`Found ${accounts.length} program accounts\n`);
  
  for (const { pubkey, account } of accounts) {
    console.log(`Account: ${pubkey.toString()}`);
    console.log(`  Size: ${account.data.length} bytes`);
    console.log(`  Lamports: ${account.lamports / 1e9} SOL`);
    console.log();
  }
}

checkBounties().catch(console.error);
