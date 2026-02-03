# Deployment Guide

## Current Status

**Smart Contract**: Not yet deployed (Anchor CLI needed)  
**API**: Ready to deploy  
**Frontend**: Ready to host  
**SDK**: Ready to publish

## Options for Smart Contract Deployment

### Option 1: Anchor CLI (Traditional)

```bash
# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Build and deploy
anchor build
anchor deploy --provider.cluster devnet

# Update program ID in:
# - sdk/src/index.ts (PROGRAM_ID constant)
# - api/server.js (PROGRAM_ID constant)
# - Anchor.toml
```

### Option 2: Solana Playground (Fast)

1. Go to https://beta.solpg.io
2. Create new Anchor project
3. Paste lib.rs content
4. Build & deploy via UI
5. Copy program ID

### Option 3: Pre-compiled Deploy

```bash
# If someone shares compiled .so file
solana program deploy target/deploy/agentbounty.so \
  --program-id BountyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
  --keypair ~/.config/solana/id.json \
  --url devnet
```

## API Deployment

### Vercel

```bash
cd api
npm install -g vercel
vercel
# Follow prompts
```

### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway init
railway up
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY api/package*.json ./
RUN npm install
COPY api/ ./
EXPOSE 3000
CMD ["node", "server.js"]
```

## Frontend Deployment

### GitHub Pages

```bash
# Push to GitHub, enable Pages in settings
# Serve app/index.html
```

### Vercel/Netlify

```bash
# Drag and drop app/ folder to dashboard
# Or use CLI
```

### IPFS

```bash
ipfs add -r app/
# Use resulting hash for decentralized hosting
```

## SDK Publishing

### npm

```bash
cd sdk
npm run build
npm publish --access public
```

## Environment Variables

### API
- `PORT` - API port (default: 3000)
- `SOLANA_RPC_URL` - RPC endpoint
- `PROGRAM_ID` - Deployed program address

### Frontend
Update hardcoded values in `app/index.html`:
- `API_BASE` - API server URL
- Program ID in footer

## Post-Deployment Checklist

- [ ] Smart contract deployed to devnet
- [ ] Program ID updated in all locations
- [ ] API deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Test end-to-end bounty flow
- [ ] Update forum post with live links
- [ ] Create first demo bounty

## Troubleshooting

### Anchor Build Fails
- Check Rust version: `rustc --version` (need 1.70+)
- Update Anchor: `avm update`
- Clean build: `anchor clean && anchor build`

### RPC Rate Limits
- Use Helius/Alchemy for higher limits
- Add retry logic with exponential backoff

### Transaction Failures
- Check SOL balance for fees
- Verify program ID matches deployed address
- Use `--commitment confirmed` flag

---

**Note**: For hackathon speed, Option 2 (Solana Playground) is recommended for initial deployment.
