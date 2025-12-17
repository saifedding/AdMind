'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { adsApi, ApiError, AdFilterParams } from '@/lib/api';
import { AdWithAnalysis } from '@/types/ad';
import { transformAdsWithAnalysisOptimized } from '@/lib/transformers-optimized';
import { AdStatsData, AdViewSettings, AdSelectionState } from '../types';

interface UseAdsReturn {
  ads: AdWithAnalysis[];
  loading: boolean;
  error: string | null;
  stats: AdStatsData;
  filters: AdFilterParams;
  viewSettings: AdViewSettings;
  selectionState: AdSelectionState;
  totalItems: number;
  totalPages: number;
  setFilters: (filters: AdFilterParams) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setGridColumns: (columns: 2 | 3 | 4 | 5) => void;
  handleApplyFilters: (newFilters: AdFilterParams) => void;
  handleResetFilters: () => void;
  handleSearch: (query: string) => void;
  handleRemoveFilter: (key: keyof AdFilterParams) => void;
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (pageSize: number) => void;
  handleAdSelection: (adId: number, selected: boolean) => void;
  handleSelectAll: (selected: boolean) => void;
  handleClearSelection: () => void;
  handleBulkDelete: () => Promise<void>;
  handleSaveToggle: (adIdOrSetId: number, isSaved: boolean) => void;
  handleRefresh: () => void;
}

export function useAds(): UseAdsReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const storageKey = 'adsFilters';

  const parseInitialFilters = useCallback((): AdFilterParams => {
    // If URL has any search params, use them.
    if (searchParams?.toString()) {
      const params: AdFilterParams = {
        page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
        page_size: searchParams.get('page_size') ? Number(searchParams.get('page_size')) : 24,
        sort_by: (searchParams.get('sort_by') as any) || 'created_at',
        sort_order: (searchParams.get('sort_order') as any) || 'desc',
      };
      if (searchParams.get('search')) params.search = searchParams.get('search')!;
      if (searchParams.get('media_type')) params.media_type = searchParams.get('media_type')!;
      if (searchParams.get('is_active')) params.is_active = searchParams.get('is_active') === 'true';
      if (searchParams.get('min_overall_score')) params.min_overall_score = Number(searchParams.get('min_overall_score'));
      if (searchParams.get('max_overall_score')) params.max_overall_score = Number(searchParams.get('max_overall_score'));
      if (searchParams.get('min_hook_score')) params.min_hook_score = Number(searchParams.get('min_hook_score'));
      if (searchParams.get('max_hook_score')) params.max_hook_score = Number(searchParams.get('max_hook_score'));
      if (searchParams.get('min_duration_days')) params.min_duration_days = Number(searchParams.get('min_duration_days'));
      if (searchParams.get('max_duration_days')) params.max_duration_days = Number(searchParams.get('max_duration_days'));
      if (searchParams.get('date_from')) params.date_from = searchParams.get('date_from')!;
      if (searchParams.get('date_to')) params.date_to = searchParams.get('date_to')!;
      if (searchParams.get('competitor_id')) params.competitor_id = Number(searchParams.get('competitor_id'));
      return params;
    }

    // Fallback to sessionStorage if available
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (stored) return JSON.parse(stored) as AdFilterParams;
      } catch (_) {}
    }

    // Default filters
    return {
      page: 1,
      page_size: 24,
      sort_by: 'created_at',
      sort_order: 'desc',
    };
  }, [searchParams]);

  const [ads, setAds] = useState<AdWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState<AdFilterParams>(() => parseInitialFilters());
  const [stats, setStats] = useState<AdStatsData>({
    totalAds: 0,
    highScoreAds: 0,
    avgScore: 0,
    activeAds: 0,
    analyzedAds: 0,
  });

  // View settings
  const [viewSettings, setViewSettings] = useState<AdViewSettings>({
    viewMode: 'grid',
    gridColumns: 4,
  });

  // Selection state
  const [selectionState, setSelectionState] = useState<AdSelectionState>({
    selectedAds: new Set(),
    isDeleting: false,
    deletingAds: new Set(),
  });

  // Create stable filter dependency to prevent infinite re-renders
  const filterDeps = useMemo(() => JSON.stringify(filters), [filters]);

  const fetchAds = useCallback(async () => {
    // Only make API calls on the client side
    if (typeof window === 'undefined') {
      console.log('⚠️ fetchAds called on server side, skipping');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Create a simplified version of filters that should be compatible with the current backend
      const safeFilters: AdFilterParams = {
        page: filters.page,
        page_size: filters.page_size,
        sort_by: filters.sort_by || 'created_at',
        sort_order: filters.sort_order || 'desc',
      };
      
      // Only add these filters if they're defined
      if (filters.search) safeFilters.search = filters.search;
      if (filters.media_type) safeFilters.media_type = filters.media_type;
      if (filters.is_active !== undefined) safeFilters.is_active = filters.is_active;
      if (filters.competitor_id) safeFilters.competitor_id = filters.competitor_id;
      if (filters.min_duration_days !== undefined) safeFilters.min_duration_days = filters.min_duration_days;
      if (filters.max_duration_days !== undefined) safeFilters.max_duration_days = filters.max_duration_days;
      if (filters.min_overall_score !== undefined) safeFilters.min_overall_score = filters.min_overall_score;
      if (filters.max_overall_score !== undefined) safeFilters.max_overall_score = filters.max_overall_score;
      if (filters.min_hook_score !== undefined) safeFilters.min_hook_score = filters.min_hook_score;
      if (filters.max_hook_score !== undefined) safeFilters.max_hook_score = filters.max_hook_score;
      if (filters.date_from) safeFilters.date_from = filters.date_from;
      if (filters.date_to) safeFilters.date_to = filters.date_to;
      
      const response = await adsApi.getAds(safeFilters);
      
      setTotalItems(response.pagination.total_items);
      setTotalPages(response.pagination.total_pages);
      
      const transformedAds = transformAdsWithAnalysisOptimized(response.data);
      setAds(transformedAds);
      
      // Calculate stats
      const highScoreCount = transformedAds.filter(ad => 
        ad.analysis?.overall_score !== undefined && 
        ad.analysis.overall_score > 8).length;
      const activeCount = transformedAds.filter(ad => ad.is_active === true).length;
      const adsWithAnalysis = transformedAds.filter(ad => 
        ad.analysis?.overall_score !== undefined);
      const avgScore = adsWithAnalysis.length > 0 
        ? adsWithAnalysis.reduce((sum, ad) => sum + (ad.analysis?.overall_score || 0), 0) / adsWithAnalysis.length 
        : 0;
      
      setStats({
        totalAds: response.pagination.total_items,
        highScoreAds: highScoreCount,
        avgScore: avgScore,
        activeAds: activeCount,
        analyzedAds: adsWithAnalysis.length,
      });
    } catch (err) {
      console.error('Error fetching ads:', err);
      
      if (err instanceof ApiError) {
        if (err.message.includes('join_entities')) {
          setError('Some filter options are not supported by the current backend version. Please try with fewer filters.');
        } else {
          setError(`API Error: ${err.message}`);
        }
      } else {
        setError('Failed to fetch ads. Please ensure the backend is running.');
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAds();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [filterDeps]);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });

    // Persist to sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(storageKey, JSON.stringify(filters));
    }
  }, [filters, router, pathname]);

  // Clear selection when ads change
  useEffect(() => {
    if (selectionState.selectedAds.size > 0) {
      const currentAdIds = new Set(ads.map(ad => ad.id).filter((id): id is number => id !== undefined));
      const validSelectedAds = new Set(
        Array.from(selectionState.selectedAds).filter(id => currentAdIds.has(id))
      );
      
      if (validSelectedAds.size !== selectionState.selectedAds.size) {
        setSelectionState(prev => ({
          ...prev,
          selectedAds: validSelectedAds
        }));
      }
    }
  }, [ads, selectionState.selectedAds]);

  const handleApplyFilters = useCallback((newFilters: AdFilterParams) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1
    }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      page: 1,
      page_size: 24,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  }, []);

  const handleSearch = useCallback((query: string) => {
    setFilters(prev => ({
      ...prev,
      search: query,
      page: 1
    }));
  }, []);

  const handleRemoveFilter = useCallback((key: keyof AdFilterParams) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return { ...newFilters, page: 1 };
    });
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({
      ...prev,
      page
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setFilters(prev => ({
      ...prev,
      page_size: pageSize,
      page: 1
    }));
  }, []);

  const handleSaveToggle = useCallback((adIdOrSetId: number, isSaved: boolean) => {
    if (filters.is_favorite === true && !isSaved) {
      setAds(prevAds => prevAds.filter(ad => 
        ad.ad_set_id !== adIdOrSetId && ad.id !== adIdOrSetId
      ));
    } else {
      setAds(prevAds => prevAds.map(ad => {
        if (ad.ad_set_id === adIdOrSetId || ad.id === adIdOrSetId) {
          return { ...ad, is_favorite: isSaved };
        }
        return ad;
      }));
    }
  }, [filters.is_favorite]);

  const handleAdSelection = useCallback((adId: number, selected: boolean) => {
    setSelectionState(prev => {
      const newSet = new Set(prev.selectedAds);
      if (selected) {
        newSet.add(adId);
      } else {
        newSet.delete(adId);
      }
      return { ...prev, selectedAds: newSet };
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectionState(prev => ({
        ...prev,
        selectedAds: new Set(ads.map(ad => ad.id).filter((id): id is number => id !== undefined))
      }));
    } else {
      setSelectionState(prev => ({
        ...prev,
        selectedAds: new Set()
      }));
    }
  }, [ads]);

  const handleClearSelection = useCallback(() => {
    setSelectionState(prev => ({
      ...prev,
      selectedAds: new Set()
    }));
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectionState.selectedAds.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectionState.selectedAds.size} ads? This action cannot be undone.`)) {
      return;
    }

    const adIds = Array.from(selectionState.selectedAds);
    
    setSelectionState(prev => ({
      ...prev,
      isDeleting: true,
      deletingAds: new Set(adIds)
    }));
    
    try {
      const result = await adsApi.bulkDeleteAds(adIds);
      
      setSelectionState(prev => ({
        ...prev,
        selectedAds: new Set()
      }));
      
      setAds(prevAds => prevAds.filter(ad => !adIds.includes(ad.id as number)));
      
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchAds();
      
      alert(`Successfully deleted ${result.deleted_count} out of ${result.requested_count} ads`);
    } catch (err) {
      console.error('Error deleting ads:', err);
      alert('Failed to delete ads. Please try again.');
      
      setSelectionState(prev => ({
        ...prev,
        selectedAds: new Set(adIds)
      }));
    } finally {
      setSelectionState(prev => ({
        ...prev,
        isDeleting: false,
        deletingAds: new Set()
      }));
    }
  }, [selectionState.selectedAds, fetchAds]);

  const setViewMode = useCallback((mode: 'grid' | 'list') => {
    setViewSettings(prev => ({ ...prev, viewMode: mode }));
  }, []);

  const setGridColumns = useCallback((columns: 2 | 3 | 4 | 5) => {
    setViewSettings(prev => ({ ...prev, gridColumns: columns }));
  }, []);

  const handleRefresh = useCallback(() => {
    fetchAds();
  }, [fetchAds]);

  return {
    ads,
    loading,
    error,
    stats,
    filters,
    viewSettings,
    selectionState,
    totalItems,
    totalPages,
    setFilters,
    setViewMode,
    setGridColumns,
    handleApplyFilters,
    handleResetFilters,
    handleSearch,
    handleRemoveFilter,
    handlePageChange,
    handlePageSizeChange,
    handleAdSelection,
    handleSelectAll,
    handleClearSelection,
    handleBulkDelete,
    handleSaveToggle,
    handleRefresh,
  };
}