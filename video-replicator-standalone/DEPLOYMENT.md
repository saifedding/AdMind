# Deployment Guide: Render + Vercel

## Overview
- **Backend**: Render (Python FastAPI)
- **Frontend**: Vercel (Next.js)
- **Cost**: 100% FREE

---

## Step 1: Deploy Backend to Render

### Option A: Using Render Dashboard (Recommended)

1. **Sign up at [render.com](https://render.com)**

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

3. **Configure Service**
   ```
   Name: video-replicator-backend
   Region: Choose closest to you
   Branch: main (or your branch)
   Root Directory: video-replicator-standalone/backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

4. **Add Environment Variable**
   - Click "Environment" tab
   - Add: `GOOGLE_API_KEY` = `your_gemini_api_key_here`

5. **Deploy**
   - Click "Create Web Service"
   - Wait 5-10 minutes for deployment
   - Copy your backend URL: `https://video-replicator-backend-xxxx.onrender.com`

### Option B: Using render.yaml (Auto-deploy)

1. Push the `render.yaml` file to your repo
2. In Render dashboard, click "New +" → "Blueprint"
3. Connect repo and it will auto-configure
4. Add `GOOGLE_API_KEY` in environment variables

---

## Step 2: Deploy Frontend to Vercel

### Prerequisites
```bash
npm install -g vercel
```

### Deploy Steps

1. **Update Frontend API URL**
   ```bash
   cd video-replicator-standalone/frontend
   ```

2. **Create/Update `.env.local`**
   ```bash
   echo "NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com" > .env.local
   ```
   Replace `your-backend-url` with your actual Render URL

3. **Deploy to Vercel**
   ```bash
   vercel
   ```
   
   Follow prompts:
   - Set up and deploy? **Y**
   - Which scope? Choose your account
   - Link to existing project? **N**
   - Project name? **video-replicator** (or your choice)
   - Directory? **./video-replicator-standalone/frontend**
   - Override settings? **N**

4. **Add Environment Variable in Vercel**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your project
   - Settings → Environment Variables
   - Add: `NEXT_PUBLIC_API_URL` = `https://your-backend-url.onrender.com`
   - Redeploy: Deployments → Click "..." → Redeploy

5. **Production Deploy**
   ```bash
   vercel --prod
   ```

---

## Step 3: Update CORS (Important!)

After deploying frontend, update backend CORS:

1. Go to Render dashboard → Your service → Environment
2. Add new variable:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```
3. Service will auto-redeploy

---

## Verification

### Test Backend
```bash
curl https://your-backend-url.onrender.com/health
# Should return: {"status":"healthy"}
```

### Test Frontend
Visit: `https://your-app.vercel.app`

---

## Important Notes

### Render Free Tier Limitations
- **Spins down after 15 minutes** of inactivity
- **Cold start**: ~30 seconds on first request
- **750 hours/month** free (enough for personal use)
- No timeout limits (good for video processing!)

### Vercel Free Tier
- Unlimited bandwidth
- 100 deployments/day
- Automatic HTTPS
- Global CDN

### Keeping Backend Awake (Optional)
Use a free service like [UptimeRobot](https://uptimerobot.com) to ping your backend every 5 minutes:
- Ping URL: `https://your-backend-url.onrender.com/health`
- Interval: 5 minutes

---

## Troubleshooting

### Backend not responding
- Check Render logs: Dashboard → Your service → Logs
- Verify `GOOGLE_API_KEY` is set
- Check if service is sleeping (first request takes 30s)

### Frontend can't connect to backend
- Verify `NEXT_PUBLIC_API_URL` in Vercel environment variables
- Check CORS settings in backend
- Ensure backend URL is correct (no trailing slash)

### Video download fails
- Check Render logs for yt-dlp errors
- Some videos may be geo-restricted
- Large videos may take time (no timeout on Render free tier)

---

## Updating Your App

### Backend Updates
```bash
git add .
git commit -m "Update backend"
git push
# Render auto-deploys on push
```

### Frontend Updates
```bash
cd video-replicator-standalone/frontend
git add .
git commit -m "Update frontend"
git push
vercel --prod
```

---

## URLs to Save

- **Backend**: `https://your-backend-url.onrender.com`
- **Frontend**: `https://your-app.vercel.app`
- **Render Dashboard**: https://dashboard.render.com
- **Vercel Dashboard**: https://vercel.com/dashboard

---

## Cost Breakdown

| Service | Free Tier | Cost |
|---------|-----------|------|
| Render | 750 hrs/month | $0 |
| Vercel | Unlimited | $0 |
| **Total** | | **$0/month** |

Perfect for personal projects and demos! 🎉
