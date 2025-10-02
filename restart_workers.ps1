# Restart Celery Workers and Beat
# Run this script after making changes to Celery tasks

Write-Host "🔄 Restarting Celery workers and beat..." -ForegroundColor Cyan

# Restart both worker and beat containers
docker-compose restart worker beat

Write-Host ""
Write-Host "⏳ Waiting for workers to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

Write-Host ""
Write-Host "✅ Verifying registered tasks..." -ForegroundColor Green
Write-Host ""

# Check registered tasks
docker-compose exec worker celery -A app.celery_worker inspect registered

Write-Host ""
Write-Host "✅ Workers restarted successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Registered tasks should include:" -ForegroundColor Cyan
Write-Host "   - daily_ads_scraper.scrape_new_ads_daily" -ForegroundColor White
Write-Host "   - daily_ads_scraper.scrape_specific_competitors" -ForegroundColor White
Write-Host "   - facebook_ads_scraper.scrape_competitor_ads" -ForegroundColor White
Write-Host ""
Write-Host "🎯 You can now use the Daily Scraping interface!" -ForegroundColor Green