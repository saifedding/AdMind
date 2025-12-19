import { Dispatch, SetStateAction } from 'react';
import { SearchResult, SearchParams } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

interface UseSearchActionsProps {
  setIsSearching: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setSearchResult: Dispatch<SetStateAction<SearchResult | null>>;
  setSelectedAds: Dispatch<SetStateAction<Set<string>>>;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setIsLoadingMore: Dispatch<SetStateAction<boolean>>;
  setCurrentSearchPage: Dispatch<SetStateAction<number>>;
}

export function useSearchActions({
  setIsSearching,
  setError,
  setSearchResult,
  setSelectedAds,
  setIsSaving,
  setIsLoadingMore,
  setCurrentSearchPage,
}: UseSearchActionsProps) {
  
  const handleSearch = async (params: SearchParams) => {
    setIsSearching(true);
    setError(null);
    setSelectedAds(new Set());

    try {
      const payload: any = {
        countries: params.selectedCountries.length > 0 ? params.selectedCountries : ['ALL'],
        active_status: params.activeStatus,
        media_type: params.mediaType,
        max_pages: params.maxPages,
        save_to_database: false, // Preview mode
        min_duration_days: params.minDurationDays,
      };

      if (params.searchType === 'page') {
        payload.page_id = params.pageId;
      } else {
        payload.query_string = params.keywordQuery;
      }

      const response = await fetch(`${API_BASE_URL}${API_PREFIX}/ads/library/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Search failed' }));
        throw new Error(errorData.detail || `Search failed with status ${response.status}`);
      }

      const data: SearchResult = await response.json();
      setSearchResult(data);
      setCurrentSearchPage(params.maxPages);

      // Save to history using IndexedDB
      try {
        const { searchStorage } = await import('@/lib/search-storage');
        await searchStorage.saveSearchResult(
          params.searchType,
          params.searchType === 'page' ? params.pageId : params.keywordQuery,
          params.selectedCountries,
          params.activeStatus,
          params.mediaType,
          data
        );
      } catch (historyError) {
        console.warn('Failed to save search to history:', historyError);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to search ads. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadMore = async (
    params: SearchParams,
    currentResult: SearchResult,
    currentPage: number
  ) => {
    if (!currentResult.has_next_page || !currentResult.next_cursor) {
      return;
    }

    setIsLoadingMore(true);
    setError(null);

    try {
      const payload: any = {
        countries: params.selectedCountries.length > 0 ? params.selectedCountries : ['ALL'],
        active_status: params.activeStatus,
        media_type: params.mediaType,
        max_pages: 3, // Load 3 more pages
        save_to_database: false,
        min_duration_days: params.minDurationDays,
        cursor: currentResult.next_cursor,
      };

      if (params.searchType === 'page') {
        payload.page_id = params.pageId;
      } else {
        payload.query_string = params.keywordQuery;
      }

      const response = await fetch(`${API_BASE_URL}${API_PREFIX}/ads/library/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to load more ads');
      }

      const data: SearchResult = await response.json();

      // Merge new ads with existing ones, avoiding duplicates
      setSearchResult(prev => {
        if (!prev) return data;
        
        // Create a Set of existing ad IDs to avoid duplicates
        const existingIds = new Set(prev.ads_preview.map(ad => ad.ad_archive_id));
        
        // Filter out any duplicate ads from the new data
        const newAds = data.ads_preview.filter(ad => !existingIds.has(ad.ad_archive_id));
        
        return {
          ...data, // Use new data for cursor and has_next_page
          ads_preview: [...prev.ads_preview, ...newAds],
          total_ads_found: prev.total_ads_found + (data.total_ads_found || 0),
          total_unique_ads: (prev.total_unique_ads || prev.ads_preview.length) + newAds.length,
          pages_scraped: prev.pages_scraped + data.pages_scraped,
          stats: {
            ...data.stats,
            total_processed: prev.stats.total_processed + data.stats.total_processed,
            competitors_processed: Math.max(prev.stats.competitors_processed, data.stats.competitors_processed),
          },
        };
      });

      setCurrentSearchPage(currentPage + 3);
    } catch (err: any) {
      console.error('Load more error:', err);
      setError(err.message || 'Failed to load more ads');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSaveSelected = async (
    params: SearchParams,
    selectedAds: Set<string>,
    searchResult: SearchResult | null
  ) => {
    if (selectedAds.size === 0) {
      setError('Please select at least one ad to save');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        ad_archive_ids: Array.from(selectedAds),
        search_params: {
          countries: params.selectedCountries.length > 0 ? params.selectedCountries : ['ALL'],
          active_status: params.activeStatus,
          media_type: params.mediaType,
          max_pages: params.maxPages,
          min_duration_days: params.minDurationDays,
          ...(params.searchType === 'page' 
            ? { page_id: params.pageId }
            : { query_string: params.keywordQuery }
          ),
        },
      };

      const response = await fetch(`${API_BASE_URL}${API_PREFIX}/ads/library/save-selected`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save selected ads');
      }

      const data = await response.json();
      
      // Clear selection after successful save
      setSelectedAds(new Set());
      
      // Show success message (you can add a toast notification here)
      console.log(`Successfully saved ${data.total_saved} ads`);
      
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save ads. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    handleSearch,
    handleLoadMore,
    handleSaveSelected,
  };
}
