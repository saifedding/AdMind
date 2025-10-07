export interface Competitor {
  id: number;
  name: string;
  page_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdAnalysis {
  id: number;
  ad_id: number;
  summary?: string;
  hook_score?: number;
  overall_score?: number;
  ai_prompts?: any;
  raw_ai_response?: any;
  target_audience?: string;
  ad_format_analysis?: any;
  competitor_insights?: any;
  content_themes?: any;
  performance_predictions?: any;
  analysis_version?: string;
  confidence_score?: number;
  created_at: string;
  updated_at: string;
}

export interface Ad {
  id?: number;
  ad_archive_id: string;
  ad_copy?: string;
  
  // Meta information
  meta: AdMeta;
  
  // Targeting information
  targeting: AdTargeting;
  
  // Lead form information
  lead_form: LeadForm;
  
  // Creatives (ads content)
  creatives: Creative[];
  
  // Additional information (not directly from Facebook API)
  date_found?: string;
  competitor_id?: number;
  competitor_name?: string;
  
  // Basic Facebook ad fields
  page_name?: string;
  publisher_platform?: string[];
  impressions_text?: string;
  end_date?: string;
  cta_text?: string;
  cta_type?: string;
  
  // Extended Facebook ad fields
  page_id?: string;
  is_active?: boolean;
  is_favorite?: boolean;
  start_date?: string;
  currency?: string;
  spend?: string;
  impressions_index?: number;
  display_format?: string;
  page_like_count?: number;
  page_categories?: any[];
  page_profile_uri?: string;
  page_profile_picture_url?: string;
  targeted_countries?: any[];
  contains_sensitive_content?: boolean;
  contains_digital_created_media?: boolean;
  
  // Main ad content
  main_title?: string;
  main_body_text?: string;
  main_caption?: string;
  main_link_url?: string;
  main_link_description?: string;
  
  // Media URLs
  media_type?: string;
  media_url?: string;
  main_image_urls?: string[];
  main_video_urls?: string[];
  
  // Extra content
  extra_texts?: string[];
  extra_links?: string[];
  
  raw_data?: any;
  
  // Relationships
  competitor?: Competitor;
  analysis?: AdAnalysis;
  
  // New fields for Ad Sets
  ad_set_id?: number;
  variant_count?: number;
  ad_set_created_at?: string;
  ad_set_first_seen_date?: string;
  ad_set_last_seen_date?: string;
}

export interface AdWithAnalysis extends Ad {
  competitor?: Competitor;
  analysis?: AdAnalysis;
  ad_set_id?: number;
  variant_count?: number;
  ad_set_created_at?: string;
  ad_set_first_seen_date?: string;
  ad_set_last_seen_date?: string;
}

// Campaign type structure
export type Campaign = {
  campaign_id: string;
  platforms: string[];
  ads: Ad[];
};

// Advertiser (competitor) information
export type AdvertiserInfo = {
  page_id: string;
  page_name: string;
  page_url?: string;
  page_likes?: number;
  page_profile_picture?: string;
};

// Complete response format
export type AdsResponse = {
  advertiser_info: AdvertiserInfo;
  campaigns: Campaign[];
};

// Supporting types
export type Location = {
  name: string;
  num_obfuscated: number;
  type: string;
  excluded: boolean;
};

export type AgeRange = {
  min: number;
  max: number;
};

export type GenderAgeBreakdown = {
  age_range: string;
  male?: number;
  female?: number;
  unknown?: number;
};

export type CountryReachBreakdown = {
  country: string;
  age_gender_breakdowns: GenderAgeBreakdown[];
};

// Creative media (e.g., image, video)
export interface CreativeMedia {
  url: string;
  type: string;
}

// Creative (individual ad content)
export type Creative = {
  id: string;
  title?: string;
  body?: string;
  caption?: string;
  link_url?: string;
  link_description?: string;
  media?: CreativeMedia[];
  cta?: {
    text?: string;
    type?: string;
  };
};

// Supporting types for Meta, Targeting, and LeadForm
export interface AdMeta {
  is_active?: boolean;
  cta_type?: string;
  display_format?: string;
  start_date?: string;
  end_date?: string;
}

export interface AdTargeting {
  locations?: Location[];
  age_range?: AgeRange;
  gender?: string;
  reach_breakdown?: any; // Can be more specific if needed
  total_reach?: number;
}

export interface LeadForm {
  questions?: Record<string, any>;
  standalone_fields?: string[];
}

// Filter types for UI
export type AdFilterParams = {
  campaignId?: string;
  isActive?: boolean;
  hasLeadForm?: boolean;
  platform?: string;
  mediaType?: string;
  startDate?: string;
  endDate?: string;
  query?: string;
  page?: number;
  limit?: number;
};

// Pagination response
export type PaginatedAdsResponse = {
  items: Ad[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// Ad stats type
export type AdStats = {
  total_ads: number;
  active_ads: number;
  with_lead_form: number;
  platforms: Record<string, number>;
  media_types: Record<string, number>;
}; 