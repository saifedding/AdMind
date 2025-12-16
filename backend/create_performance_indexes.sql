-- Performance Optimization Indexes
-- Run these commands in your database to improve query performance

-- AdSet table indexes
CREATE INDEX IF NOT EXISTS idx_adset_best_ad_id ON ad_sets(best_ad_id);
CREATE INDEX IF NOT EXISTS idx_adset_is_favorite ON ad_sets(is_favorite);
CREATE INDEX IF NOT EXISTS idx_adset_created_at ON ad_sets(created_at);
CREATE INDEX IF NOT EXISTS idx_adset_first_seen_date ON ad_sets(first_seen_date);
CREATE INDEX IF NOT EXISTS idx_adset_last_seen_date ON ad_sets(last_seen_date);
CREATE INDEX IF NOT EXISTS idx_adset_variant_count ON ad_sets(variant_count);

-- Ad table indexes
CREATE INDEX IF NOT EXISTS idx_ad_competitor_id ON ads(competitor_id);
CREATE INDEX IF NOT EXISTS idx_ad_duration_days ON ads(duration_days);
CREATE INDEX IF NOT EXISTS idx_ad_created_at ON ads(created_at);
CREATE INDEX IF NOT EXISTS idx_ad_date_found ON ads(date_found);
CREATE INDEX IF NOT EXISTS idx_ad_updated_at ON ads(updated_at);
CREATE INDEX IF NOT EXISTS idx_ad_ad_set_id ON ads(ad_set_id);

-- Analysis table indexes
CREATE INDEX IF NOT EXISTS idx_analysis_ad_id ON ad_analyses(ad_id);
CREATE INDEX IF NOT EXISTS idx_analysis_overall_score ON ad_analyses(overall_score);
CREATE INDEX IF NOT EXISTS idx_analysis_hook_score ON ad_analyses(hook_score);
CREATE INDEX IF NOT EXISTS idx_analysis_is_current ON ad_analyses(is_current);

-- Competitor table indexes
CREATE INDEX IF NOT EXISTS idx_competitor_name ON competitors(name);
CREATE INDEX IF NOT EXISTS idx_competitor_page_id ON competitors(page_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_adset_favorite_created ON ad_sets(is_favorite, created_at);
CREATE INDEX IF NOT EXISTS idx_ad_competitor_duration ON ads(competitor_id, duration_days);
CREATE INDEX IF NOT EXISTS idx_analysis_scores ON ad_analyses(overall_score, hook_score);

-- JSON field indexes (PostgreSQL specific - uncomment if using PostgreSQL)
-- CREATE INDEX IF NOT EXISTS idx_ad_meta_is_active ON ads USING GIN ((meta->'is_active'));
-- CREATE INDEX IF NOT EXISTS idx_ad_creatives_search ON ads USING GIN (creatives);

-- For SQLite (comment out PostgreSQL indexes above and use these)
-- CREATE INDEX IF NOT EXISTS idx_ad_meta_is_active ON ads(json_extract(meta, '$.is_active'));

ANALYZE;  -- Update table statistics after creating indexes