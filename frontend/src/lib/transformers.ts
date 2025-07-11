import { ApiAd, ApiCompetitor, ApiAdAnalysis } from './api';
import { AdWithAnalysis, Ad, Competitor, AdAnalysis } from '@/types/ad';

/**
 * Transform API competitor data to component format
 */
export function transformCompetitor(apiCompetitor: ApiCompetitor): Competitor {
  return {
    id: apiCompetitor.id,
    name: apiCompetitor.name,
    page_id: apiCompetitor.page_id,
    is_active: apiCompetitor.is_active,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Transform API ad analysis data to component format
 */
export function transformAdAnalysis(apiAnalysis: ApiAdAnalysis): AdAnalysis {
  return {
    id: apiAnalysis.id,
    ad_id: 0, // Will be set by the caller
    summary: apiAnalysis.summary,
    hook_score: apiAnalysis.hook_score,
    overall_score: apiAnalysis.overall_score,
    ai_prompts: undefined,
    raw_ai_response: undefined,
    target_audience: apiAnalysis.target_audience,
    ad_format_analysis: undefined,
    competitor_insights: undefined,
    content_themes: apiAnalysis.content_themes,
    performance_predictions: undefined,
    analysis_version: apiAnalysis.analysis_version,
    confidence_score: apiAnalysis.confidence_score,
    created_at: apiAnalysis.created_at,
    updated_at: apiAnalysis.updated_at,
  };
}

/**
 * Transform API ad data to component format
 */
export function transformAd(apiAd: ApiAd): Ad {
  return {
    id: apiAd.id,
    ad_archive_id: apiAd.ad_archive_id,
    ad_copy: apiAd.ad_copy,
    media_type: apiAd.media_type,
    media_url: apiAd.media_url,
    date_found: apiAd.date_found,
    
    // Basic Facebook ad fields
    page_name: apiAd.page_name,
    publisher_platform: apiAd.publisher_platform,
    impressions_text: apiAd.impressions_text,
    cta_text: apiAd.cta_text,
    
    // Extended Facebook ad fields
    page_id: apiAd.page_id,
    start_date: apiAd.start_date,
    end_date: apiAd.end_date,
    spend: apiAd.spend,
    page_profile_picture_url: apiAd.page_profile_picture_url,
    
    // Main ad content
    main_title: apiAd.main_title,
    main_body_text: apiAd.main_body_text,
    main_caption: apiAd.main_caption,
    
    // Media URLs
    main_image_urls: apiAd.main_image_urls,
    main_video_urls: apiAd.main_video_urls,
    
    // Relationships
    competitor_id: apiAd.competitor?.id,
    competitor: transformCompetitor(apiAd.competitor),
    analysis: apiAd.analysis ? transformAdAnalysis(apiAd.analysis) : undefined,

    // New fields from the backend are now directly mapped
    meta: apiAd.meta || {},
    targeting: apiAd.targeting || { locations: [], age_range: { min: 0, max: 0 } },
    lead_form: apiAd.lead_form || { questions: {}, standalone_fields: [] },
    creatives: apiAd.creatives || [],
    
    // Ad Set fields
    ad_set_id: apiAd.ad_set_id,
    variant_count: apiAd.variant_count,
  };
}

/**
 * Transform API ad data to AdWithAnalysis format (required by AdCard)
 */
export function transformAdWithAnalysis(apiAd: ApiAd): AdWithAnalysis {
  const ad = transformAd(apiAd);
  
  // For AdWithAnalysis, we need to ensure competitor and analysis are present
  const competitor = transformCompetitor(apiAd.competitor);
  const analysis = apiAd.analysis 
    ? transformAdAnalysis(apiAd.analysis)
    : {
        id: 0,
        ad_id: apiAd.id,
        summary: undefined,
        hook_score: undefined,
        overall_score: undefined,
        ai_prompts: undefined,
        raw_ai_response: undefined,
        target_audience: undefined,
        ad_format_analysis: undefined,
        competitor_insights: undefined,
        content_themes: undefined,
        performance_predictions: undefined,
        analysis_version: undefined,
        confidence_score: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

  return {
    ...ad,

    // Ensure relationships are correctly attached/overwritten
    competitor: competitor,
    analysis: analysis,

    // Explicitly map AdSet fields from the raw API object (these may be undefined on the intermediate `ad`)
    ad_set_id: apiAd.ad_set_id,
    variant_count: apiAd.variant_count,
    ad_set_created_at: apiAd.ad_set_created_at,
    ad_set_first_seen_date: apiAd.ad_set_first_seen_date,
    ad_set_last_seen_date: apiAd.ad_set_last_seen_date,
  };
}

/**
 * Transform array of API ads to AdWithAnalysis format
 */
export function transformAdsWithAnalysis(apiAds: ApiAd[]): AdWithAnalysis[] {
  return apiAds.map(transformAdWithAnalysis);
} 