#!/bin/bash
# AgentBounty Devnet Deployment Script
# Run this to deploy immediately

set -e

echo "🚀 AgentBounty Devnet Deployment"
echo "================================"

# Install Solana CLI if needed
if ! command -v solana &> /dev/null; then
    echo "📦 Installing Solana CLI..."
    sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
fi

# Install Anchor if needed
if ! command -v anchor &> /dev/null; then
    echo "📦 Installing Anchor..."
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    avm install latest
    avm use latest
fi

# Configure Solana for devnet
echo "⚙️  Configuring Solana devnet..."
solana config set --url devnet

# Check/get devnet SOL
BALANCE=$(solana balance 2>/dev/null | awk '{print $1}')
if (( $(echo "$BALANCE < 5" | bc -l) )); then
    echo "💰 Requesting devnet SOL..."
    solana airdrop 5
fi

# Build program
echo "🔨 Building Anchor program..."
cd /root/.openclaw/workspace/agentbounty
anchor build

# Get program ID
PROGRAM_ID=$(solana address -k target/deploy/agentbounty-keypair.json)
echo "📝 Program ID: $PROGRAM_ID"

# Update program ID in files
echo "📝 Updating program IDs..."
sed -i "s/BountyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/$PROGRAM_ID/g" programs/agentbounty/src/lib.rs
sed -i "s/BountyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/$PROGRAM_ID/g" Anchor.toml
sed -i "s/BountyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/$PROGRAM_ID/g" sdk/src/index.ts
sed -i "s/BountyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/$PROGRAM_ID/g" api/server.js

# Rebuild with correct ID
echo "🔨 Rebuilding with correct program ID..."
anchor build

# Deploy
echo "🚀 Deploying to devnet..."
anchor deploy --provider.cluster devnet

# Verify
echo "✅ Verifying deployment..."
solana program show $PROGRAM_ID --url devnet

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo "Program ID: $PROGRAM_ID"
echo "Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo ""
echo "Next: Initialize protocol with:"
echo "cd sdk && npm install && npx ts-node scripts/initialize.ts"
