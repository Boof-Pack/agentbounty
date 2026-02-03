// AgentBounty Frontend - Direct Solana Integration
const PROGRAM_ID = '9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK';
const RPC_URL = 'https://api.devnet.solana.com';

// Fetch bounties directly from Solana
async function fetchBounties() {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getProgramAccounts',
      params: [
        PROGRAM_ID,
        {
          encoding: 'base64',
          filters: [{ dataSize: 1733 }]
        }
      ]
    })
  });
  
  const data = await response.json();
  return data.result || [];
}

function parseBounty(account) {
  try {
    const buffer = Buffer.from(account.account.data[0], 'base64');
    const id = buffer.readBigUInt64LE(8);
    return {
      pubkey: account.pubkey,
      id: id.toString(),
      lamports: account.account.lamports / 1e9
    };
  } catch (e) {
    return null;
  }
}

async function loadBounties() {
  const list = document.getElementById('bountyList');
  list.innerHTML = '<div class="loading">Loading bounties from Solana...</div>';
  
  try {
    const accounts = await fetchBounties();
    list.innerHTML = '';
    
    accounts.forEach(acc => {
      const bounty = parseBounty(acc);
      if (bounty) {
        const div = document.createElement('div');
        div.className = 'bounty';
        div.innerHTML = `
          <h3>Bounty #${bounty.id}</h3>
          <p>Reward: ${bounty.lamports.toFixed(4)} SOL</p>
          <p class="address">${bounty.pubkey}</p>
          <a href="https://explorer.solana.com/address/${bounty.pubkey}?cluster=devnet" target="_blank">
            View on Explorer →
          </a>
        `;
        list.appendChild(div);
      }
    });
    
    if (list.children.length === 0) {
      list.innerHTML = '<div class="empty">No bounties found</div>';
    }
  } catch (error) {
    list.innerHTML = `<div class="error">Error: ${error.message}</div>`;
  }
}

// Load on page load
window.addEventListener('DOMContentLoaded', loadBounties);
