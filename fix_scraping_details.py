#!/usr/bin/env python3
"""
Fix for Search Page - Enhanced Ad Details Display

This script creates an enhanced search page that properly displays all the detailed
ad information returned by the Facebook Ad Library search API.

Key improvements:
1. Better display of ad creatives (headlines, body text, media)
2. Show targeting information when available
3. Display lead form details
4. Enhanced ad card layout for search results
5. Proper handling of carousel ads with multiple creatives
6. Better error handling and loading states
"""

import os
import shutil
from pathlib import Path

def create_enhanced_search_components():
    """Create enhanced components for better search result display"""
    
    # Create enhanced AdCard component for search results
    search_ad_card_content = '''import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Play, 
  Image as ImageIcon, 
  Calendar, 
  Target, 
  FileText, 
  ExternalLink,
  Clock,
  Users,
  MapPin
} from 'lucide-react';

interface SearchAdCardProps {
  ad: {
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
  };
  isSelected: boolean;
  onSelectionChange: (adId: string, selected: boolean) => void;
}

export function SearchAdCard({ ad, isSelected, onSelectionChange }: SearchAdCardProps) {
  const primaryCreative = ad.creatives?.[0];
  const mediaUrl = primaryCreative?.media?.[0]?.url;
  
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const getMediaTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'video':
        return <Play className="h-4 w-4" />;
      case 'image':
        return <ImageIcon className="h-4 w-4" />;
      case 'carousel':
        return <ImageIcon className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-gray-700 bg-gray-800/50">
      {/* Selection Checkbox */}
      <div className="absolute top-3 left-3 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectionChange(ad.ad_archive_id, checked as boolean)}
          className="bg-white/90 border-2 shadow-lg"
        />
      </div>

      {/* Media Preview */}
      <div className="relative h-48 bg-gray-900 overflow-hidden">
        {mediaUrl ? (
          ad.media_type === 'video' ? (
            <div className="relative w-full h-full">
              <video
                src={mediaUrl}
                className="w-full h-full object-cover"
                muted
                loop
                onMouseEnter={(e) => e.currentTarget.play()}
                onMouseLeave={(e) => e.currentTarget.pause()}
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Play className="h-12 w-12 text-white/80" />
              </div>
            </div>
          ) : (
            <img
              src={mediaUrl}
              alt={primaryCreative?.headline || 'Ad creative'}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-700">
            {getMediaTypeIcon(ad.media_type)}
            <span className="ml-2 text-gray-400">No media available</span>
          </div>
        )}

        {/* Media Type Badge */}
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="bg-black/60 text-white border-0">
            {getMediaTypeIcon(ad.media_type)}
            <span className="ml-1 capitalize">{ad.media_type}</span>
            {ad.creatives_count > 1 && (
              <span className="ml-1">({ad.creatives_count})</span>
            )}
          </Badge>
        </div>

        {/* Status Badge */}
        <div className="absolute bottom-3 right-3">
          <Badge className={getStatusColor(ad.is_active)}>
            {ad.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="space-y-2">
          {/* Advertiser */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white truncate" title={ad.advertiser}>
              {ad.advertiser}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              onClick={() => window.open(`https://www.facebook.com/ads/library/?id=${ad.ad_archive_id}`, '_blank')}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>

          {/* Headline */}
          {primaryCreative?.headline && (
            <p className="text-sm text-gray-300 line-clamp-2" title={primaryCreative.headline}>
              {primaryCreative.headline}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Ad Body Text */}
        {primaryCreative?.body && (
          <div className="space-y-1">
            <p className="text-xs text-gray-400">Ad Copy:</p>
            <p className="text-sm text-gray-300 line-clamp-3" title={primaryCreative.body}>
              {primaryCreative.body}
            </p>
          </div>
        )}

        {/* CTA */}
        {primaryCreative?.cta?.text && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">
              CTA: {primaryCreative.cta.text}
            </Badge>
          </div>
        )}

        {/* Meta Information */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
          {/* Start Date */}
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(ad.start_date)}</span>
          </div>

          {/* Duration */}
          {ad.duration_days && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{ad.duration_days}d</span>
            </div>
          )}

          {/* Targeting */}
          {ad.has_targeting && (
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              <span>Targeted</span>
            </div>
          )}

          {/* Lead Form */}
          {ad.has_lead_form && (
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>Lead Form</span>
            </div>
          )}
        </div>

        {/* Additional Details for Expanded View */}
        {ad.targeting && Object.keys(ad.targeting).length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-400 hover:text-white">
              Targeting Details
            </summary>
            <div className="mt-2 p-2 bg-gray-900/50 rounded text-gray-300">
              <pre className="whitespace-pre-wrap text-xs">
                {JSON.stringify(ad.targeting, null, 2)}
              </pre>
            </div>
          </details>
        )}

        {/* Lead Form Details */}
        {ad.lead_form && Object.keys(ad.lead_form).length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-400 hover:text-white">
              Lead Form Details
            </summary>
            <div className="mt-2 p-2 bg-gray-900/50 rounded text-gray-300">
              {ad.lead_form.standalone_fields && (
                <div>
                  <p className="font-medium mb-1">Fields:</p>
                  <p>{ad.lead_form.standalone_fields.join(', ')}</p>
                </div>
              )}
              {ad.lead_form.questions && Object.keys(ad.lead_form.questions).length > 0 && (
                <div className="mt-2">
                  <p className="font-medium mb-1">Questions:</p>
                  <pre className="whitespace-pre-wrap text-xs">
                    {JSON.stringify(ad.lead_form.questions, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        {/* All Creatives for Carousel Ads */}
        {ad.creatives && ad.creatives.length > 1 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-400 hover:text-white">
              All Creatives ({ad.creatives.length})
            </summary>
            <div className="mt-2 space-y-2">
              {ad.creatives.map((creative, index) => (
                <div key={index} className="p-2 bg-gray-900/50 rounded">
                  <p className="font-medium text-gray-300 mb-1">Creative {index + 1}</p>
                  {creative.headline && (
                    <p className="text-gray-400 mb-1">
                      <span className="font-medium">Headline:</span> {creative.headline}
                    </p>
                  )}
                  {creative.body && (
                    <p className="text-gray-400 mb-1">
                      <span className="font-medium">Body:</span> {creative.body.substring(0, 100)}...
                    </p>
                  )}
                  {creative.cta?.text && (
                    <p className="text-gray-400">
                      <span className="font-medium">CTA:</span> {creative.cta.text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}'''

    # Write the enhanced search ad card component
    search_components_dir = Path("frontend/src/components/search")
    search_components_dir.mkdir(parents=True, exist_ok=True)
    
    with open(search_components_dir / "SearchAdCard.tsx", "w", encoding="utf-8") as f:
        f.write(search_ad_card_content)

    print("✅ Created enhanced SearchAdCard component")

def create_enhanced_search_page():
    """Create an enhanced search page with better ad details display"""
    
    enhanced_search_page = '''\'use client\';

import { useState } from \'react\';
import { DashboardLayout } from \'@/components/dashboard\';
import { Button } from \'@/components/ui/button\';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from \'@/components/ui/card\';
import { Input } from \'@/components/ui/input\';
import { Label } from \'@/components/ui/label\';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from \'@/components/ui/select\';
import { Checkbox } from \'@/components/ui/checkbox\';
import { Separator } from \'@/components/ui/separator\';
import { Badge } from \'@/components/ui/badge\';
import { 
  Search, 
  Globe, 
  Building2, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Eye,
  Database,
  Clock,
  Users,
  Target,
  FileText
} from \'lucide-react\';
import { adsApi } from \'@/lib/api\';
import { SearchAdCard } from \'@/components/search/SearchAdCard\';

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
    competitors_created: number;
    competitors_updated: number;
    campaigns_processed: number;
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
  { code: \'AE\', name: \'United Arab Emirates\', flag: \'🇦🇪\' },
  { code: \'US\', name: \'United States\', flag: \'🇺🇸\' },
  { code: \'GB\', name: \'United Kingdom\', flag: \'🇬🇧\' },
  { code: \'SA\', name: \'Saudi Arabia\', flag: \'🇸🇦\' },
  { code: \'EG\', name: \'Egypt\', flag: \'🇪🇬\' },
  { code: \'DE\', name: \'Germany\', flag: \'🇩🇪\' },
  { code: \'FR\', name: \'France\', flag: \'🇫🇷\' },
  { code: \'CA\', name: \'Canada\', flag: \'🇨🇦\' },
  { code: \'AU\', name: \'Australia\', flag: \'🇦🇺\' },
];

const MEDIA_TYPES = [
  { value: \'all\', label: \'All Media Types\' },
  { value: \'video\', label: \'Video Only\' },
  { value: \'image\', label: \'Image Only\' },
  { value: \'carousel\', label: \'Carousel Only\' },
];

const AD_STATUS = [
  { value: \'active\', label: \'Active Ads\' },
  { value: \'inactive\', label: \'Inactive Ads\' },
  { value: \'all\', label: \'All Ads\' },
];

export default function SearchPage() {
  const [searchType, setSearchType] = useState<\'keyword\' | \'page\'>(\'keyword\');
  const [keywordQuery, setKeywordQuery] = useState(\'\');
  const [pageId, setPageId] = useState(\'\');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([\'AE\']);
  const [activeStatus, setActiveStatus] = useState(\'active\');
  const [mediaType, setMediaType] = useState(\'all\');
  const [maxPages, setMaxPages] = useState(1);
  const [minDurationDays, setMinDurationDays] = useState<number | undefined>(undefined);
  
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
    if (searchType === \'keyword\' && !keywordQuery.trim()) {
      setError(\'Please enter a keyword to search\');
      return;
    }
    
    if (searchType === \'page\' && !pageId.trim()) {
      setError(\'Please enter a Facebook page ID\');
      return;
    }
    
    if (selectedCountries.length === 0) {
      setError(\'Please select at least one country\');
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchResult(null);
    setSelectedAds(new Set());

    try {
      const searchRequest = {
        query_string: searchType === \'keyword\' ? keywordQuery.trim() : undefined,
        page_id: searchType === \'page\' ? pageId.trim() : undefined,
        countries: selectedCountries,
        active_status: activeStatus,
        media_type: mediaType,
        max_pages: maxPages,
        save_to_database: false, // Always preview first
        min_duration_days: minDurationDays,
      };

      console.log(\'Searching with request:\', searchRequest);
      
      const result = await adsApi.searchAdLibrary(searchRequest);
      console.log(\'Search result:\', result);
      
      setSearchResult(result);
    } catch (err: any) {
      console.error(\'Search error:\', err);
      setError(err.message || \'Search failed. Please try again.\');
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
      setError(\'Please select at least one ad to save\');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const searchParams = {
        query_string: searchType === \'keyword\' ? keywordQuery.trim() : undefined,
        page_id: searchType === \'page\' ? pageId.trim() : undefined,
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
      console.error(\'Save error:\', err);
      setError(err.message || \'Failed to save ads. Please try again.\');
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
              Search Facebook\'s Ad Library directly by keyword or page to discover new ads and competitors
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
                  Configure your search to find ads from Meta\'s Ad Library
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
                        checked={searchType === \'keyword\'}
                        onCheckedChange={() => setSearchType(\'keyword\')}
                      />
                      <Label htmlFor="keyword-search" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Keyword Search
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="page-search"
                        checked={searchType === \'page\'}
                        onCheckedChange={() => setSearchType(\'page\')}
                      />
                      <Label htmlFor="page-search" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Page Search
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Search Query */}
                {searchType === \'keyword\' ? (
                  <div className="space-y-2">
                    <Label htmlFor="keyword">Keyword</Label>
                    <Input
                      id="keyword"
                      placeholder="e.g., damac, real estate, fitness..."
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
                      value={minDurationDays || \'\'}
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
                      <Eye className="mr-2 h-4 w-4" />
                      Preview Ads (No Save)
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
                    <li>• Use broad terms like "damac" or "fitness"</li>
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
                    <li>• Start with 1 page for quick results</li>
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
                    setSearchType(\'keyword\');
                    setKeywordQuery(\'damac\');
                    setSelectedCountries([\'AE\']);
                    setMediaType(\'all\');
                  }}
                  disabled={isSearching}
                >
                  DAMAC Properties (AE)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setSearchType(\'keyword\');
                    setKeywordQuery(\'real estate\');
                    setSelectedCountries([\'AE\', \'US\']);
                    setMediaType(\'video\');
                  }}
                  disabled={isSearching}
                >
                  Real Estate Videos (AE, US)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setSearchType(\'keyword\');
                    setKeywordQuery(\'fitness\');
                    setSelectedCountries([\'US\', \'GB\']);
                    setMinDurationDays(7);
                  }}
                  disabled={isSearching}
                >
                  Fitness Ads 7+ Days (US, UK)
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
                  {searchResult.search_type === \'keyword\' ? \'Keyword\' : \'Page\'} search for "{searchResult.query}" 
                  in {searchResult.countries.join(\', \')} • {searchResult.search_time}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-5">
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
                    <div className="text-2xl font-bold text-purple-400">{searchResult.stats.competitors_updated}</div>
                    <div className="text-sm text-muted-foreground">Advertisers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400">{selectedAds.size}</div>
                    <div className="text-sm text-muted-foreground">Selected</div>
                  </div>
                </div>

                {/* Enhanced Stats */}
                <div className="mt-4 grid gap-2 md:grid-cols-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Target className="h-4 w-4" />
                    <span>{searchResult.ads_preview.filter(ad => ad.has_targeting).length} with targeting</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <FileText className="h-4 w-4" />
                    <span>{searchResult.ads_preview.filter(ad => ad.has_lead_form).length} with lead forms</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span>{searchResult.ads_preview.filter(ad => ad.is_active).length} currently active</span>
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
                    <div className="flex items-center gap-4">
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
                          Select All
                        </Label>
                      </div>
                      <Badge variant="outline">
                        {selectedAds.size} of {searchResult.ads_preview.length} selected
                      </Badge>
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
                          <Database className="mr-2 h-4 w-4" />
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
                {searchResult.ads_preview.map((ad) => (
                  <SearchAdCard
                    key={ad.ad_archive_id}
                    ad={ad}
                    isSelected={selectedAds.has(ad.ad_archive_id)}
                    onSelectionChange={handleAdSelection}
                  />
                ))}
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
}'''

    # Write the enhanced search page
    with open("frontend/src/app/search/page.tsx", "w", encoding="utf-8") as f:
        f.write(enhanced_search_page)

    print("✅ Enhanced search page with better ad details display")

def update_api_types():
    """Update API types to include the save selected ads endpoint"""
    
    api_file_path = "frontend/src/lib/api.ts"
    
    # Read current API file
    try:
        with open(api_file_path, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print("❌ API file not found, skipping API update")
        return

    # Add the saveSelectedAds method if it doesn't exist
    if "saveSelectedAds" not in content:
        # Find the adsApi object and add the method
        save_selected_method = '''
  async saveSelectedAds(request: {
    ad_archive_ids: string[];
    search_params: any;
  }) {
    const response = await fetch(`${this.baseUrl}/ads/library/save-selected`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },'''

        # Insert before the closing brace of adsApi
        if "export const adsApi" in content:
            # Find the last method in adsApi and add after it
            lines = content.split('\n')
            for i in range(len(lines) - 1, -1, -1):
                if lines[i].strip().startswith('}') and 'adsApi' in ''.join(lines[max(0, i-10):i]):
                    lines.insert(i, save_selected_method)
                    break
            
            content = '\n'.join(lines)
            
            with open(api_file_path, "w", encoding="utf-8") as f:
                f.write(content)
            
            print("✅ Added saveSelectedAds method to API")
        else:
            print("⚠️  Could not find adsApi object to update")
    else:
        print("✅ saveSelectedAds method already exists in API")

def main():
    """Main function to apply all fixes"""
    print("🔧 Fixing Search Page - Enhanced Ad Details Display")
    print("=" * 60)
    
    try:
        # Create enhanced components
        create_enhanced_search_components()
        
        # Create enhanced search page
        create_enhanced_search_page()
        
        # Update API types
        update_api_types()
        
        print("\n" + "=" * 60)
        print("✅ Search page enhancement complete!")
        print("\nKey improvements:")
        print("• Enhanced SearchAdCard component with detailed ad information")
        print("• Better display of ad creatives, headlines, and body text")
        print("• Expandable sections for targeting and lead form details")
        print("• Support for carousel ads with multiple creatives")
        print("• Improved selection and saving workflow")
        print("• Better visual indicators for ad status and features")
        print("• Enhanced search statistics and filtering")
        
        print("\nThe search page now properly displays:")
        print("• Ad headlines and body text")
        print("• Media previews (images/videos)")
        print("• Call-to-action buttons")
        print("• Targeting information (when available)")
        print("• Lead form details (when available)")
        print("• All creatives for carousel ads")
        print("• Ad duration and status")
        print("• Advertiser information")
        
        print("\nWorkflow:")
        print("1. Search for ads (preview mode by default)")
        print("2. Review detailed ad information")
        print("3. Select ads you want to save")
        print("4. Save selected ads to database")
        
    except Exception as e:
        print(f"❌ Error during enhancement: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)