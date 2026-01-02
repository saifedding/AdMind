# Deploy Now - Copy & Paste Commands

Follow these exact steps to deploy in 10 minutes.

---

## ⚡ Quick Start

### 1. Commit Your Code

```bash
cd video-replicator-standalone
git add .
git commit -m "Ready for deployment"
git push origin main
```

---

## 🚀 Backend Deployment (Render)

### Manual Setup (Recommended - 5 minutes)

1. **Go to**: https://dashboard.render.com/select-repo
2. **Click**: "New +" → "Web Service"
3. **Select**: Your repository
4. **Fill in**:
   ```
   Name: video-replicator-backend
   Region: Oregon (US West) or closest to you
   Branch: main
   Root Directory: video-replicator-standalone/backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
   Instance Type: Free
   ```
5. **Environment Variables** (click "Advanced"):
   ```
   GOOGLE_API_KEY = your_actual_gemini_api_key_here
   ```
6. **Click**: "Create Web Service"
7. **Wait**: 5-10 minutes for deployment
8. **Copy**: Your backend URL (looks like `https://video-replicator-backend-xxxx.onrender.com`)

### Test Backend

```bash
# Replace with your actual URL
curl https://video-replicator-backend-xxxx.onrender.com/health

# Should return: {"status":"healthy"}
```

---

## 🎨 Frontend Deployment (Vercel)

### Option A: Vercel Dashboard (Easiest - 3 minutes)

1. **Go to**: https://vercel.com/new
2. **Click**: "Import Project"
3. **Select**: Your GitHub repository
4. **Configure**:
   ```
   Framework Preset: Next.js
   Root Directory: video-replicator-standalone/frontend
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```
5. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL = https://video-replicator-backend-xxxx.onrender.com
   ```
   (Use your actual Render backend URL from above)
6. **Click**: "Deploy"
7. **Wait**: 2-3 minutes
8. **Copy**: Your frontend URL (looks like `https://video-replicator-xxxx.vercel.app`)

### Option B: Vercel CLI (Alternative)

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend
cd video-replicator-standalone/frontend

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? [Select your account]
# - Link to existing project? N
# - What's your project's name? video-replicator
# - In which directory is your code located? ./

# After deployment, add environment variable in Vercel dashboard:
# NEXT_PUBLIC_API_URL = https://your-backend-url.onrender.com

# Deploy to production
vercel --prod
```

---

## 🔗 Connect Frontend & Backend

### Update Backend CORS

1. **Go to**: https://dashboard.render.com
2. **Select**: Your backend service
3. **Click**: "Environment" tab
4. **Add variable**:
   ```
   FRONTEND_URL = https://video-replicator-xxxx.vercel.app
   ```
   (Use your actual Vercel URL)
5. Service will auto-redeploy (wait 2 minutes)

---

## ✅ Test Your Deployment

### 1. Test Backend Health
```bash
curl https://your-backend-url.onrender.com/health
```
Expected: `{"status":"healthy"}`

### 2. Test Frontend
Open in browser: `https://your-app.vercel.app`

### 3. Test Full Flow
1. Enter a YouTube video URL
2. Click "Analyze"
3. Wait ~30 seconds (first request - cold start)
4. Should see video analysis with scenes
5. Click "Generate All Prompts"
6. Should see VEO prompts generated

---

## 📝 Save Your URLs

```
Backend:  https://_____.onrender.com
Frontend: https://_____.vercel.app

Render Dashboard:  https://dashboard.render.com
Vercel Dashboard:  https://vercel.com/dashboard
```

---

## 🐛 Troubleshooting

### Backend not responding?
```bash
# Check if backend is sleeping (first request takes 30s)
curl https://your-backend-url.onrender.com/health

# Check Render logs
# Go to: https://dashboard.render.com → Your service → Logs
```

### Frontend shows connection error?
1. Check `NEXT_PUBLIC_API_URL` in Vercel dashboard
2. Ensure no trailing slash in URL
3. Verify backend is running (check Render logs)

### CORS error in browser console?
1. Add `FRONTEND_URL` to Render backend environment
2. Wait for backend to redeploy
3. Clear browser cache and refresh

### Video analysis fails?
1. Check Render logs for yt-dlp errors
2. Try a different video URL
3. Verify `GOOGLE_API_KEY` is set correctly

---

## 🎯 Optional: Keep Backend Awake

Free tier spins down after 15 min. Keep it awake:

### Using UptimeRobot (Free)

1. **Sign up**: https://uptimerobot.com
2. **Add Monitor**:
   ```
   Monitor Type: HTTP(s)
   Friendly Name: Video Replicator Backend
   URL: https://your-backend-url.onrender.com/health
   Monitoring Interval: 5 minutes
   ```
3. **Save**

Now your backend stays warm! 🔥

---

## 🎉 You're Done!

Your app is now live and accessible worldwide!

Share your frontend URL with anyone:
```
https://your-app.vercel.app
```

---

## 📊 Monitor Your App

- **Render Logs**: https://dashboard.render.com → Your service → Logs
- **Vercel Logs**: https://vercel.com/dashboard → Your project → Deployments
- **Usage**: Check Gemini API usage in Google Cloud Console

---

## 🚀 Next Steps

- [ ] Test all features (video analysis, prompt generation, translation)
- [ ] Set up UptimeRobot to keep backend awake
- [ ] Share your app with friends
- [ ] Monitor usage and costs
- [ ] Consider upgrading if you need more resources

**Total Time**: 10-15 minutes
**Total Cost**: $0/month 🎉
