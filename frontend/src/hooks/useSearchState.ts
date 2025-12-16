'use client';

import { useState, useEffect } from 'react';

interface SearchResult {
  success: boolean;
  search_type: string;
  query: string;
  countries: string[];
  total_ads_found: number;
  total_ads_saved: number;
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
  ads_preview: Array<{
    ad_archive_id: string;
    advertiser: string;
    media_type: string;
    is_active: boolean;
    start_date?: string;
    duration_days?: number;
    creatives_count: number;
    has_targeting: boolean;
    has_lead_form: boolean;
    creatives?: any[];
    targeting?: any;
    lead_form?: any;
    meta?: any;
  }>;
  message: string;
  search_time: string;
}

// Helper functions for localStorage persistence
const saveSearchState = (state: any) => {
  try {
    const stateToSave = {
      searchType: state.searchType,
      keywordQuery: state.keywordQuery,
      pageId: state.pageId,
      selectedCountries: state.selectedCountries,
      activeStatus: state.activeStatus,
      mediaType: state.mediaType,
      maxPages: state.maxPages,
      minDurationDays: state.minDurationDays,
      searchResult: state.searchResult,
      selectedAds: Array.from(state.selectedAds), // Convert Set to Array for JSON
      currentSearchPage: state.currentSearchPage,
      hasMoreResults: state.hasMoreResults,
      savedAt: new Date().toISOString(), // Add timestamp
    };
    localStorage.setItem('searchState', JSON.stringify(stateToSave));
  } catch (error) {
    console.warn('Failed to save search state:', error);
  }
};

const loadSearchState = () => {
  try {
    const saved = localStorage.getItem('searchState');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        selectedAds: new Set(parsed.selectedAds || []), // Convert Array back to Set
      };
    }
  } catch (error) {
    console.warn('Failed to load search state:', error);
  }
  return null;
};

export function useSearchState() {
  // Initialize state with saved values or defaults
  const savedState = loadSearchState();
  
  const [searchType, setSearchType] = useState<'keyword' | 'page'>(savedState?.searchType || 'keyword');
  const [keywordQuery, setKeywordQuery] = useState(savedState?.keywordQuery || '');
  const [pageId, setPageId] = useState(savedState?.pageId || '');
  const [selectedCountries, setSelectedCountries] = useState<string[]>(savedState?.selectedCountries || []);
  const [activeStatus, setActiveStatus] = useState(savedState?.activeStatus || 'active');
  const [mediaType, setMediaType] = useState(savedState?.mediaType || 'all');
  const [maxPages, setMaxPages] = useState(savedState?.maxPages || 1);
  const [minDurationDays, setMinDurationDays] = useState<number | undefined>(savedState?.minDurationDays || undefined);
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(savedState?.searchResult || null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAds, setSelectedAds] = useState<Set<string>>(savedState?.selectedAds || new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentSearchPage, setCurrentSearchPage] = useState(savedState?.currentSearchPage || 1);
  const [hasMoreResults, setHasMoreResults] = useState(savedState?.hasMoreResults ?? true);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const currentState = {
      searchType,
      keywordQuery,
      pageId,
      selectedCountries,
      activeStatus,
      mediaType,
      maxPages,
      minDurationDays,
      searchResult,
      selectedAds,
      currentSearchPage,
      hasMoreResults,
    };
    saveSearchState(currentState);
  }, [
    searchType,
    keywordQuery,
    pageId,
    selectedCountries,
    activeStatus,
    mediaType,
    maxPages,
    minDurationDays,
    searchResult,
    selectedAds,
    currentSearchPage,
    hasMoreResults,
  ]);

  const handleCountryToggle = (countryCode: string) => {
    setSelectedCountries(prev => 
      prev.includes(countryCode)
        ? prev.filter(c => c !== countryCode)
        : [...prev, countryCode]
    );
  };

  const handleClearFilters = () => {
    setSelectedCountries([]);
    setActiveStatus('active');
    setMediaType('all');
    setMaxPages(1);
    setMinDurationDays(undefined);
  };

  const handleAdSelection = (adId: string, selected: boolean) => {
    setSelectedAds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(adId);
      } else {
        newSet.delete(adId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (searchResult) {
      setSelectedAds(new Set(searchResult.ads_preview.map(ad => ad.ad_archive_id)));
    }
  };

  const clearSearchState = () => {
    try {
      localStorage.removeItem('searchState');
      localStorage.removeItem('searchResults');
      sessionStorage.removeItem('recentSearchResults');
    } catch (error) {
      console.warn('Failed to clear search state:', error);
    }
    
    // Reset all state to defaults
    setSearchType('keyword');
    setKeywordQuery('');
    setPageId('');
    setSelectedCountries([]);
    setActiveStatus('active');
    setMediaType('all');
    setMaxPages(1);
    setMinDurationDays(undefined);
    setSearchResult(null);
    setSelectedAds(new Set());
    setError(null);
    setCurrentSearchPage(1);
    setHasMoreResults(true);
  };

  return {
    // Search form state
    searchType,
    setSearchType,
    keywordQuery,
    setKeywordQuery,
    pageId,
    setPageId,
    
    // Filter state
    selectedCountries,
    setSelectedCountries,
    activeStatus,
    setActiveStatus,
    mediaType,
    setMediaType,
    maxPages,
    setMaxPages,
    minDurationDays,
    setMinDurationDays,
    
    // Search state
    isSearching,
    setIsSearching,
    searchResult,
    setSearchResult,
    error,
    setError,
    selectedAds,
    setSelectedAds,
    isSaving,
    setIsSaving,
    isLoadingMore,
    setIsLoadingMore,
    currentSearchPage,
    setCurrentSearchPage,
    hasMoreResults,
    setHasMoreResults,
    
    // Handlers
    handleCountryToggle,
    handleClearFilters,
    handleAdSelection,
    handleSelectAll,
    clearSearchState,
  };
}