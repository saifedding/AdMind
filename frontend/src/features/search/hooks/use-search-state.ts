import { useState, useEffect } from 'react';
import { SearchResult, SearchType, ActiveStatus, MediaType } from '../types';
import { searchStorage } from '@/lib/search-storage';

const SESSION_KEY = 'currentSearchId'; // Only store ID in sessionStorage

export function useSearchState() {
  // Search form state
  const [searchType, setSearchType] = useState<SearchType>('keyword');
  const [keywordQuery, setKeywordQuery] = useState('');
  const [pageId, setPageId] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [activeStatus, setActiveStatus] = useState<ActiveStatus>('all');
  const [mediaType, setMediaType] = useState<MediaType>('all');
  const [maxPages, setMaxPages] = useState(3);
  const [minDurationDays, setMinDurationDays] = useState<number | undefined>(undefined);

  // Search results state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAds, setSelectedAds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentSearchPage, setCurrentSearchPage] = useState(3);

  // Load state from IndexedDB on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        // Try to get the latest search result from IndexedDB
        const latest = await searchStorage.getLatestSearchResult();
        if (latest) {
          setSearchResult(latest.result);
          setSearchType(latest.searchType);
          if (latest.searchType === 'keyword') {
            setKeywordQuery(latest.query);
          } else {
            setPageId(latest.query);
          }
          setSelectedCountries(latest.countries);
          setActiveStatus(latest.activeStatus as ActiveStatus);
          setMediaType(latest.mediaType as MediaType);
        }
      } catch (e) {
        console.error('Failed to load search state:', e);
      }
    };
    loadState();
  }, []);

  // Save state to IndexedDB whenever search result changes
  useEffect(() => {
    if (searchResult) {
      const saveState = async () => {
        try {
          const query = searchType === 'page' ? pageId : keywordQuery;
          await searchStorage.saveSearchResult(
            searchType,
            query,
            selectedCountries,
            activeStatus,
            mediaType,
            searchResult
          );
        } catch (e) {
          console.error('Failed to save search state:', e);
        }
      };
      saveState();
    }
  }, [searchResult]);

  const handleCountryToggle = (countryCode: string) => {
    setSelectedCountries(prev =>
      prev.includes(countryCode)
        ? prev.filter(c => c !== countryCode)
        : [...prev, countryCode]
    );
  };

  const handleClearFilters = () => {
    setSelectedCountries([]);
    setActiveStatus('all');
    setMediaType('all');
    setMaxPages(3);
    setMinDurationDays(undefined);
  };

  const handleAdSelection = (adId: string) => {
    setSelectedAds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(adId)) {
        newSet.delete(adId);
      } else {
        newSet.add(adId);
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
    setSearchResult(null);
    setSelectedAds(new Set());
    setError(null);
    setCurrentSearchPage(3);
    // IndexedDB data will auto-expire after 7 days
  };

  return {
    // Form state
    searchType,
    setSearchType,
    keywordQuery,
    setKeywordQuery,
    pageId,
    setPageId,
    selectedCountries,
    activeStatus,
    setActiveStatus,
    mediaType,
    setMediaType,
    maxPages,
    setMaxPages,
    minDurationDays,
    setMinDurationDays,

    // Results state
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

    // Actions
    handleCountryToggle,
    handleClearFilters,
    handleAdSelection,
    handleSelectAll,
    clearSearchState,
  };
}
