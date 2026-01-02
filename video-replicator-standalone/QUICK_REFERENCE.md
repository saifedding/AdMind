# Quick Reference Card

## 🚀 Deployment Commands

### Backend (Render)
```
Name: video-replicator-backend
Root: video-replicator-standalone/backend
Build: pip install -r requirements.txt
Start: uvicorn main:app --host 0.0.0.0 --port $PORT
Env: GOOGLE_API_KEY=your_key
```

### Frontend (Vercel)
```
Root: video-replicator-standalone/frontend
Build: npm run build
Env: NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

---

## 🔗 Important URLs

```
Render Dashboard:  https://dashboard.render.com
Vercel Dashboard:  https://vercel.com/dashboard
UptimeRobot:       https://uptimerobot.com
```

---

## 🧪 Test Commands

```bash
# Test backend health
curl https://your-backend.onrender.com/health

# Test backend API
curl https://your-backend.onrender.com/

# Open frontend
open https://your-app.vercel.app
```

---

## 🔧 Environment Variables

### Backend (Render)
| Variable | Value | Required |
|----------|-------|----------|
| `GOOGLE_API_KEY` | Your Gemini API key | ✅ Yes |
| `FRONTEND_URL` | Your Vercel URL | ⚠️ For CORS |

### Frontend (Vercel)
| Variable | Value | Required |
|----------|-------|----------|
| `NEXT_PUBLIC_API_URL` | Your Render URL | ✅ Yes |

---

## 📊 Free Tier Limits

| Service | Limit | Notes |
|---------|-------|-------|
| Render | 750 hrs/month | Spins down after 15 min |
| Vercel | Unlimited | 100 deployments/day |
| Gemini | Pay-per-use | ~$0.001 per request |

---

## 🐛 Quick Fixes

### Backend not responding
```bash
# Wait 30s for cold start, then:
curl https://your-backend.onrender.com/health
```

### CORS error
```bash
# Add to Render environment:
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend can't connect
```bash
# Check Vercel environment:
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
# (no trailing slash!)
```

---

## 📝 Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set
- [ ] CORS configured
- [ ] Tested video analysis
- [ ] (Optional) UptimeRobot configured

---

## 🔄 Update Commands

```bash
# Update backend
git push origin main
# Render auto-deploys

# Update frontend
git push origin main
vercel --prod
```

---

## 📞 Support Links

- Render: https://render.com/docs
- Vercel: https://vercel.com/docs
- Gemini: https://ai.google.dev/docs

---

**Print this page for quick reference!** 📄
