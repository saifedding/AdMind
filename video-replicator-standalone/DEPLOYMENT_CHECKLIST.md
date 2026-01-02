# Deployment Checklist ✅

Use this checklist to ensure smooth deployment.

---

## Pre-Deployment

- [ ] Code is committed to GitHub
- [ ] `.env` files are in `.gitignore` (already done ✅)
- [ ] You have your Google Gemini API key ready
- [ ] You have accounts on:
  - [ ] GitHub
  - [ ] Render.com
  - [ ] Vercel.com

---

## Backend Deployment (Render)

- [ ] Created new Web Service on Render
- [ ] Connected GitHub repository
- [ ] Set Root Directory: `video-replicator-standalone/backend`
- [ ] Set Build Command: `pip install -r requirements.txt`
- [ ] Set Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- [ ] Added environment variable: `GOOGLE_API_KEY`
- [ ] Deployment successful (check logs)
- [ ] Copied backend URL: `https://_____.onrender.com`
- [ ] Tested health endpoint: `https://_____.onrender.com/health`

---

## Frontend Deployment (Vercel)

- [ ] Imported repository on Vercel
- [ ] Set Root Directory: `video-replicator-standalone/frontend`
- [ ] Added environment variable: `NEXT_PUBLIC_API_URL` = backend URL
- [ ] Deployment successful
- [ ] Copied frontend URL: `https://_____.vercel.app`
- [ ] Tested frontend loads correctly

---

## Post-Deployment Configuration

- [ ] Updated Render backend with `FRONTEND_URL` environment variable
- [ ] Backend redeployed with new CORS settings
- [ ] Tested video analysis from frontend
- [ ] Tested prompt generation
- [ ] Tested translation feature

---

## Optional Enhancements

- [ ] Set up UptimeRobot to keep backend awake
  - URL to ping: `https://_____.onrender.com/health`
  - Interval: 5 minutes
- [ ] Added custom domain to Vercel (optional)
- [ ] Set up monitoring/analytics (optional)

---

## URLs to Save

```
Backend URL: https://_____.onrender.com
Frontend URL: https://_____.vercel.app
Render Dashboard: https://dashboard.render.com
Vercel Dashboard: https://vercel.com/dashboard
```

---

## Common Issues & Solutions

### Issue: Backend returns 500 error
**Solution**: Check Render logs, verify `GOOGLE_API_KEY` is set correctly

### Issue: Frontend can't connect to backend
**Solution**: Verify `NEXT_PUBLIC_API_URL` in Vercel environment variables

### Issue: CORS error in browser
**Solution**: Add `FRONTEND_URL` to Render backend environment variables

### Issue: First request takes 30+ seconds
**Solution**: This is normal (cold start). Set up UptimeRobot to keep it warm

### Issue: Video download fails
**Solution**: Check Render logs for yt-dlp errors. Some videos may be geo-restricted

---

## Success Criteria ✅

Your deployment is successful when:
- ✅ Frontend loads without errors
- ✅ You can analyze a video URL
- ✅ Scenes are extracted correctly
- ✅ Prompts are generated successfully
- ✅ Translation works (if needed)

---

## Need Help?

- **Render Issues**: https://render.com/docs
- **Vercel Issues**: https://vercel.com/docs
- **API Issues**: Check backend logs in Render dashboard

---

**Estimated Total Time**: 10-15 minutes
**Cost**: $0/month (100% free!)
