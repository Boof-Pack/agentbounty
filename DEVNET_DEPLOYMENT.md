# Devnet Deployment Guide

**Status**: Ready to deploy (Anchor CLI required)  
**Program**: AgentBounty v0.1.0  
**Target**: Solana Devnet

---

## Prerequisites

- Solana CLI installed and configured
- Anchor CLI v0.30.1+
- Rust toolchain 1.70+
- Devnet SOL for deployment (~5 SOL)

## Option 1: Local Anchor Build & Deploy

### Step 1: Install Anchor (if not installed)

```bash
# Install AVM (Anchor Version Manager)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# Install latest Anchor
avm install latest
avm use latest

# Verify installation
anchor --version
```

### Step 2: Get Devnet SOL

```bash
# Create/use devnet wallet
solana-keygen new --outfile ~/.config/solana/id.json

# Airdrop devnet SOL
solana airdrop 5 --url devnet

# Verify balance
solana balance --url devnet
```

### Step 3: Build Program

```bash
cd /root/.openclaw/workspace/agentbounty

# Build Anchor program
anchor build

# Get program ID
solana address -k target/deploy/agentbounty-keypair.json
```

### Step 4: Update Program ID

Replace `BountyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` with actual program ID in:

```bash
# Update these files:
vi programs/agentbounty/src/lib.rs     # Line 3: declare_id!
vi Anchor.toml                          # Line 6: agentbounty = "..."
vi sdk/src/index.ts                     # Line 8: export const PROGRAM_ID
vi api/server.js                        # Line 11: const PROGRAM_ID
```

### Step 5: Rebuild & Deploy

```bash
# Rebuild with correct program ID
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Verify deployment
solana program show <PROGRAM_ID> --url devnet
```

### Step 6: Initialize Protocol

```bash
# Run initialization script
cd sdk
npm install
npx ts-node scripts/initialize.ts
```

---

## Option 2: Solana Playground (Browser-based)

### Step 1: Open Solana Playground

Visit: https://beta.solpg.io

### Step 2: Create Project

1. Click "New Project" → "Anchor"
2. Project name: "agentbounty"
3. Delete default code

### Step 3: Upload Program Code

Copy contents of `programs/agentbounty/src/lib.rs` into the editor.

Also upload `programs/agentbounty/Cargo.toml`.

### Step 4: Build in Playground

1. Click "Build" (hammer icon)
2. Wait for build to complete
3. Program ID will be generated automatically

### Step 5: Deploy from Playground

1. Click "Deploy" (rocket icon)
2. Confirm transaction in wallet
3. Copy deployed program address

### Step 6: Update Local Files

Update program ID in local files (see Option 1, Step 4).

---

## Post-Deployment Steps

### 1. Update Repository

```bash
git add -A
git commit -m "Update program ID after devnet deployment"
git push
```

### 2. Update Forum Post

Edit forum post #214 with:
- Devnet program ID
- Explorer link: `https://explorer.solana.com/address/<PROGRAM_ID>?cluster=devnet`
- Live API endpoint (when API deployed)

### 3. Update Project

```bash
curl -X PUT https://agents.colosseum.com/api/my-project \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "technicalDemoLink": "https://explorer.solana.com/address/<PROGRAM_ID>?cluster=devnet",
    "additionalInfo": "Deployed to Solana devnet. Program ID: <PROGRAM_ID>"
  }'
```

### 4. Deploy API Server

Deploy `api/server.js` to:
- **Railway**: `railway up`
- **Vercel**: `vercel deploy`
- **Render**: Connect GitHub repo

### 5. Host Frontend

Deploy `app/index.html` to:
- **Vercel**: Drag and drop
- **Netlify**: Connect GitHub
- **GitHub Pages**: Enable in repo settings

---

## Testing Checklist

After deployment, test all flows:

- [ ] Create bounty (0.5 SOL)
- [ ] Claim bounty (different wallet)
- [ ] Submit work proof
- [ ] Approve work (original wallet)
- [ ] Verify payment received
- [ ] Check protocol stats
- [ ] Cancel unclaimed bounty
- [ ] Verify escrow refund

---

## Troubleshooting

### Build Fails: "cargo not found"

Install Rust:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### Deploy Fails: "Insufficient funds"

Get more devnet SOL:
```bash
solana airdrop 5 --url devnet
# Or use devnet faucet: https://faucet.solana.com
```

### Program Already Deployed

If program ID conflicts, either:
1. Use existing program ID (update in code)
2. Generate new keypair: `solana-keygen new -o new-program-keypair.json`

### Transaction Fails: "Blockhash not found"

Retry with fresh blockhash:
```bash
anchor deploy --provider.cluster devnet --skip-build
```

---

## Expected Costs (Devnet)

- **Program deployment**: ~4.5 SOL (one-time)
- **Protocol initialization**: ~0.03 SOL (one-time)
- **Bounty creation**: ~0.02 SOL + reward amount
- **All other operations**: <0.001 SOL

Devnet SOL is free via faucet/airdrop.

---

## Next: Mainnet Deployment

After devnet testing proves stability:

1. Audit smart contract (optional but recommended)
2. Switch `cluster` in Anchor.toml to `mainnet`
3. Deploy with mainnet wallet (real SOL required)
4. Update all program IDs in code
5. Announce mainnet launch

**Mainnet cost estimate**: ~$100-200 USD in SOL for deployment.

---

**Current Status**: Code ready, awaiting Anchor CLI installation or Solana Playground deployment.

**ETA**: 1-2 hours once prerequisites installed.
