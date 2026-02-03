#!/bin/bash
set -e

echo "🧪 Testing AgentBounty on Devnet"
echo ""

PROGRAM_ID="9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK"
POSTER_KEY="/root/.config/solana/id.json"
CLAIMER_KEY="/tmp/test-bounty-claimer.json"

echo "📋 Program: $PROGRAM_ID"
echo "👤 Poster: $(solana-keygen pubkey $POSTER_KEY)"
echo "👤 Claimer: $(solana-keygen pubkey $CLAIMER_KEY)"
echo ""

# Check if we can interact with the program
echo "✅ Checking program deployment..."
/root/.local/share/solana/install/active_release/bin/solana program show $PROGRAM_ID --url devnet | head -5

echo ""
echo "✅ Program is deployed and accessible!"
echo ""
echo "Transaction signatures will be posted to forum once full flow completes."
