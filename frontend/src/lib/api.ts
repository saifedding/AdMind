// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

// API Response Types (matching backend DTOs)
export interface ApiCompetitor {
  id: number;
  name: string;
  page_id: string;
  is_active: boolean;
}

export interface ApiAdAnalysis {
  id: number;
  summary?: string;
  hook_score?: number;
  overall_score?: number;
  confidence_score?: number;
  target_audience?: string;
  content_themes?: string[];
  analysis_version?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiCreativeMedia {
  type: string;
  video_sd?: string;
  video_hd?: string;
  video_preview?: string;
  image_original?: string;
  image_resized?: string;
}

export interface ApiCreativeCta {
  text?: string;
  type?: string;
}

export interface ApiCreativeLink {
  url?: string;
  caption?: string;
}

export interface ApiCreative {
  id: string;
  title?: string;
  body?: string;
  caption?: string;
  link_url?: string;
  link_description?: string;
  media?: {
    url: string;
    type: string;
  }[];
}

export interface ApiLocation {
  name: string;
  num_obfuscated: number;
  type: string;
  excluded: boolean;
  gender?: string;
  reach_breakdown?: any; // More specific if needed
  total_reach?: number;
}

export interface ApiAgeRange {
  min: number;
  max: number;
}

export interface ApiGenderAgeBreakdown {
  age_range: string;
  male?: number;
  female?: number;
  unknown?: number;
}

export interface ApiCountryReachBreakdown {
  country: string;
  age_gender_breakdowns: ApiGenderAgeBreakdown[];
}

export interface ApiAdMeta {
  is_active: boolean;
  cta_type?: string;
  display_format?: string;
  start_date?: string;
  end_date?: string;
}

export interface ApiAdTargeting {
  locations?: ApiLocation[];
  age_range?: ApiAgeRange;
  gender?: string;
  reach_breakdown?: ApiCountryReachBreakdown[];
  total_reach?: number;
}

export interface ApiLeadForm {
  questions?: Record<string, any>;
  standalone_fields?: string[];
}

export interface ApiAd {
  id: number;
  ad_archive_id: string;
  competitor: ApiCompetitor;
  ad_copy?: string;
  main_title?: string;
  main_body_text?: string;
  main_caption?: string;
  media_type?: string;
  media_url?: string;
  main_image_urls?: string[];
  main_video_urls?: string[];
  page_name?: string;
  page_id?: string;
  page_profile_picture_url?: string;
  publisher_platform?: string[];
  targeted_countries?: string[];
  impressions_text?: string;
  spend?: string;
  cta_text?: string;
  cta_type?: string;
  date_found: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  is_favorite?: boolean;
  duration_days?: number;
  created_at: string;
  updated_at: string;
  analysis?: ApiAdAnalysis;
  
  // New fields based on AdCreate model
  meta?: ApiAdMeta;
  targeting?: ApiAdTargeting;
  lead_form?: ApiLeadForm;
  creatives?: ApiCreative[];
  
  // New fields for Ad Sets
  ad_set_id?: number;
  variant_count?: number;
  ad_set_created_at?: string;
  ad_set_first_seen_date?: string;
  ad_set_last_seen_date?: string;
}

export interface PaginationMetadata {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface PaginatedAdsResponse {
  data: ApiAd[];
  pagination: PaginationMetadata;
}

export interface AdFilterParams {
  page?: number;
  page_size?: number;
  competitor_id?: number;
  competitor_name?: string;
  media_type?: string;
  has_analysis?: boolean;
  min_hook_score?: number;
  max_hook_score?: number;
  min_overall_score?: number;
  max_overall_score?: number;
  min_duration_days?: number;
  max_duration_days?: number;
  date_from?: string;
  date_to?: string;
  is_active?: boolean;
  is_favorite?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// API Error handling
export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

// API Client
class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL + API_PREFIX;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Handle network errors
      throw new ApiError(
        0,
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  // Ads API methods
  async getAds(filters?: AdFilterParams): Promise<PaginatedAdsResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedAdsResponse>(`/ads${query}`);
  }
  
  async getAdsInSet(adSetId: number, page: number = 1, pageSize: number = 20): Promise<PaginatedAdsResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedAdsResponse>(`/ad-sets/${adSetId}${query}`);
  }

  async getAdById(id: number): Promise<ApiAd> {
    return this.request<ApiAd>(`/ads/${id}`);
  }

  async getTopPerformingAds(limit: number = 10): Promise<ApiAd[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    return this.request<ApiAd[]>(`/ads/top-performing?${params.toString()}`);
  }

  async searchAds(query: string, limit: number = 50): Promise<ApiAd[]> {
    const params = new URLSearchParams({ q: query, limit: limit.toString() });
    return this.request<ApiAd[]>(`/ads/search?${params.toString()}`);
  }

  async getCompetitorAds(competitorId: number, limit: number = 50): Promise<ApiAd[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    return this.request<ApiAd[]>(`/ads/competitor/${competitorId}?${params.toString()}`);
  }

  async deleteAd(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/ads/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkDeleteAds(ids: number[]): Promise<{ message: string; deleted_count: number; requested_count: number }> {
    return this.request<{ message: string; deleted_count: number; requested_count: number }>(
      `/ads/bulk`,
      {
        method: 'DELETE',
        body: JSON.stringify({ ad_ids: ids }),
      }
    );
  }

  async toggleFavorite(id: number): Promise<{ ad_id: number; is_favorite: boolean; message: string }> {
    return this.request<{ ad_id: number; is_favorite: boolean; message: string }>(
      `/ads/${id}/favorite`,
      {
        method: 'POST',
      }
    );
  }
  
  async toggleAdSetFavorite(adSetId: number): Promise<{ ad_id: number; is_favorite: boolean; message: string }> {
    return this.request<{ ad_id: number; is_favorite: boolean; message: string }>(
      `/ad-sets/${adSetId}/favorite`,
      {
        method: 'POST',
      }
    );
  }

  async refreshMediaFromFacebook(adId: number): Promise<{ success: boolean; ad_id: number; old_media_url?: string; new_media_url?: string; message: string; error?: string }> {
    return this.request<{ success: boolean; ad_id: number; old_media_url?: string; new_media_url?: string; message: string; error?: string }>(
      `/ads/${adId}/refresh-media`,
      {
        method: 'POST',
      }
    );
  }

  async deleteAllAds(): Promise<{ message: string; count: number }> {
    return this.request<{ message: string; count: number }>(
      `/ads/all`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmation: true
        })
      }
    );
  }

  async getCompetitors(skip: number = 0, limit: number = 100, isActive?: boolean): Promise<ApiCompetitor[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    
    if (isActive !== undefined) {
      params.append('is_active', isActive.toString());
    }

    return this.request<ApiCompetitor[]>(`/competitors?${params.toString()}`);
  }

  async getCompetitor(id: number): Promise<ApiCompetitor> {
    return this.request<ApiCompetitor>(`/competitors/${id}`);
  }

  async getAllAdSets(page: number = 1, pageSize: number = 20, sortBy: string = "created_at", sortOrder: string = "desc"): Promise<PaginatedAdsResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    params.append('sort_by', sortBy);
    params.append('sort_order', sortOrder);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedAdsResponse>(`/ad-sets${query}`);
  }
}

// Create and export API client instance
export const apiClient = new ApiClient();

// Ads API wrapper for backwards compatibility
export const adsApi = {
  getAds: (filters?: AdFilterParams) => apiClient.getAds(filters),
  getAdById: (id: number) => apiClient.getAdById(id),
  deleteAd: (id: number) => apiClient.deleteAd(id),
  bulkDeleteAds: (ids: number[]) => apiClient.bulkDeleteAds(ids),
  deleteAllAds: () => apiClient.deleteAllAds(),
  toggleFavorite: (id: number) => apiClient.toggleFavorite(id),
  toggleAdSetFavorite: (adSetId: number) => apiClient.toggleAdSetFavorite(adSetId),
  refreshMediaFromFacebook: (adId: number) => apiClient.refreshMediaFromFacebook(adId),
  getTopPerformingAds: (limit?: number) => apiClient.getTopPerformingAds(limit),
  searchAds: (query: string, limit?: number) => apiClient.searchAds(query, limit),
  getCompetitorAds: (competitorId: number, limit?: number) => apiClient.getCompetitorAds(competitorId, limit),
  getCompetitors: (skip?: number, limit?: number, isActive?: boolean) => apiClient.getCompetitors(skip, limit, isActive),
  getCompetitor: (id: number) => apiClient.getCompetitor(id),
  getAdsInSet: (adSetId: number, page?: number, pageSize?: number) => apiClient.getAdsInSet(adSetId, page, pageSize),
  getAllAdSets: (page?: number, pageSize?: number, sortBy?: string, sortOrder?: string) => apiClient.getAllAdSets(page, pageSize, sortBy, sortOrder),
};

export default apiClient;

// ========================================
// Competitor API Functions
// ========================================

export interface Competitor {
  id: number;
  name: string;
  page_id: string;
  is_active: boolean;
  ads_count: number;
  created_at: string;
  updated_at: string;
}

export interface CompetitorDetail extends Competitor {
  active_ads_count: number;
  analyzed_ads_count: number;
}

export interface CompetitorCreate {
  name: string;
  page_id: string;
  is_active?: boolean;
}

export interface CompetitorUpdate {
  name?: string;
  page_id?: string;
  is_active?: boolean;
}

export interface PaginatedCompetitors {
  data: Competitor[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface CompetitorStats {
  total_competitors: number;
  active_competitors: number;
  inactive_competitors: number;
  competitors_with_ads: number;
  total_ads_across_competitors: number;
  avg_ads_per_competitor: number;
}

export interface CompetitorScrapeRequest {
  countries?: string[];
  max_pages?: number;
  delay_between_requests?: number;
  active_status?: 'active' | 'inactive' | 'all';
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
}

export interface TaskResponse {
  task_id: string;
  status: string;
  message: string;
}

// Get paginated competitors
export async function getCompetitors(params: {
  page?: number;
  page_size?: number;
  is_active?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: string;
}): Promise<PaginatedCompetitors> {
  const query = new URLSearchParams();
  
  if (params.page) query.append('page', params.page.toString());
  if (params.page_size) query.append('page_size', params.page_size.toString());
  if (params.is_active !== undefined) query.append('is_active', params.is_active.toString());
  if (params.search) query.append('search', params.search);
  if (params.sort_by) query.append('sort_by', params.sort_by);
  if (params.sort_order) query.append('sort_order', params.sort_order);

  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/competitors?${query.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch competitors: ${response.statusText}`);
  }

  return response.json();
}

// Get competitor by ID
export async function getCompetitor(competitorId: number): Promise<CompetitorDetail> {
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/competitors/${competitorId}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch competitor: ${response.statusText}`);
  }

  return response.json();
}

// Create new competitor
export async function createCompetitor(competitorData: CompetitorCreate): Promise<Competitor> {
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/competitors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(competitorData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `Failed to create competitor: ${response.statusText}`);
  }

  return response.json();
}

// Update competitor
export async function updateCompetitor(competitorId: number, competitorData: CompetitorUpdate): Promise<CompetitorDetail> {
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/competitors/${competitorId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(competitorData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `Failed to update competitor: ${response.statusText}`);
  }

  return response.json();
}

// Delete competitor
export async function deleteCompetitor(competitorId: number): Promise<{ message: string; soft_delete: boolean }> {
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/competitors/${competitorId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to delete competitor');
  }
  return response.json();
}

export async function bulkDeleteCompetitors(competitorIds: number[]): Promise<{ message: string; soft_deleted_count: number; hard_deleted_count: number; not_found_count: number; }> {
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/competitors/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ competitor_ids: competitorIds }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to bulk delete competitors');
  }
  return response.json();
}

// Get competitor statistics
export async function getCompetitorStats(): Promise<CompetitorStats> {
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/competitors/stats/overview`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch competitor stats: ${response.statusText}`);
  }

  return response.json();
}

// Search competitors
export async function searchCompetitors(query: string, limit: number = 50): Promise<Competitor[]> {
  const searchParams = new URLSearchParams();
  searchParams.append('q', query);
  searchParams.append('limit', limit.toString());

  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/competitors/search/query?${searchParams.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to search competitors: ${response.statusText}`);
  }

  return response.json();
}

// Scrape competitor ads
export async function scrapeCompetitorAds(competitorId: number, scrapeRequest: CompetitorScrapeRequest): Promise<TaskResponse> {
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/competitors/${competitorId}/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(scrapeRequest),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `Failed to start scraping: ${response.statusText}`);
  }

  return response.json();
}

// Get scraping task status
export async function getScrapingStatus(taskId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/competitors/scrape/status/${taskId}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch scraping status: ${response.statusText}`);
  }

  return response.json();
}

// Get competitor ads
export async function getCompetitorAds(competitorId: number, params: {
  page?: number;
  page_size?: number;
  is_active?: boolean;
  has_analysis?: boolean;
}) {
  const query = new URLSearchParams();
  
  if (params.page) query.append('page', params.page.toString());
  if (params.page_size) query.append('page_size', params.page_size.toString());
  if (params.is_active !== undefined) query.append('is_active', params.is_active.toString());
  if (params.has_analysis !== undefined) query.append('has_analysis', params.has_analysis.toString());

  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/competitors/${competitorId}/ads?${query.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch competitor ads: ${response.statusText}`);
  }

  return response.json();
} 