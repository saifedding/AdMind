// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const API_PREFIX = '/api/v1';

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

export interface AnalysisHistoryItem {
  id: number;
  version_number: number;
  is_current: boolean;
  created_at: string;
  summary?: string;
}

export interface AnalysisHistoryResponse {
  ad_id: number;
  total_count: number;
  current_version?: number;
  analyses: AnalysisHistoryItem[];
}

export interface DownloadHistoryItem {
  id: number;
  ad_id?: number;
  ad_archive_id: string;
  title?: string;
  video_hd_count: number;
  video_sd_count: number;
  image_count: number;
  video_hd_urls?: string[];
  video_sd_urls?: string[];
  video_urls?: string[];
  image_urls?: string[];
  media?: any[];
  save_path?: string;
  created_at: string;
  // Related data counts
  analysis_count?: number;
  prompt_count?: number;
  veo_video_count?: number;
  merge_count?: number;
}

export interface DownloadHistoryResponse {
  total: number;
  page: number;
  page_size: number;
  items: DownloadHistoryItem[];
}

export interface CreateDownloadHistoryRequest {
  ad_id?: number;
  ad_archive_id: string;
  title?: string;
  video_hd_urls?: string[];
  video_sd_urls?: string[];
  video_urls?: string[];
  image_urls?: string[];
  media?: any[];
  save_path?: string;
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

// Favorites Types
export interface ApiFavoriteList {
  id: number;
  name: string;
  description?: string;
  user_id: number;
  color?: string;
  icon?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  item_count: number;
}

export interface ApiFavoriteItem {
  id: number;
  list_id: number;
  ad_id: number;
  notes?: string;
  created_at: string;
  ad?: ApiAd;
}

export interface ApiFavoriteListWithItems extends ApiFavoriteList {
  items: ApiFavoriteItem[];
}

export interface CreateListRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_default?: boolean;
}

export interface UpdateListRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  is_default?: boolean;
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

      if (response.status === 204 || response.status === 205) {
        return undefined as unknown as T;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        return (text ? JSON.parse(text) : undefined) as unknown as T;
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

  async saveAdContent(adId: number): Promise<{ success: boolean; ad_id: number; is_saved: boolean; saved_at: string; message: string; content: any }> {
    return this.request<{ success: boolean; ad_id: number; is_saved: boolean; saved_at: string; message: string; content: any }>(
      `/ads/${adId}/save`,
      {
        method: 'POST',
      }
    );
  }

  async unsaveAdContent(adId: number): Promise<{ success: boolean; ad_id: number; is_saved: boolean; message: string; deleted: any }> {
    return this.request<{ success: boolean; ad_id: number; is_saved: boolean; message: string; deleted: any }>(
      `/ads/${adId}/unsave`,
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

  async refreshAllFavorites(): Promise<{ success: boolean; total: number; successful: number; failed: number; message: string; details: any[] }> {
    return this.request<{ success: boolean; total: number; successful: number; failed: number; message: string; details: any[] }>(
      `/ads/favorites/refresh-all`,
      {
        method: 'POST',
      }
    );
  }

  async refreshAdSetMedia(adSetId: number): Promise<{ success: boolean; total: number; successful: number; failed: number; message: string; details: any[] }> {
    return this.request<{ success: boolean; total: number; successful: number; failed: number; message: string; details: any[] }>(
      `/ad-sets/${adSetId}/refresh-media`,
      {
        method: 'POST',
      }
    );
  }

  async deleteAllAds(): Promise<{ message: string; deleted_count: number }> {
    return this.request<{ message: string; deleted_count: number }>(
      `/ads/all`,
      {
        method: 'DELETE'
      }
    );
  }

  async deleteAdAnalysis(adId: number): Promise<{ success: boolean; ad_id: number; message: string }> {
    return this.request<{ success: boolean; ad_id: number; message: string }>(`/ads/${adId}/analysis`, {
      method: 'DELETE',
    });
  }

  async getAdAnalysis(adId: number): Promise<AnalyzeVideoResponse> {
    return this.request<AnalyzeVideoResponse>(`/ads/${adId}/analysis`);
  }

  async getAdAnalysisHistory(adId: number): Promise<AnalysisHistoryResponse> {
    return this.request<AnalysisHistoryResponse>(`/ads/${adId}/analysis/history`);
  }

  async getAdAnalysisByVersion(adId: number, version: number): Promise<AnalyzeVideoResponse> {
    return this.request<AnalyzeVideoResponse>(`/ads/${adId}/analysis/version/${version}`);
  }

  async followupAdAnalysis(adId: number, data: FollowupQuestionRequest): Promise<FollowupAnswerResponse> {
    return this.request<FollowupAnswerResponse>(`/ads/${adId}/analysis/followup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async regenerateAdAnalysis(adId: number, data: RegenerateAnalysisRequest): Promise<AnalyzeVideoResponse> {
    return this.request<AnalyzeVideoResponse>(`/ads/${adId}/analysis/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async clearAdCache(adId: number, versionNumber?: number): Promise<{ success: boolean; cache_deleted: boolean; chat_history_cleared: boolean; message: string }> {
    const url = versionNumber
      ? `/ads/${adId}/cache?version_number=${versionNumber}`
      : `/ads/${adId}/cache`;
    return this.request<{ success: boolean; cache_deleted: boolean; chat_history_cleared: boolean; message: string }>(url, {
      method: 'DELETE',
    });
  }

  async createDownloadHistory(data: CreateDownloadHistoryRequest): Promise<DownloadHistoryItem> {
    return this.request<DownloadHistoryItem>('/download-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async getDownloadHistory(page: number = 1, pageSize: number = 20): Promise<DownloadHistoryResponse> {
    return this.request<DownloadHistoryResponse>(`/download-history?page=${page}&page_size=${pageSize}`);
  }

  async deleteDownloadHistory(historyId: number): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/download-history/${historyId}`, {
      method: 'DELETE',
    });
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

  // Favorites API methods
  async getFavoriteLists(): Promise<{ lists: ApiFavoriteList[]; total: number }> {
    return this.request<{ lists: ApiFavoriteList[]; total: number }>('/favorites/lists');
  }

  async getFavoriteList(listId: number): Promise<ApiFavoriteListWithItems> {
    return this.request<ApiFavoriteListWithItems>(`/favorites/lists/${listId}`);
  }

  async createFavoriteList(data: CreateListRequest): Promise<ApiFavoriteList> {
    return this.request<ApiFavoriteList>('/favorites/lists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFavoriteList(listId: number, data: UpdateListRequest): Promise<ApiFavoriteList> {
    return this.request<ApiFavoriteList>(`/favorites/lists/${listId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFavoriteList(listId: number): Promise<void> {
    return this.request<void>(`/favorites/lists/${listId}`, {
      method: 'DELETE',
    });
  }

  async addAdToFavoriteList(listId: number, adId: number, notes?: string): Promise<ApiFavoriteItem> {
    return this.request<ApiFavoriteItem>('/favorites/items', {
      method: 'POST',
      body: JSON.stringify({ list_id: listId, ad_id: adId, notes }),
    });
  }

  async removeAdFromFavoriteList(listId: number, adId: number): Promise<void> {
    return this.request<void>('/favorites/items', {
      method: 'DELETE',
      body: JSON.stringify({ list_id: listId, ad_id: adId }),
    });
  }

  async getAdFavoriteLists(adId: number): Promise<{ list_ids: number[] }> {
    return this.request<{ list_ids: number[] }>(`/favorites/ads/${adId}/lists`);
  }

  async getAllFavoritesWithAds(): Promise<{ lists: ApiFavoriteListWithItems[]; total_lists: number }> {
    return this.request<{ lists: ApiFavoriteListWithItems[]; total_lists: number }>('/favorites/all');
  }

  async ensureDefaultFavoriteList(): Promise<ApiFavoriteList> {
    return this.request<ApiFavoriteList>('/favorites/ensure-default', {
      method: 'POST',
    });
  }

  async downloadFromAdLibrary(data: DownloadFromLibraryRequest): Promise<DownloadFromLibraryResponse> {
    return this.request<DownloadFromLibraryResponse>(
      `/ads/library/download`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // Analyze video via Google Gemini
  async analyzeVideoFromLibrary(data: AnalyzeVideoRequest): Promise<AnalyzeVideoResponse> {
    return this.request<AnalyzeVideoResponse>(
      `/ads/library/analyze-video`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // Generate Veo video from prompt using backend Veo integration (DEPRECATED - use async version)
  async generateVeoVideo(data: {
    prompt: string;
    aspect_ratio?: string;
    video_model_key?: string;
    seed?: number;
    timeout_sec?: number;
    poll_interval_sec?: number;
  }): Promise<VeoGenerateResponse> {
    return this.request<VeoGenerateResponse>(
      `/settings/ai/veo/generate-video`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // Generate Veo video asynchronously - returns task_id immediately
  async generateVeoVideoAsync(data: {
    prompt: string;
    aspect_ratio?: string;
    video_model_key?: string;
    seed?: number;
    ad_id?: number;
    timeout_sec?: number;
    poll_interval_sec?: number;
  }): Promise<VeoGenerateAsyncResponse> {
    return this.request<VeoGenerateAsyncResponse>(
      `/settings/ai/veo/generate-video-async`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // Poll for video generation task status
  async getVeoTaskStatus(task_id: string): Promise<VeoTaskStatusResponse> {
    return this.request<VeoTaskStatusResponse>(
      `/settings/ai/veo/tasks/${task_id}/status`,
      {
        method: 'GET',
      }
    );
  }

  // Fetch Veo credits (remaining tokens) and user paygate tier
  async getVeoCredits(): Promise<VeoCredits> {
    return this.request<VeoCredits>(
      `/settings/ai/veo/credits`,
      {
        method: 'GET',
      }
    );
  }

  // Fetch available Veo video models
  async getVeoModels(): Promise<VeoModelsResponse> {
    return this.request<VeoModelsResponse>(
      `/settings/ai/veo/models`,
      {
        method: 'GET',
      }
    );
  }

  // Save a Veo generation with its prompt and settings
  async saveVeoGeneration(data: VeoGenerationCreate): Promise<VeoGenerationResponse> {
    return this.request<VeoGenerationResponse>(
      `/settings/ai/veo/generations`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // Get Veo generations, optionally filtered by ad_id
  async getVeoGenerations(ad_id?: number, include_archived: boolean = false): Promise<VeoGenerationResponse[]> {
    const params = new URLSearchParams();
    if (ad_id) params.append('ad_id', ad_id.toString());
    if (include_archived) params.append('include_archived', 'true');
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request<VeoGenerationResponse[]>(
      `/settings/ai/veo/generations${queryString}`,
      {
        method: 'GET',
      }
    );
  }

  // Merge multiple Veo video clips into one full video
  async mergeVeoVideos(data: MergeVideosRequest): Promise<MergeVideosResponse> {
    return this.request<MergeVideosResponse>(
      `/settings/ai/veo/merge-videos`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // Get merged video history
  async getMergedVideos(ad_id?: number): Promise<MergedVideoResponse[]> {
    const params = ad_id ? `?ad_id=${ad_id}` : '';
    return this.request<MergedVideoResponse[]>(
      `/settings/ai/veo/merged-videos${params}`,
      {
        method: 'GET',
      }
    );
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
  deleteAdAnalysis: (adId: number) => apiClient.deleteAdAnalysis(adId),
  getAdAnalysis: (adId: number) => apiClient.getAdAnalysis(adId),
  getAdAnalysisHistory: (adId: number) => apiClient.getAdAnalysisHistory(adId),
  getAdAnalysisByVersion: (adId: number, version: number) => apiClient.getAdAnalysisByVersion(adId, version),
  followupAdAnalysis: (adId: number, data: FollowupQuestionRequest) => apiClient.followupAdAnalysis(adId, data),
  regenerateAdAnalysis: (adId: number, data: RegenerateAnalysisRequest) => apiClient.regenerateAdAnalysis(adId, data),
  clearAdCache: (adId: number, versionNumber?: number) => apiClient.clearAdCache(adId, versionNumber),
  createDownloadHistory: (data: CreateDownloadHistoryRequest) => apiClient.createDownloadHistory(data),
  getDownloadHistory: (page?: number, pageSize?: number) => apiClient.getDownloadHistory(page, pageSize),
  deleteDownloadHistory: (historyId: number) => apiClient.deleteDownloadHistory(historyId),
  toggleFavorite: (id: number) => apiClient.toggleFavorite(id),
  toggleAdSetFavorite: (adSetId: number) => apiClient.toggleAdSetFavorite(adSetId),
  saveAdContent: (adId: number) => apiClient.saveAdContent(adId),
  unsaveAdContent: (adId: number) => apiClient.unsaveAdContent(adId),
  refreshMediaFromFacebook: (adId: number) => apiClient.refreshMediaFromFacebook(adId),
  refreshAllFavorites: () => apiClient.refreshAllFavorites(),
  refreshAdSetMedia: (adSetId: number) => apiClient.refreshAdSetMedia(adSetId),
  getTopPerformingAds: (limit?: number) => apiClient.getTopPerformingAds(limit),
  searchAds: (query: string, limit?: number) => apiClient.searchAds(query, limit),
  getCompetitorAds: (competitorId: number, limit?: number) => apiClient.getCompetitorAds(competitorId, limit),
  getCompetitors: (skip?: number, limit?: number, isActive?: boolean) => apiClient.getCompetitors(skip, limit, isActive),
  getCompetitor: (id: number) => apiClient.getCompetitor(id),
  getAdsInSet: (adSetId: number, page?: number, pageSize?: number) => apiClient.getAdsInSet(adSetId, page, pageSize),
  getAllAdSets: (page?: number, pageSize?: number, sortBy?: string, sortOrder?: string) => apiClient.getAllAdSets(page, pageSize, sortBy, sortOrder),

  // Favorites API
  getFavoriteLists: () => apiClient.getFavoriteLists(),
  getFavoriteList: (listId: number) => apiClient.getFavoriteList(listId),
  createFavoriteList: (data: CreateListRequest) => apiClient.createFavoriteList(data),
  updateFavoriteList: (listId: number, data: UpdateListRequest) => apiClient.updateFavoriteList(listId, data),
  deleteFavoriteList: (listId: number) => apiClient.deleteFavoriteList(listId),
  addAdToFavoriteList: (listId: number, adId: number, notes?: string) => apiClient.addAdToFavoriteList(listId, adId, notes),
  removeAdFromFavoriteList: (listId: number, adId: number) => apiClient.removeAdFromFavoriteList(listId, adId),
  getAdFavoriteLists: (adId: number) => apiClient.getAdFavoriteLists(adId),
  getAllFavoritesWithAds: () => apiClient.getAllFavoritesWithAds(),
  ensureDefaultFavoriteList: () => apiClient.ensureDefaultFavoriteList(),
  downloadFromAdLibrary: (data: DownloadFromLibraryRequest) => apiClient.downloadFromAdLibrary(data),
  analyzeVideoFromLibrary: (data: AnalyzeVideoRequest) => apiClient.analyzeVideoFromLibrary(data),
  generateVeoVideo: (data: { prompt: string; aspect_ratio?: string; video_model_key?: string; seed?: number; timeout_sec?: number; poll_interval_sec?: number }) => apiClient.generateVeoVideo(data),
  generateVeoVideoAsync: (data: { prompt: string; aspect_ratio?: string; video_model_key?: string; seed?: number; ad_id?: number; timeout_sec?: number; poll_interval_sec?: number }) => apiClient.generateVeoVideoAsync(data),
  getVeoTaskStatus: (task_id: string) => apiClient.getVeoTaskStatus(task_id),
  getVeoCredits: () => apiClient.getVeoCredits(),
  getVeoModels: () => apiClient.getVeoModels(),
  saveVeoGeneration: (data: VeoGenerationCreate) => apiClient.saveVeoGeneration(data),
  getVeoGenerations: (ad_id?: number, include_archived?: boolean) => apiClient.getVeoGenerations(ad_id, include_archived),
  mergeVeoVideos: (data: MergeVideosRequest) => apiClient.mergeVeoVideos(data),
  getMergedVideos: (ad_id?: number) => apiClient.getMergedVideos(ad_id),

  // Video Style Analyzer API
  analyzeVideoStyle: async (data: { video_url: string; style_name: string; description?: string }) => {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo/analyze-video-style`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to analyze video style');
    return response.json();
  },

  getStyleLibrary: async () => {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo/style-library`);
    if (!response.ok) throw new Error('Failed to fetch style library');
    return response.json();
  },

  deleteStyleTemplate: async (templateId: number) => {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo/style-library/${templateId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete style template');
    return response.json();
  },

  // Veo Session API - NEW
  createVeoSession: async (data: VeoSessionCreate) => {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create Veo session');
    return response.json() as Promise<VeoSessionResponse>;
  },

  listVeoSessions: async (skip: number = 0, limit: number = 20) => {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo/sessions?skip=${skip}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to list Veo sessions');
    return response.json() as Promise<VeoSessionResponse[]>;
  },

  getVeoSession: async (sessionId: number) => {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo/sessions/${sessionId}`);
    if (!response.ok) throw new Error('Failed to get Veo session');
    return response.json() as Promise<VeoSessionResponse>;
  },

  deleteVeoSession: async (sessionId: number) => {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete Veo session');
    return response.json();
  },

  saveVideoToSegment: async (segmentId: number, videoData: {
    video_url: string;
    prompt_used: string;
    model_key: string;
    aspect_ratio: string;
    seed?: number;
    generation_time_seconds?: number;
  }) => {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo/segments/${segmentId}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(videoData),
    });
    if (!response.ok) throw new Error('Failed to save video to segment');
    return response.json();
  },

  updateSegmentPrompt: async (segmentId: number, currentPrompt: string) => {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo/segments/${segmentId}/prompt`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_prompt: currentPrompt }),
    });
    if (!response.ok) throw new Error('Failed to update segment prompt');
    return response.json() as Promise<VeoSegmentResponse>;
  },

  getSegmentVideos: async (segmentId: number) => {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo/segments/${segmentId}/videos`);
    if (!response.ok) throw new Error('Failed to get segment videos');
    return response.json() as Promise<VeoVideoResponse[]>;
  },
};

export default apiClient;

// Types for Download from Library
export type DownloadFromLibraryRequest = {
  ad_library_url?: string;
  ad_archive_id?: string;
  media_type?: 'video' | 'image' | 'all';
  download?: boolean;
};

export type DownloadedFileInfo = {
  url: string;
  local_path?: string;
  public_url?: string;
  file_size?: number;
};

export type MediaItem = {
  type: 'video' | 'image';
  url: string;
  quality?: string;
};

export type DownloadFromLibraryResponse = {
  success: boolean;
  ad_archive_id: string;
  page_id?: string;
  ad_id?: number;
  video_urls: string[];
  image_urls: string[];
  video_hd_urls: string[];
  video_sd_urls: string[];
  downloaded: DownloadedFileInfo[];
  media: MediaItem[];
  save_path?: string;
  message: string;
};

// Types for Analyze Video
export type AnalyzeVideoRequest = {
  ad_library_url?: string;
  ad_archive_id?: string;
  video_url?: string;
  prefer_hd?: boolean;
  cache?: boolean;
  ad_id?: number;
  persist?: boolean;
};

export type AnalyzeBeat = {
  start?: string;
  end?: string;
  summary: string;
  why_it_works?: string;
};

export type TokenUsage = {
  provider?: string;
  model?: string;
  prompt_tokens?: number;
  cached_prompt_tokens?: number;
  non_cached_prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export type CostInfo = {
  currency: string;
  total: number;
  details?: Record<string, number>;
};

export type AnalyzeVideoResponse = {
  success: boolean;
  used_video_url: string;
  transcript?: string;
  beats?: AnalyzeBeat[];
  summary?: string;
  text_on_video?: string;
  voice_over?: string;
  storyboard?: string[];
  generation_prompts?: string[];
  strengths?: string[];
  recommendations?: string[];
  raw?: any;
  message: string;
  generated_at?: string;
  source?: string;
  token_usage?: TokenUsage;
  cost?: CostInfo;
};

// Follow-up analysis chat
export type FollowupQuestionRequest = {
  question: string;
  version_number?: number;
};

export type FollowupAnswerResponse = {
  success: boolean;
  answer: string;
  raw?: any;
  generated_at?: string;
  source?: string;
};

// Regenerate analysis with custom instruction
export type RegenerateAnalysisRequest = {
  instruction: string;
  version_number?: number;
};

export type VeoGenerateResponse = {
  success: boolean;
  result?: any;
  error?: string;
  video_url?: string | null;
};

export type VeoGenerateAsyncResponse = {
  success: boolean;
  task_id: string;
  message: string;
  estimated_time_seconds?: number;
};

export type VeoTaskStatusResponse = {
  task_id: string;
  state: 'PENDING' | 'PROGRESS' | 'SUCCESS' | 'FAILURE';
  status?: string;
  progress?: number;
  result?: {
    task_id: string;
    success: boolean;
    video_url: string;
    generation_id?: number;
    generation_time: number;
    result: any;
    prompt: string;
    model_key: string;
    aspect_ratio: string;
    seed: number;
    timestamp: string;
  };
  error?: string;
};

export type VeoCredits = {
  credits: number;
  userPaygateTier: string;
};

export type VeoModel = {
  key: string;
  supportedAspectRatios: string[];
  accessType: string;
  capabilities: string[];
  videoLengthSeconds: number;
  videoGenerationTimeSeconds?: number;
  displayName: string;
  creditCost?: number;
  framesPerSecond: number;
  paygateTier: string;
  modelAccessInfo: Record<string, any>;
  modelMetadata: Record<string, any>;
  modelStatus?: string;
};

export type VeoModelsResponse = {
  result: {
    data: {
      json: {
        result: {
          videoModels: VeoModel[];
        };
        status: number;
        statusText: string;
      };
    };
  };
};

export type VeoGenerationCreate = {
  ad_id?: number;
  prompt: string;
  video_url: string;
  model_key: string;
  aspect_ratio: string;
  seed?: number;
  generation_metadata?: Record<string, any>;
};

export type VeoGenerationResponse = {
  id: number;
  ad_id?: number;
  prompt: string;
  prompt_hash?: string;
  version_number: number;
  is_current: number;
  video_url: string;
  model_key: string;
  aspect_ratio: string;
  seed?: number;
  generation_metadata?: Record<string, any>;
  created_at: string;
};

// Veo Session Types
export type VeoSessionCreate = {
  script: string;
  styles: string[];
  character?: Record<string, any>;
  model?: string;
  aspect_ratio?: string;
  video_model_key?: string;
  style_template_id?: number;
  custom_instruction?: string;
};

export type VeoVideoResponse = {
  id: number;
  prompt_used: string;
  video_url: string;
  model_key: string;
  aspect_ratio: string;
  seed?: number;
  generation_time_seconds?: number;
  created_at: string;
};

export type VeoSegmentResponse = {
  id: number;
  segment_index: number;
  original_prompt: string;
  current_prompt: string;
  videos: VeoVideoResponse[];
};

export type VeoBriefResponse = {
  id: number;
  style_id: string;
  style_name: string;
  segments: VeoSegmentResponse[];
};

export type VeoSessionResponse = {
  id: number;
  script: string;
  selected_styles: string[];
  character_preset_id?: string;
  gemini_model: string;
  aspect_ratio: string;
  video_model_key: string;
  created_at: string;
  briefs: VeoBriefResponse[];
};

export type MergeVideosRequest = {
  video_urls: string[];
  ad_id?: number;
  output_filename?: string;
  trim_times?: Array<{ startTime: number; endTime: number }>;
};

export type MergeVideosResponse = {
  success: boolean;
  merge_id?: number;
  output_path?: string;
  public_url?: string;
  system_path?: string; // Added for development preview
  file_size?: number;
  video_count?: number;
  error?: string;
  message: string;
};

export type MergedVideoResponse = {
  id: number;
  ad_id?: number;
  video_url: string;
  file_size?: number;
  clip_count: number;
  source_clips: string[];
  created_at: string;
};

// Video Style Analyzer Types
export type VideoStyleTemplate = {
  id: number;
  name: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  style_characteristics: Record<string, any>;
  usage_count: number;
  created_at: string;
};

export type VideoStyleLibraryResponse = {
  success: boolean;
  templates: VideoStyleTemplate[];
  error?: string;
};

export type VideoStyleAnalyzeResponse = {
  success: boolean;
  template?: VideoStyleTemplate;
  error?: string;
};

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

export async function clearCompetitorAds(competitorId: number): Promise<{ message: string; deleted_count: number }> {
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/competitors/${competitorId}/ads`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to clear competitor ads');
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

// Image Generation Types

export interface GeneratedImage {
  name: string;
  workflowId: string;
  image: {
    generatedImage: {
      encodedImage: string;
    };
  };
}

export interface ImageGenerateRequest {
  prompt: string;
  aspect_ratio?: 'IMAGE_ASPECT_RATIO_PORTRAIT' | 'IMAGE_ASPECT_RATIO_LANDSCAPE' | 'IMAGE_ASPECT_RATIO_SQUARE';
  image_model_name?: string;
  num_images?: number;
  input_image_base64?: string;
  reference_media_id?: string;
  project_id?: string;
}

export interface ImageGenerateResponse {
  success: boolean;
  images?: any[];
  prompt?: string;
  model?: string;
  aspect_ratio?: string;
  error?: string;
}

export interface SavedImageItem {
  id: number;
  media_id: string;
  name?: string;
  prompt?: string;
  model?: string;
  aspect_ratio?: string;
  encoded_image?: string;
  fife_url?: string;
  created_at?: string;
}

export interface SaveImageRequest {
  media_id: string;
  name?: string;
  prompt?: string;
  model?: string;
  aspect_ratio?: string;
  encoded_image?: string;
  fife_url?: string;
}

// Image Generation API Methods

export async function generateImages(request: ImageGenerateRequest): Promise<ImageGenerateResponse> {
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/imagen/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `Failed to generate images: ${response.statusText}`);
  }

  return response.json();
}

export async function listSavedImages(limit = 50): Promise<SavedImageItem[]> {
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/images/saved?limit=${limit}`, {
    method: 'GET',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `Failed to fetch saved images: ${response.statusText}`);
  }
  return response.json();
}

export async function saveImage(request: SaveImageRequest): Promise<SavedImageItem> {
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/images/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `Failed to save image: ${response.statusText}`);
  }
  return response.json();
}

// Image-to-Video Generation API Types and Methods

export interface ImageUploadRequest {
  image_base64: string;
  aspect_ratio?: 'IMAGE_ASPECT_RATIO_PORTRAIT' | 'IMAGE_ASPECT_RATIO_LANDSCAPE' | 'IMAGE_ASPECT_RATIO_SQUARE';
}

export interface ImageUploadResponse {
  success: boolean;
  media_id?: string;
  width?: number;
  height?: number;
  error?: string;
}

export interface VideoFromImagesRequest {
  start_image_media_id: string;
  end_image_media_id: string;
  prompt: string;
  aspect_ratio?: 'VIDEO_ASPECT_RATIO_PORTRAIT' | 'VIDEO_ASPECT_RATIO_LANDSCAPE' | 'VIDEO_ASPECT_RATIO_SQUARE';
  video_model_key?: string;
  seed?: number;
  timeout_sec?: number;
  poll_interval_sec?: number;
}

export interface VideoFromImagesResponse {
  success: boolean;
  video_url?: string;
  media_generation_id?: string;
  seed?: number;
  prompt?: string;
  aspect_ratio?: string;
  model?: string;
  generation_time_seconds?: number;
  serving_base_uri?: string;
  is_looped?: boolean;
  error?: string;
}

export async function uploadImageForVideo(request: ImageUploadRequest): Promise<ImageUploadResponse> {
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo/upload-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `Failed to upload image: ${response.statusText}`);
  }

  return response.json();
}

export async function generateVideoFromImages(request: VideoFromImagesRequest): Promise<VideoFromImagesResponse> {
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo/generate-from-images`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `Failed to generate video from images: ${response.statusText}`);
  }

  return response.json();
}
