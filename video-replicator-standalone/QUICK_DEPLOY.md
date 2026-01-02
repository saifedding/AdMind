# Quick Deploy Guide (5 Minutes)

## Prerequisites
- GitHub account
- Render account (free): https://render.com
- Vercel account (free): https://vercel.com
- Your Google Gemini API key

---

## Step 1: Push to GitHub (if not already)

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

---

## Step 2: Deploy Backend to Render (2 minutes)

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `video-replicator-backend`
   - **Root Directory**: `video-replicator-standalone/backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Click **"Advanced"** → Add Environment Variable:
   - Key: `GOOGLE_API_KEY`
   - Value: `your_gemini_api_key_here`
6. Click **"Create Web Service"**
7. Wait 5 minutes, then **copy your backend URL**: 
   ```
   https://video-replicator-backend-xxxx.onrender.com
   ```

---

## Step 3: Deploy Frontend to Vercel (2 minutes)

### Option A: Using Vercel Dashboard (Easiest)

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `video-replicator-standalone/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
4. Add Environment Variable:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: `https://your-backend-url.onrender.com` (from Step 2)
5. Click **"Deploy"**
6. Done! Your app is live at: `https://your-app.vercel.app`

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend
cd video-replicator-standalone/frontend

# Deploy
vercel

# Follow prompts, then add environment variable in dashboard
# Redeploy with:
vercel --prod
```

---

## Step 4: Update Backend CORS (1 minute)

1. Go to Render dashboard → Your service
2. Click **"Environment"** tab
3. Add new variable:
   - Key: `FRONTEND_URL`
   - Value: `https://your-app.vercel.app` (from Step 3)
4. Service will auto-redeploy

---

## Done! 🎉

Your app is now live:
- **Frontend**: https://your-app.vercel.app
- **Backend**: https://your-backend-url.onrender.com

---

## Test It

1. Visit your frontend URL
2. Enter a video URL (YouTube, Instagram, TikTok)
3. Click "Analyze"
4. Wait ~30 seconds for first request (cold start)
5. Generate prompts!

---

## Important Notes

⚠️ **First request takes ~30 seconds** (Render free tier spins down after 15 min)

💡 **Keep backend awake**: Use [UptimeRobot](https://uptimerobot.com) to ping `/health` every 5 minutes

📊 **Monitor**: 
- Render logs: https://dashboard.render.com
- Vercel logs: https://vercel.com/dashboard

---

## Troubleshooting

**Backend not responding?**
- Check Render logs for errors
- Verify `GOOGLE_API_KEY` is set
- First request takes 30s (cold start)

**Frontend can't connect?**
- Verify `NEXT_PUBLIC_API_URL` in Vercel
- Check CORS settings in Render
- Ensure no trailing slash in URL

**Need help?**
- Render docs: https://render.com/docs
- Vercel docs: https://vercel.com/docs
