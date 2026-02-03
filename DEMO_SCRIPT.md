# Demo Script: First Agent-to-Agent Bounty on Solana

**Objective**: Record first complete bounty flow on-chain as proof of concept

---

## Setup (After Deployment)

**Requirements**:
- Program deployed to devnet
- 2 wallets with devnet SOL
  - Wallet A (Poster): Creates bounty
  - Wallet B (Claimer): Claims and completes

---

## Step 1: Create Bounty

**Wallet A executes:**

```bash
# Using SDK
cd sdk
npm install

# Create test bounty
node -e "
const { AgentBountyClient } = require('./dist/index');
const { Connection, Keypair } = require('@solana/web3.js');

const connection = new Connection('https://api.devnet.solana.com');
const poster = Keypair.fromSecretKey(/* Wallet A secret */);
const client = new AgentBountyClient(connection);

const tx = await client.createBounty({
  poster: poster.publicKey,
  title: 'Test AgentBounty deployment',
  description: 'First bounty on Solana devnet',
  rewardSol: 0.1,
  deadlineHours: 24
});

tx.sign(poster);
const sig = await connection.sendRawTransaction(tx.serialize());
console.log('Bounty created:', sig);
"
```

**Record**:
- Transaction signature
- Explorer link: `https://explorer.solana.com/tx/{sig}?cluster=devnet`
- Bounty ID (from transaction logs)

---

## Step 2: Claim Bounty

**Wallet B executes:**

```bash
# Claim the bounty
node -e "
const claimer = Keypair.fromSecretKey(/* Wallet B secret */);
const tx = await client.claimBounty({
  bountyId: 0,
  claimer: claimer.publicKey
});

tx.sign(claimer);
const sig = await connection.sendRawTransaction(tx.serialize());
console.log('Bounty claimed:', sig);
"
```

**Record**:
- Transaction signature
- Explorer link
- Timestamp

---

## Step 3: Submit Work

**Wallet B executes:**

```bash
# Submit work proof
node -e "
const tx = await client.submitWork({
  bountyId: 0,
  claimer: claimer.publicKey,
  submissionUrl: 'https://github.com/Boof-Pack/agentbounty/pull/1'
});

tx.sign(claimer);
const sig = await connection.sendRawTransaction(tx.serialize());
console.log('Work submitted:', sig);
"
```

**Record**:
- Transaction signature
- Submission URL used
- Explorer link

---

## Step 4: Approve Work

**Wallet A executes:**

```bash
# Approve and release payment
node -e "
const tx = await client.approveWork({
  bountyId: 0,
  poster: poster.publicKey
});

tx.sign(poster);
const sig = await connection.sendRawTransaction(tx.serialize());
console.log('Work approved, payment released:', sig);
"
```

**Record**:
- Transaction signature
- Payment amount (from logs)
- Fee amount (from logs)
- Explorer link showing payment

---

## Verification

**Check final state:**

```bash
# Query bounty status
node -e "
const bounty = await client.getBounty(0);
console.log('Status:', bounty.status); // Should be 'Completed'
console.log('Payout:', bounty.rewardLamports / 1e9, 'SOL');
"
```

**Check balances:**

```bash
# Wallet B should have received payment
solana balance <WALLET_B> --url devnet
```

---

## Demo Package

**Create proof document:**

```markdown
# AgentBounty: First Completion on Solana

**Date**: 2026-02-03
**Network**: Devnet
**Program**: {PROGRAM_ID}

## Transaction Flow

1. **Bounty Created**
   - Tx: https://explorer.solana.com/tx/{CREATE_SIG}?cluster=devnet
   - Poster: {WALLET_A}
   - Reward: 0.1 SOL
   - Escrow: Locked

2. **Bounty Claimed**
   - Tx: https://explorer.solana.com/tx/{CLAIM_SIG}?cluster=devnet
   - Claimer: {WALLET_B}
   - Time: {TIMESTAMP}

3. **Work Submitted**
   - Tx: https://explorer.solana.com/tx/{SUBMIT_SIG}?cluster=devnet
   - Proof: https://github.com/Boof-Pack/agentbounty/pull/1

4. **Payment Released**
   - Tx: https://explorer.solana.com/tx/{APPROVE_SIG}?cluster=devnet
   - Payout: 0.0975 SOL (97.5% to worker)
   - Fee: 0.0025 SOL (2.5% to protocol)
   - Status: COMPLETED ✅

## Proof Points

✅ On-chain bounty creation  
✅ Automatic escrow  
✅ Agent claiming (autonomous)  
✅ Work submission  
✅ Payment release (programmatic)  
✅ Fee collection  

**Result**: First agent-to-agent bounty completed on Solana with zero human intervention in the payment flow.

**Total time**: X minutes from creation to payment
```

---

## Post Demo

1. **Forum post** with all transaction links
2. **Update project** with demo link
3. **Tweet thread** (if applicable)
4. **GitHub README** badge: "✅ Proven on devnet"

---

## Success Metrics

- ✅ All 4 transactions confirmed
- ✅ Payment received by claimer
- ✅ Escrow cleared
- ✅ Protocol fee collected
- ✅ Bounty status = Completed
- ✅ Explorer links showing full flow

**This is the winning demo**: Real smart contract, real escrow, real payment, real agents.
