export interface SearchResult {
  success: boolean;
  search_type: string;
  query: string;
  countries: string[];
  total_ads_found: number;
  total_ads_saved: number;
  total_unique_ads: number;
  pages_scraped: number;
  stats: {
    total_processed: number;
    created: number;
    updated: number;
    errors: number;
    competitors_processed: number;
    competitors_created?: number;
    competitors_updated?: number;
    campaigns_processed?: number;
    ads_filtered_by_duration?: number;
  };
  ads_preview: AdPreview[];
  message: string;
  search_time: string;
  next_cursor?: string | null;
  has_next_page?: boolean;
}

export interface AdVariant {
  ad_archive_id: string;
  duration_days?: number;
  is_active: boolean;
}

export interface AdPreview {
  ad_archive_id: string;
  advertiser: string;
  media_type: string;
  is_active: boolean;
  start_date?: string;
  duration_days?: number;
  creatives_count: number;
  has_targeting: boolean;
  has_lead_form: boolean;
  creatives: Creative[];
  targeting: Record<string, any>;
  lead_form: Record<string, any>;
  meta: AdMeta;
  variant_count?: number;
  variants?: AdVariant[];
}

export interface Creative {
  body?: string;
  title?: string;
  description?: string;
  call_to_action?: string;
  link_url?: string;
}

export interface AdMeta {
  page_name?: string;
  page_id?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  image_urls?: string[];
  video_urls?: string[];
  primary_media_url?: string;
  main_image_urls?: string[];
  main_video_urls?: string[];
  media_url?: string;
  video_preview_image_url?: string;
}

export type SearchType = 'keyword' | 'page';
export type ActiveStatus = 'all' | 'active' | 'inactive';
export type MediaType = 'all' | 'video' | 'image' | 'meme';

export interface SearchParams {
  searchType: SearchType;
  keywordQuery: string;
  pageId: string;
  selectedCountries: string[];
  activeStatus: ActiveStatus;
  mediaType: MediaType;
  maxPages: number;
  minDurationDays?: number;
}
