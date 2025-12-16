'use client';

import { adsApi } from '@/lib/api';

interface SearchParams {
  searchType: 'keyword' | 'page';
  keywordQuery: string;
  pageId: string;
  selectedCountries: string[];
  activeStatus: string;
  mediaType: string;
  maxPages: number;
  minDurationDays: number | undefined;
}

interface SearchActions {
  setIsSearching: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchResult: (result: any) => void;
  setSelectedAds: (ads: Set<string>) => void;
  setIsSaving: (saving: boolean) => void;
  setIsLoadingMore: (loading: boolean) => void;
  setCurrentSearchPage: (page: number) => void;
}

export function useSearchActions(actions: SearchActions) {
  const { setIsSearching, setError, setSearchResult, setSelectedAds, setIsSaving, setIsLoadingMore, setCurrentSearchPage } = actions;

  const handleSearch = async (params: SearchParams) => {
    const { searchType, keywordQuery, pageId, selectedCountries, activeStatus, mediaType, maxPages, minDurationDays } = params;
    
    if (searchType === 'keyword' && !keywordQuery.trim()) {
      setError('Please enter a keyword to search');
      return;
    }
    
    if (searchType === 'page' && !pageId.trim()) {
      setError('Please enter a Facebook page ID');
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchResult(null);
    setSelectedAds(new Set());
    setCurrentSearchPage(params.maxPages);

    try {
      const searchRequest = {
        query_string: searchType === 'keyword' ? keywordQuery.trim() : undefined,
        page_id: searchType === 'page' ? pageId.trim() : undefined,
        countries: selectedCountries.length > 0 ? selectedCountries : ['all'],
        active_status: activeStatus,
        media_type: mediaType,
        max_pages: maxPages,
        save_to_database: false, // Always preview first
        min_duration_days: minDurationDays,
      };

      console.log('Searching with request:', searchRequest);
      
      const result = await adsApi.searchAdLibrary(searchRequest);
      console.log('Search result:', result);
      
      // Cache the search result in localStorage and sessionStorage for persistence
      try {
        localStorage.setItem('searchResults', JSON.stringify(result));
        
        // Also maintain a history of recent searches in sessionStorage
        const recentSearches = JSON.parse(sessionStorage.getItem('recentSearchResults') || '[]');
        recentSearches.unshift(result);
        // Keep only the last 5 searches
        if (recentSearches.length > 5) {
          recentSearches.splice(5);
        }
        sessionStorage.setItem('recentSearchResults', JSON.stringify(recentSearches));
      } catch (cacheError) {
        console.warn('Failed to cache search results:', cacheError);
      }
      
      setSearchResult(result);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveSelected = async (params: SearchParams, selectedAds: Set<string>, searchResult: any) => {
    const { searchType, keywordQuery, pageId, selectedCountries, activeStatus, mediaType, maxPages, minDurationDays } = params;
    
    if (selectedAds.size === 0) {
      setError('Please select at least one ad to save');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const searchParams = {
        query_string: searchType === 'keyword' ? keywordQuery.trim() : undefined,
        page_id: searchType === 'page' ? pageId.trim() : undefined,
        countries: selectedCountries.length > 0 ? selectedCountries : ['all'],
        active_status: activeStatus,
        media_type: mediaType,
        max_pages: maxPages,
        save_to_database: true,
        min_duration_days: minDurationDays,
      };

      const saveRequest = {
        ad_archive_ids: Array.from(selectedAds),
        search_params: searchParams,
      };

      const result = await adsApi.saveSelectedAds(saveRequest);
      
      // Update the search result to show saved count
      if (searchResult) {
        setSearchResult({
          ...searchResult,
          total_ads_saved: searchResult.total_ads_saved + result.total_saved
        });
      }

      setSelectedAds(new Set());
      alert(`Successfully saved ${result.total_saved} out of ${result.total_requested} ads to database!`);
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save ads. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadMore = async (params: SearchParams, currentResult: any, currentPage: number) => {
    setIsLoadingMore(true);
    setError(null);

    try {
      // Use cursor-based pagination instead of increasing max_pages
      const searchRequest = {
        query_string: params.searchType === 'keyword' ? params.keywordQuery.trim() : undefined,
        page_id: params.searchType === 'page' ? params.pageId.trim() : undefined,
        countries: params.selectedCountries.length > 0 ? params.selectedCountries : ['all'],
        active_status: params.activeStatus,
        media_type: params.mediaType,
        max_pages: 1, // Only load 1 more page at a time
        save_to_database: false,
        min_duration_days: params.minDurationDays,
        // cursor: currentResult.next_cursor, // Use cursor from previous result (not implemented yet)
      };

      console.log('Loading more results:', searchRequest);
      
      const result = await adsApi.searchAdLibrary(searchRequest);
      console.log('Load more result:', result);
      
      if (result.ads_preview && result.ads_preview.length > 0) {
        // Filter out any duplicate ads (just in case)
        const existingAdIds = new Set(currentResult.ads_preview.map((ad: any) => ad.ad_archive_id));
        const newAds = result.ads_preview.filter((ad: any) => !existingAdIds.has(ad.ad_archive_id));
        
        if (newAds.length > 0) {
          // Merge new results with existing ones
          const mergedResult = {
            ...currentResult,
            ads_preview: [...currentResult.ads_preview, ...newAds],
            pages_scraped: currentResult.pages_scraped + result.pages_scraped,
            // next_cursor: result.next_cursor, // Update cursor for next load (not implemented yet)
            // has_next_page: result.has_next_page, // Track if more pages available (not implemented yet)
            message: `${currentResult.ads_preview.length + newAds.length} ads loaded across ${currentResult.pages_scraped + result.pages_scraped} pages`
          };
          
          setSearchResult(mergedResult);
          setCurrentSearchPage(currentPage + 1);
        } else {
          // No new ads found (all were duplicates)
          setError('No more new results available');
        }
      } else {
        // No new results
        setError('No more results available');
      }
    } catch (err: any) {
      console.error('Load more error:', err);
      setError(err.message || 'Failed to load more results. Please try again.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  return {
    handleSearch,
    handleSaveSelected,
    handleLoadMore,
  };
}