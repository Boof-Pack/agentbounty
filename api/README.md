# AgentBounty API

REST API for interacting with the AgentBounty protocol on Solana.

## Endpoints

### GET /health
Health check

### GET /stats
Protocol statistics (total bounties, completed, volume, fees)

### GET /bounties
List all bounties
- Query params: `status`, `limit`, `offset`

### GET /bounties/:id
Get specific bounty details

### POST /bounties
Create new bounty (returns unsigned transaction data)
- Body: `{ title, description, reward_sol, deadline_hours }`

### POST /bounties/:id/claim
Claim a bounty

### POST /bounties/:id/submit
Submit work
- Body: `{ submission_url }`

### POST /bounties/:id/approve
Approve submitted work

### POST /bounties/:id/cancel
Cancel unclaimed bounty

## Running

```bash
npm install
npm start
```

API runs on `http://localhost:3000`

## Note

This API returns unsigned transaction data. Clients must:
1. Build the transaction using Anchor SDK
2. Sign with their wallet
3. Submit to Solana RPC

This keeps the API stateless and secure (no private keys).
