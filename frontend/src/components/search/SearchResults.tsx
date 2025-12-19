'use client';

import { Search, ArrowUpDown } from 'lucide-react';
import { SearchAdCard } from './SearchAdCard';

interface SearchResult {
  success: boolean;
  search_type: string;
  query: string;
  countries: string[];
  total_ads_found: number;
  total_ads_saved: number;
  total_unique_ads?: number;
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
    variant_count?: number;
    variants?: Array<{
      ad_archive_id: string;
      duration_days?: number;
      is_active: boolean;
    }>;
  }>;
  message: string;
  search_time: string;
  next_cursor?: string | null;
  has_next_page?: boolean;
}

interface SearchResultsProps {
  searchResult: SearchResult;
  selectedAds: Set<string>;
  onAdSelection: (adId: string, selected: boolean) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export function SearchResults({ searchResult, selectedAds, onAdSelection, onLoadMore, isLoadingMore }: SearchResultsProps) {
  return (
    <section className="flex flex-col gap-4 mb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold font-display bg-gradient-to-r from-photon-400 via-photon-600 to-photon-400 bg-clip-text text-transparent bg-200% animate-gradient-xy">
            Search Results
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-green-500/20 border border-green-500/30 px-2 py-1 rounded-full text-green-400 font-medium">
              ✓ {searchResult.ads_preview.length} unique ads
            </span>
            {searchResult.total_unique_ads && searchResult.total_ads_found > searchResult.total_unique_ads && (
              <span className="bg-orange-500/20 border border-orange-500/30 px-2 py-1 rounded-full text-orange-400 font-medium" title="Duplicates removed">
                🔗 {searchResult.total_ads_found - searchResult.total_unique_ads} variants hidden
              </span>
            )}
            <span className="bg-blue-500/20 border border-blue-500/30 px-2 py-1 rounded-full text-blue-400 font-medium">
              📄 {searchResult.pages_scraped} pages
            </span>
            <span className="bg-purple-500/20 border border-purple-500/30 px-2 py-1 rounded-full text-purple-400 font-medium">
              👥 {searchResult.stats.competitors_processed} advertisers
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-iridium-300">Sort by:</span>
          <button className="text-sm font-medium text-foreground flex items-center gap-1 hover:text-primary transition-colors">
            Newest First <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Masonry Grid */}
      {searchResult.ads_preview.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {searchResult.ads_preview.map((ad) => (
            <SearchAdCard
              key={ad.ad_archive_id}
              ad={ad}
              isSelected={selectedAds.has(ad.ad_archive_id)}
              onSelectionChange={onAdSelection}
            />
          ))}
        </div>
      )}

      {searchResult.ads_preview.length === 0 && (
        <div className="text-center py-8">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Ads Found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search parameters or using different keywords.
          </p>
        </div>
      )}

      {onLoadMore && searchResult.ads_preview.length > 0 && searchResult.has_next_page && (
        <div className="flex flex-col items-center gap-3 mt-8">
          <button 
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="flex items-center justify-center px-6 py-3 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 hover:border-primary/50 text-foreground font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoadingMore ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                Loading More Ads...
              </>
            ) : (
              <>
                <span>Load More Results</span>
                <span className="ml-2 text-xs text-primary">(+3 pages)</span>
              </>
            )}
          </button>
          <p className="text-xs text-muted-foreground">
            Showing {searchResult.ads_preview.length} unique ads • More available
          </p>
        </div>
      )}
      
      {/* Show "No more results" message when there are no more pages */}
      {searchResult.ads_preview.length > 0 && !searchResult.has_next_page && (
        <div className="flex flex-col items-center gap-2 mt-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-px w-12 bg-border"></div>
            <span>End of results</span>
            <div className="h-px w-12 bg-border"></div>
          </div>
          <p className="text-xs text-muted-foreground">
            Showing all {searchResult.ads_preview.length} unique ads
          </p>
        </div>
      )}
    </section>
  );
}