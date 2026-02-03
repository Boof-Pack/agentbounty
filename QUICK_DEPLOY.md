# Quick Deployment Guide - AgentBounty

**Status**: Ready to deploy ✅  
**Time to deploy**: 5-10 minutes total

---

## Option 1: Railway (Recommended - Easiest)

### Deploy API
1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `Boof-Pack/agentbounty`
4. Root directory: `/api`
5. Railway auto-detects Node.js and deploys
6. Copy the provided URL (e.g., `https://agentbounty-api.up.railway.app`)

### Deploy Frontend
1. Same Railway project, add new service
2. Select same repo
3. Root directory: `/app`
4. Deploy as static site
5. Copy URL (e.g., `https://agentbounty.up.railway.app`)

**Total time**: ~5 minutes

---

## Option 2: Vercel (Very Easy)

### Deploy API
```bash
cd api
npx vercel --prod
# Follow prompts, takes 1 minute
```

### Deploy Frontend
```bash
cd app
npx vercel --prod
# Follow prompts, takes 30 seconds
```

**Total time**: ~3 minutes

---

## Option 3: Render (Free Tier)

### Deploy API
1. Go to https://render.com
2. New Web Service → Connect repository
3. Select `Boof-Pack/agentbounty`
4. Root directory: `api`
5. Build command: `npm install`
6. Start command: `npm start`
7. Deploy (takes ~3 minutes)

### Deploy Frontend
1. New Static Site
2. Same repo
3. Publish directory: `app`
4. Deploy

**Total time**: ~8 minutes

---

## Option 4: Run Locally (Testing)

### API
```bash
cd /root/.openclaw/workspace/agentbounty/api
npm install
npm start
# Runs on http://localhost:3000
```

### Frontend
```bash
cd /root/.openclaw/workspace/agentbounty/app
python3 -m http.server 8080
# Runs on http://localhost:8080
```

**Use case**: Local testing before production deploy

---

## After Deployment

### 1. Update Frontend with API URL
Edit `app/index.html`, find line with API endpoint:
```javascript
const API_URL = 'http://localhost:3000'; // Change this
```

Replace with your deployed API URL:
```javascript
const API_URL = 'https://agentbounty-api.up.railway.app';
```

Commit and redeploy frontend.

### 2. Test Endpoints

**Health check**:
```bash
curl https://your-api-url/health
```

**Expected response**:
```json
{
  "status": "ok",
  "timestamp": 1675432800000,
  "network": "devnet"
}
```

### 3. Initialize Protocol (One-time)

The protocol needs to be initialized once on devnet. This creates the global state account.

```bash
# Using Anchor CLI (if available)
cd /root/.openclaw/workspace/agentbounty
anchor run initialize --provider.cluster devnet

# OR using web UI (after frontend is deployed)
# Connect Phantom wallet → Click "Initialize Protocol" button
```

### 4. Update Forum Post

Once live, update the forum post with:
- API URL: `https://...`
- Frontend URL: `https://...`
- Call to action: "Try it now!"

---

## Current Status

- ✅ Program deployed: `9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK`
- ✅ API code ready (tested locally)
- ✅ Frontend code ready
- ⏳ API deployment (5 min)
- ⏳ Frontend deployment (2 min)
- ⏳ Protocol initialization (1 min)

---

## Deployment Checklist

- [ ] Deploy API to Railway/Vercel/Render
- [ ] Get API URL
- [ ] Update frontend API endpoint
- [ ] Deploy frontend to Railway/Vercel/Render
- [ ] Get frontend URL
- [ ] Test health endpoint
- [ ] Initialize protocol (if not done)
- [ ] Test create bounty flow
- [ ] Update forum post with live URLs
- [ ] Share with integration partners

---

## URLs to Share

After deployment, share these with the community:

**Live App**: `https://...` (frontend URL)  
**API Docs**: `https://.../health` (health check)  
**Program ID**: `9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK`  
**Explorer**: https://explorer.solana.com/address/9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK?cluster=devnet

---

**Recommendation**: Use Railway for fastest deployment. Entire process takes ~7 minutes including testing.
