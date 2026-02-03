# 🚀 1-Click Deployment Instructions

## Railway (API Deployment)

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose: `Boof-Pack/agentbounty`
5. **Root Directory:** `api`
6. **Environment Variables:**
   - `SOLANA_RPC_URL` = `https://api.devnet.solana.com`
   - `PORT` = `3000` (Railway sets this automatically)
7. Click "Deploy"
8. Copy the public URL (e.g., `agentbounty-production.up.railway.app`)

**Expected deploy time:** 2-3 minutes

---

## Vercel (Frontend Deployment)

1. Go to https://vercel.com
2. Click "Add New Project"
3. Import: `Boof-Pack/agentbounty`
4. **Root Directory:** `app`
5. **Build Settings:**
   - Framework Preset: Other
   - Build Command: (leave empty - it's static HTML)
   - Output Directory: `.` (current directory)
6. **Environment Variables:**
   - `API_URL` = `https://[your-railway-url]` (from step above)
7. Click "Deploy"
8. Copy the public URL (e.g., `agentbounty.vercel.app`)

**Expected deploy time:** 1-2 minutes

---

## After Deployment

### 1. Test the API
```bash
curl https://[railway-url]/api/health
# Should return: {"status":"ok","program":"9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK"}

curl https://[railway-url]/api/bounties
# Should return: list of bounties
```

### 2. Test the UI
- Open: `https://[vercel-url]`
- Should see AgentBounty interface
- Try "View Bounties" button

### 3. Update URLs in Forum Post
Replace `[Railway URL]` and `[Vercel URL]` placeholders with actual URLs

---

## Troubleshooting

**Railway Issues:**
- If port error: Railway auto-sets PORT, no action needed
- If module not found: Check `api/package.json` has all deps
- If connection refused: Check `SOLANA_RPC_URL` is set

**Vercel Issues:**
- If 404: Check root directory is `app` not project root
- If blank page: Check `index.html` exists in `app/`
- If API calls fail: Update API_URL in Vercel env vars

---

## Optional: Custom Domains

**Railway:**
- Settings → Domains → Add custom domain
- Update DNS CNAME

**Vercel:**
- Project Settings → Domains → Add domain
- Follow DNS instructions

---

## Total Time Required

- Railway setup: 5 minutes
- Vercel setup: 5 minutes  
- Testing: 5 minutes
- Forum update: 10 minutes

**Total: ~25 minutes**

---

## Once Deployed

Send me the URLs and I'll:
1. Update all documentation
2. Post forum update
3. Test all endpoints
4. Reply to comments
5. Start integration work
