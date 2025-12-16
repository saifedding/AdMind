'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { SearchForm } from '@/components/search/SearchForm';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchStats } from '@/components/search/SearchStats';
import { SearchResults } from '@/components/search/SearchResults';
import { FloatingActionBar } from '@/components/search/FloatingActionBar';
import { useSearchState } from '@/hooks/useSearchState';
import { useSearchActions } from '@/hooks/useSearchActions';
import { COUNTRIES_DATA, POPULAR_COUNTRIES } from '@/constants/searchConstants';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const searchState = useSearchState();
  const lastAutoSearchTimestamp = useRef<string | null>(null);
  const {
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
    handleCountryToggle,
    handleClearFilters,
    handleAdSelection,
    handleSelectAll,
    clearSearchState,
  } = searchState;

  const { handleSearch, handleSaveSelected, handleLoadMore } = useSearchActions({
    setIsSearching,
    setError,
    setSearchResult,
    setSelectedAds,
    setIsSaving,
    setIsLoadingMore,
    setCurrentSearchPage,
  });

  // Handle URL parameters for pre-filling search form and auto-search
  useEffect(() => {
    const query = searchParams.get('q');
    const type = searchParams.get('type');
    const auto = searchParams.get('auto');
    const timestamp = searchParams.get('t');
    
    // Pre-fill form fields
    if (query) {
      if (type === 'keyword' || !type) {
        setSearchType('keyword');
        setKeywordQuery(query);
      } else if (type === 'page') {
        setSearchType('page');
        setPageId(query);
      }
    }
    
    // Auto-trigger search only if we haven't processed this timestamp yet
    if (auto === 'true' && query && timestamp && timestamp !== lastAutoSearchTimestamp.current && !isSearching) {
      lastAutoSearchTimestamp.current = timestamp;
      
      // Clear cached search state to prevent old results from showing
      clearSearchState();
      
      // Small delay to ensure state is cleared and set
      setTimeout(() => {
        if (type === 'page') {
          // Set active status to 'all' to show both active and inactive ads
          setActiveStatus('all');
          handleSearch({
            searchType: 'page',
            keywordQuery: '',
            pageId: query,
            selectedCountries: [],
            activeStatus: 'all',
            mediaType: 'all',
            maxPages: 15, // Get more results for page searches (15 pages * 30 ads = 450 ads max)
            minDurationDays: undefined,
          });
        } else {
          handleSearch({
            searchType: 'keyword',
            keywordQuery: query,
            pageId: '',
            selectedCountries: [],
            activeStatus: 'all',
            mediaType: 'all',
            maxPages: 15,
            minDurationDays: undefined,
          });
        }
      }, 300);
    }
  }, [searchParams]); // Only searchParams dependency to prevent loops

  const onSearch = () => {
    setCurrentSearchPage(maxPages); // Track the initial pages loaded
    handleSearch({
      searchType,
      keywordQuery,
      pageId,
      selectedCountries,
      activeStatus,
      mediaType,
      maxPages,
      minDurationDays,
    });
  };

  const onSaveSelected = () => {
    handleSaveSelected(
      {
        searchType,
        keywordQuery,
        pageId,
        selectedCountries,
        activeStatus,
        mediaType,
        maxPages,
        minDurationDays,
      },
      selectedAds,
      searchResult
    );
  };

  const onSelectAll = () => {
    if (searchResult) {
      setSelectedAds(new Set(searchResult.ads_preview.map(ad => ad.ad_archive_id)));
    }
  };

  const onLoadMore = () => {
    if (searchResult) {
      handleLoadMore({
        searchType,
        keywordQuery,
        pageId,
        selectedCountries,
        activeStatus,
        mediaType,
        maxPages: currentSearchPage, // Use current page as base
        minDurationDays,
      }, searchResult, currentSearchPage);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Search className="h-8 w-8 text-photon-400" />
              Ad Library Search
            </h1>
            <p className="text-muted-foreground">
              Search Facebook Ad Library by keywords or Page ID. Preview ads before saving to your database.
              {searchResult && (
                <span className="ml-2 text-photon-400">
                  • Found {searchResult.ads_preview.length} ads • {searchResult.pages_scraped} pages scraped
                </span>
              )}
            </p>
          </div>
          
          {searchResult && (
            <div className="flex items-center gap-2">
              <button
                onClick={clearSearchState}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-md border border-border hover:border-primary/50"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Search Status Display */}
        {(() => {
          const auto = searchParams.get('auto');
          const type = searchParams.get('type');
          const query = searchParams.get('q');
          
          // Show for auto searches (page searches)
          if (auto === 'true' && type === 'page' && query && (isSearching || searchResult)) {
            return (
              <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="animate-pulse">🔍</div>
                  <p className="text-blue-400 font-semibold text-base">
                    Searching ads from Facebook Page: <span className="text-white font-mono">{query}</span>
                  </p>
                </div>
                <p className="text-blue-300/90 text-sm mb-3">
                  Showing all ads (active & inactive) from this advertiser's Facebook page. Cache cleared for fresh results.
                </p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 rounded-full font-medium">
                    Status: <span className="text-blue-300">All</span>
                  </span>
                  <span className="bg-purple-500/20 border border-purple-500/30 px-3 py-1.5 rounded-full font-medium">
                    Media: <span className="text-purple-300">All Types</span>
                  </span>
                  <span className="bg-green-500/20 border border-green-500/30 px-3 py-1.5 rounded-full font-medium">
                    Pages: <span className="text-green-300">{maxPages}</span>
                  </span>
                  {searchResult && (
                    <span className="bg-orange-500/20 border border-orange-500/30 px-3 py-1.5 rounded-full font-medium">
                      Found: <span className="text-orange-300">{searchResult.ads_preview.length} ads</span>
                    </span>
                  )}
                </div>
              </div>
            );
          }
          
          // Show for regular searches when searching
          if (isSearching && !auto) {
            return (
              <div className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="animate-spin">🔍</div>
                  <p className="text-yellow-400 font-semibold text-base">
                    {searchType === 'page' ? (
                      <>Searching ads from Facebook Page: <span className="text-white font-mono">{pageId}</span></>
                    ) : (
                      <>Searching ads for: <span className="text-white font-mono">"{keywordQuery}"</span></>
                    )}
                  </p>
                </div>
                <p className="text-yellow-300/90 text-sm mb-3">
                  {searchType === 'page' 
                    ? "Fetching all ads from this advertiser's Facebook page..."
                    : "Searching Facebook Ad Library for matching advertisements..."
                  }
                </p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="bg-yellow-500/20 border border-yellow-500/30 px-3 py-1.5 rounded-full font-medium">
                    Status: <span className="text-yellow-300">{activeStatus === 'all' ? 'All' : activeStatus === 'active' ? 'Active' : 'Inactive'}</span>
                  </span>
                  <span className="bg-orange-500/20 border border-orange-500/30 px-3 py-1.5 rounded-full font-medium">
                    Media: <span className="text-orange-300">{mediaType === 'all' ? 'All Types' : mediaType}</span>
                  </span>
                  <span className="bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded-full font-medium">
                    Pages: <span className="text-red-300">{maxPages}</span>
                  </span>
                  {selectedCountries.length > 0 && (
                    <span className="bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 rounded-full font-medium">
                      Countries: <span className="text-blue-300">{selectedCountries.length}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          }
          
          return null;
        })()}

        {/* Restored Results Notification */}
        {searchResult && !isSearching && !searchParams.get('auto') && (() => {
          try {
            const savedState = localStorage.getItem('searchState');
            if (savedState) {
              const parsed = JSON.parse(savedState);
              const savedAt = parsed.savedAt ? new Date(parsed.savedAt) : null;
              const timeAgo = savedAt ? 
                Math.round((Date.now() - savedAt.getTime()) / 1000 / 60) : null; // minutes ago
              
              return (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
                  <p className="text-blue-400 font-medium">
                    ✓ Search results restored from cache
                    {timeAgo !== null && timeAgo < 60 && (
                      <span className="ml-2 text-blue-300/80 text-xs">
                        ({timeAgo === 0 ? 'just now' : `${timeAgo}m ago`})
                      </span>
                    )}
                  </p>
                  <p className="text-blue-300/80 text-xs mt-1">
                    Your previous search results are preserved. You can continue browsing or start a new search.
                  </p>
                </div>
              );
            }
          } catch (e) {
            return null;
          }
          return null;
        })()}

        {/* Search Form */}
        <SearchForm
          searchType={searchType}
          keywordQuery={keywordQuery}
          pageId={pageId}
          isSearching={isSearching}
          onSearchTypeChange={setSearchType}
          onKeywordQueryChange={setKeywordQuery}
          onPageIdChange={setPageId}
          onSearch={onSearch}
        />

        {/* Search Filters */}
        <SearchFilters
          selectedCountries={selectedCountries}
          activeStatus={activeStatus}
          mediaType={mediaType}
          maxPages={maxPages}
          minDurationDays={minDurationDays}
          onCountryToggle={handleCountryToggle}
          onActiveStatusChange={setActiveStatus}
          onMediaTypeChange={setMediaType}
          onMaxPagesChange={setMaxPages}
          onMinDurationDaysChange={setMinDurationDays}
          onClearFilters={handleClearFilters}
          countriesData={COUNTRIES_DATA}
          popularCountries={POPULAR_COUNTRIES}
        />

        {/* Search Stats */}
        {searchResult && (
          <SearchStats
            searchResult={searchResult}
            selectedAdsCount={selectedAds.size}
          />
        )}

        {/* Search Results */}
        {searchResult && (
          <SearchResults
            searchResult={searchResult}
            selectedAds={selectedAds}
            onAdSelection={handleAdSelection}
            onLoadMore={onLoadMore}
            isLoadingMore={isLoadingMore}
          />
        )}

        {/* Floating Action Bar */}
        <FloatingActionBar
          selectedAdsCount={selectedAds.size}
          isSaving={isSaving}
          onSelectAll={onSelectAll}
          onSaveSelected={onSaveSelected}
        />

        {/* Error Display */}
        {error && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4">
            <div className="bg-error/10 border border-error/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-error">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Search Error</span>
              </div>
              <p className="text-error/80 mt-2 text-sm">{error}</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}