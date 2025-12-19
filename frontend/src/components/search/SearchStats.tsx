'use client';

interface SearchResult {
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
  ads_preview: Array<any>;
  message: string;
  search_time: string;
}

interface SearchStatsProps {
  searchResult: SearchResult;
  selectedAdsCount: number;
}

export function SearchStats({ searchResult, selectedAdsCount }: SearchStatsProps) {
  // Calculate media type breakdown
  const mediaBreakdown = searchResult.ads_preview.reduce((acc, ad) => {
    const type = ad.media_type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate active vs inactive
  const activeAds = searchResult.ads_preview.filter(ad => ad.is_active).length;
  const inactiveAds = searchResult.ads_preview.length - activeAds;

  return (
    <section className="space-y-4">
      {/* Search Summary */}
      <div className="bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-blue-400">Search Results Summary</h3>
          <span className="text-xs text-blue-300/80">
            {searchResult.search_type === 'page' ? 'Page Search' : 'Keyword Search'}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
          <div>
            <p className="text-muted-foreground">Query</p>
            <p className="text-foreground font-mono truncate">{searchResult.query}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Countries</p>
            <p className="text-foreground">{searchResult.countries.length > 0 ? searchResult.countries.join(', ') : 'All'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Search Time</p>
            <p className="text-foreground">{searchResult.search_time}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="text-foreground">
              {activeAds > 0 && inactiveAds > 0 ? 'Mixed' : activeAds > 0 ? 'Active' : 'Inactive'}
            </p>
          </div>
          {searchResult.total_unique_ads && searchResult.total_ads_found > searchResult.total_unique_ads && (
            <div>
              <p className="text-muted-foreground">Deduplication</p>
              <p className="text-foreground">
                {searchResult.total_ads_found - searchResult.total_unique_ads} variants hidden
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex flex-col gap-1 rounded-lg p-5 border border-border bg-card-background">
          <p className="text-iridium-300 text-sm font-medium font-body">Unique Ads</p>
          <div className="flex items-end gap-2">
            <p className="text-foreground text-2xl font-bold leading-none font-display">{searchResult.ads_preview.length}</p>
            <span className="text-blue-400 text-xs font-bold mb-0.5">
              {Object.keys(mediaBreakdown).length} types
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {activeAds} active • {inactiveAds} inactive
            {searchResult.total_unique_ads && searchResult.total_ads_found > searchResult.total_unique_ads && (
              <span className="text-cyan-400"> • {searchResult.total_ads_found - searchResult.total_unique_ads} duplicates removed</span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-1 rounded-lg p-5 border border-border bg-card-background">
          <p className="text-iridium-300 text-sm font-medium font-body">Pages Scraped</p>
          <div className="flex items-end gap-2">
            <p className="text-foreground text-2xl font-bold leading-none font-display">{searchResult.pages_scraped}</p>
            <span className="text-green-400 text-xs font-bold mb-0.5">
              {Math.round(searchResult.ads_preview.length / searchResult.pages_scraped)} avg/page
            </span>
          </div>
        </div>
        
        <div className="flex flex-col gap-1 rounded-lg p-5 border border-border bg-card-background">
          <p className="text-iridium-300 text-sm font-medium font-body">Advertisers</p>
          <div className="flex items-end gap-2">
            <p className="text-foreground text-2xl font-bold leading-none font-display">{searchResult.stats.competitors_processed}</p>
            <span className="text-purple-400 text-xs font-bold mb-0.5">unique</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-1 rounded-lg p-5 border border-border bg-card-background">
          <p className="text-iridium-300 text-sm font-medium font-body">Selection</p>
          <div className="flex items-end gap-2">
            <p className="text-foreground text-2xl font-bold leading-none font-display">
              {selectedAdsCount} <span className="text-sm font-normal text-iridium-400">/ {searchResult.ads_preview.length}</span>
            </p>
            <span className="text-orange-400 text-xs font-bold mb-0.5">
              {Math.round((selectedAdsCount / searchResult.ads_preview.length) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Media Type Breakdown */}
      {Object.keys(mediaBreakdown).length > 1 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Media breakdown:</span>
          {Object.entries(mediaBreakdown).map(([type, count]) => (
            <span key={type} className="bg-muted/50 px-2 py-1 rounded-full">
              {type}: {count}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}