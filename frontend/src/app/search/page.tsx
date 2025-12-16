'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Globe, 
  Building2, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Plus
} from 'lucide-react';
import { adsApi } from '@/lib/api';
import { AdCard } from '@/features/dashboard/components/AdCard';

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

const COUNTRIES = [
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
];

const MEDIA_TYPES = [
  { value: 'all', label: 'All Media Types' },
  { value: 'video', label: 'Video Only' },
  { value: 'image', label: 'Image Only' },
];

const AD_STATUS = [
  { value: 'active', label: 'Active Ads' },
  { value: 'inactive', label: 'Inactive Ads' },
  { value: 'all', label: 'All Ads' },
];

export default function SearchPage() {
  const [searchType, setSearchType] = useState<'keyword' | 'page'>('keyword');
  const [keywordQuery, setKeywordQuery] = useState('');
  const [pageId, setPageId] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['AE']);
  const [activeStatus, setActiveStatus] = useState('active');
  const [mediaType, setMediaType] = useState('all');
  const [maxPages, setMaxPages] = useState(3);
  const [minDurationDays, setMinDurationDays] = useState<number | undefined>(undefined);
  const [saveToDatabase] = useState(false); // Default to false for preview
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAds, setSelectedAds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const handleCountryToggle = (countryCode: string) => {
    setSelectedCountries(prev => 
      prev.includes(countryCode)
        ? prev.filter(c => c !== countryCode)
        : [...prev, countryCode]
    );
  };

  const handleSearch = async () => {
    if (searchType === 'keyword' && !keywordQuery.trim()) {
      setError('Please enter a keyword to search');
      return;
    }
    
    if (searchType === 'page' && !pageId.trim()) {
      setError('Please enter a Facebook page ID');
      return;
    }
    
    if (selectedCountries.length === 0) {
      setError('Please select at least one country');
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchResult(null);
    setSelectedAds(new Set());

    try {
      const searchRequest = {
        query_string: searchType === 'keyword' ? keywordQuery.trim() : undefined,
        page_id: searchType === 'page' ? pageId.trim() : undefined,
        countries: selectedCountries,
        active_status: activeStatus,
        media_type: mediaType,
        max_pages: maxPages,
        save_to_database: saveToDatabase,
        min_duration_days: minDurationDays,
      };

      console.log('Searching with request:', searchRequest);
      
      const result = await adsApi.searchAdLibrary(searchRequest);
      console.log('Search result:', result);
      
      setSearchResult(result);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
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

  const handleSaveSelected = async () => {
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
        countries: selectedCountries,
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



  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Search className="h-8 w-8 text-photon-400" />
              Meta Ad Library Search
            </h1>
            <p className="text-muted-foreground">
              Search Facebook's Ad Library directly by keyword or page to discover new ads and competitors
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Search Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Search Parameters</CardTitle>
                <CardDescription>
                  Configure your search to find ads from Meta's Ad Library
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search Type */}
                <div className="space-y-3">
                  <Label>Search Type</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="keyword-search"
                        checked={searchType === 'keyword'}
                        onCheckedChange={() => setSearchType('keyword')}
                      />
                      <Label htmlFor="keyword-search" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Keyword Search
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="page-search"
                        checked={searchType === 'page'}
                        onCheckedChange={() => setSearchType('page')}
                      />
                      <Label htmlFor="page-search" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Page Search
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Search Query */}
                {searchType === 'keyword' ? (
                  <div className="space-y-2">
                    <Label htmlFor="keyword">Keyword</Label>
                    <Input
                      id="keyword"
                      placeholder="e.g., real estate, fitness, fashion..."
                      value={keywordQuery}
                      onChange={(e) => setKeywordQuery(e.target.value)}
                      disabled={isSearching}
                    />
                    <p className="text-sm text-muted-foreground">
                      Search for ads containing this keyword across all advertisers
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="page-id">Facebook Page ID</Label>
                    <Input
                      id="page-id"
                      placeholder="e.g., 123456789012345"
                      value={pageId}
                      onChange={(e) => setPageId(e.target.value)}
                      disabled={isSearching}
                    />
                    <p className="text-sm text-muted-foreground">
                      Find all ads from a specific Facebook page
                    </p>
                  </div>
                )}

                {/* Countries */}
                <div className="space-y-3">
                  <Label>Target Countries</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {COUNTRIES.map((country) => (
                      <div key={country.code} className="flex items-center space-x-2">
                        <Checkbox
                          id={country.code}
                          checked={selectedCountries.includes(country.code)}
                          onCheckedChange={() => handleCountryToggle(country.code)}
                          disabled={isSearching}
                        />
                        <Label htmlFor={country.code} className="text-sm">
                          {country.flag} {country.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedCountries.length} countries
                  </p>
                </div>

                {/* Filters */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Ad Status</Label>
                    <Select value={activeStatus} onValueChange={setActiveStatus} disabled={isSearching}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AD_STATUS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Media Type</Label>
                    <Select value={mediaType} onValueChange={setMediaType} disabled={isSearching}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEDIA_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Advanced Options */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Max Pages to Scrape</Label>
                    <Select value={String(maxPages)} onValueChange={(v) => setMaxPages(Number(v))} disabled={isSearching}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 page (~30 ads)</SelectItem>
                        <SelectItem value="2">2 pages (~60 ads)</SelectItem>
                        <SelectItem value="3">3 pages (~90 ads)</SelectItem>
                        <SelectItem value="5">5 pages (~150 ads)</SelectItem>
                        <SelectItem value="10">10 pages (~300 ads)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Min Duration (days)</Label>
                    <Input
                      type="number"
                      placeholder="Optional"
                      value={minDurationDays || ''}
                      onChange={(e) => setMinDurationDays(e.target.value ? Number(e.target.value) : undefined)}
                      disabled={isSearching}
                    />
                  </div>
                </div>

                {/* Search Button */}
                <Button 
                  onClick={handleSearch} 
                  disabled={isSearching}
                  className="w-full"
                  size="lg"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching Meta Ad Library...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search Ad Library
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Search Tips */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Search Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Keyword Search
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Use broad terms like "real estate" or "fitness"</li>
                    <li>• Try brand names or product categories</li>
                    <li>• Search in multiple countries for better coverage</li>
                  </ul>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Page Search
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Find the page ID from Facebook page URL</li>
                    <li>• Get all ads from a specific competitor</li>
                    <li>• Monitor competitor ad strategies</li>
                  </ul>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Best Practices</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Start with 1-3 pages for quick results</li>
                    <li>• Use duration filter to find proven ads</li>
                    <li>• Preview first, then save selected ads</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Example Searches */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Example Searches</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setSearchType('keyword');
                    setKeywordQuery('real estate');
                    setSelectedCountries(['AE', 'US']);
                  }}
                  disabled={isSearching}
                >
                  Real Estate (AE, US)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setSearchType('keyword');
                    setKeywordQuery('fitness');
                    setSelectedCountries(['US', 'GB']);
                  }}
                  disabled={isSearching}
                >
                  Fitness (US, UK)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setSearchType('keyword');
                    setKeywordQuery('damac');
                    setSelectedCountries(['AE']);
                    setMediaType('video');
                  }}
                  disabled={isSearching}
                >
                  DAMAC Videos (AE)
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-red-500 bg-red-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Search Error</span>
              </div>
              <p className="text-red-300 mt-2">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Search Results */}
        {searchResult && (
          <div className="space-y-6">
            {/* Results Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  Search Results
                </CardTitle>
                <CardDescription>
                  {searchResult.search_type === 'keyword' ? 'Keyword' : 'Page'} search for "{searchResult.query}" 
                  in {searchResult.countries.join(', ')} • {searchResult.search_time}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-photon-400">{searchResult.ads_preview.length}</div>
                    <div className="text-sm text-muted-foreground">Ads Found</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{searchResult.total_ads_saved}</div>
                    <div className="text-sm text-muted-foreground">Saved to DB</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{searchResult.pages_scraped}</div>
                    <div className="text-sm text-muted-foreground">Pages Scraped</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{searchResult.stats.competitors_processed}</div>
                    <div className="text-sm text-muted-foreground">Advertisers</div>
                  </div>
                </div>

                {searchResult.stats.ads_filtered_by_duration && (
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm text-yellow-400">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      {searchResult.stats.ads_filtered_by_duration} ads were filtered out due to duration requirements
                    </p>
                  </div>
                )}

                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">{searchResult.message}</p>
                </div>
              </CardContent>
            </Card>

            {/* Selection Actions */}
            {searchResult.ads_preview.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all"
                        checked={selectedAds.size === searchResult.ads_preview.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAds(new Set(searchResult.ads_preview.map(ad => ad.ad_archive_id)));
                          } else {
                            setSelectedAds(new Set());
                          }
                        }}
                      />
                      <Label htmlFor="select-all" className="text-sm">
                        Select All ({selectedAds.size} of {searchResult.ads_preview.length} selected)
                      </Label>
                    </div>
                    <Button
                      onClick={handleSaveSelected}
                      disabled={selectedAds.size === 0 || isSaving}
                      className="bg-photon-500 hover:bg-photon-600"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Save Selected ({selectedAds.size})
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ads Grid */}
            {searchResult.ads_preview.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {searchResult.ads_preview.map((ad) => {
                  // Transform the preview data to match AdCard expectations
                  const transformedAd = {
                    id: parseInt(ad.ad_archive_id),
                    ad_archive_id: ad.ad_archive_id,
                    competitor_name: ad.advertiser,
                    media_type: ad.media_type,
                    is_active: ad.is_active,
                    start_date: ad.start_date,
                    duration_days: ad.duration_days,
                    creatives: ad.creatives || [],
                    targeting: ad.targeting || null,
                    lead_form: ad.lead_form || null,
                    meta: ad.meta || {},
                    is_favorite: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  };

                  return (
                    <div key={ad.ad_archive_id} className="relative">
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox
                          checked={selectedAds.has(ad.ad_archive_id)}
                          onCheckedChange={(checked) => handleAdSelection(ad.ad_archive_id, checked as boolean)}
                          className="bg-white/90 border-2"
                        />
                      </div>
                      <AdCard
                        ad={transformedAd}
                        isSelected={selectedAds.has(ad.ad_archive_id)}
                        onSelectionChange={(id, selected) => handleAdSelection(ad.ad_archive_id, selected)}
                        showSelection={false} // We handle selection with our own checkbox
                        onSaveToggle={() => {}} // No save toggle for search results
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {searchResult.ads_preview.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Ads Found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search parameters or using different keywords.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}