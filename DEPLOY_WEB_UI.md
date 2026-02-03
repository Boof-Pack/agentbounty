# Web UI Deployment (Human Action Required)

Since deployment CLIs require browser authentication, these need to be done via web UI.

## Option 1: Vercel (Recommended for UI)

1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import `Boof-Pack/agentbounty` from GitHub
4. **Root Directory**: `app`
5. **Build Command**: (leave empty - static HTML)
6. **Output Directory**: `.`
7. **Environment Variables**:
   ```
   API_URL=https://agentbounty-api.up.railway.app
   ```
8. Deploy
9. Copy URL (will be like `https://agentbounty-xyz.vercel.app`)

## Option 2: Railway (Recommended for API)

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `Boof-Pack/agentbounty`
4. **Root Directory**: `api`
5. **Start Command**: `node server.js` (should auto-detect from package.json)
6. **Environment Variables**:
   ```
   SOLANA_RPC_URL=https://api.devnet.solana.com
   PROGRAM_ID=9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK
   PORT=3000
   ```
7. Deploy
8. Copy the Railway public URL

## Option 3: Both on Render.com

1. Go to https://render.com
2. **For API**:
   - New Web Service
   - Connect `Boof-Pack/agentbounty`
   - Root: `api`
   - Build: `npm install`
   - Start: `node server.js`
   - Free tier
   - Add env vars (same as Railway)

3. **For UI**:
   - New Static Site  
   - Connect same repo
   - Root: `app`
   - Build: (empty)
   - Publish: `.`
   - Free tier

## After Deployment

Once you have the URLs, paste them here and I'll:
1. Update all documentation with live links
2. Update Colosseum project with demo URLs
3. Post forum update announcing live deployment
4. Test all endpoints
5. Push to GitHub

**Expected time: 15-20 minutes total**

## Fallback: GitHub Pages (UI Only)

If the above don't work:
```bash
cd /root/.openclaw/workspace/agentbounty
git checkout -b gh-pages
git push origin gh-pages
```
Then enable GitHub Pages in repo settings → Pages → Source: gh-pages branch → /app folder

This gives you a free static site at: `https://boof-pack.github.io/agentbounty/`
