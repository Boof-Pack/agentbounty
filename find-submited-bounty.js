const { Connection, PublicKey } = require('@solana/web3.js');

const PROGRAM_ID = new PublicKey('9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK');
const connection = new Connection('https://api.devnet.solana.com');

async function find() {
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ dataSize: 1733 }] // Bounty size from earlier check
  });
  
  console.log(`Found ${accounts.length} bounty accounts\n`);
  
  for (const { pubkey, account } of accounts) {
    // Try to parse status (very basic, at expected offset)
    // Bounty struct: discriminator(8) + id(8) + poster(32) + title(4+len) ...
    // Status enum is somewhere in there - let's just check if account has enough lamports for a bounty
    if (account.lamports > 0.05 * 1e9) {
      console.log(`Bounty: ${pubkey.toString()}`);
      console.log(`  Lamports: ${(account.lamports / 1e9).toFixed(4)} SOL`);
      console.log(`  Data size: ${account.data.length} bytes`);
      
      // Try to read some fields
      try {
        const id = account.data.readBigUInt64LE(8);
        console.log(`  ID: ${id}`);
      } catch (e) {}
      
      console.log();
    }
  }
}

find().catch(console.error);
