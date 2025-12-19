'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Save, 
  Download, 
  ExternalLink, 
  Users, 
  Calendar, 
  Clock, 
  Globe2, 
  Play, 
  Image as ImageIcon, 
  Grid3X3, 
  PlayCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Building2,
  Star,
  Heart,
  Share2,
  Copy,
  Eye,
  DollarSign,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { SearchAdCard } from '@/components/search/SearchAdCard';

// Types for search ad data
interface SearchAdDetail {
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
  page_name?: string;
  page_id?: string;
  countries?: string[];
  impressions_text?: string;
  spend?: string;
}

interface SaveAdRequest {
  ad_archive_id: string;
  competitor_name?: string;
  competitor_page_id?: string;
  notes?: string;
}

export default function SearchAdDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  
  // State management
  const [ad, setAd] = useState<SearchAdDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  const [competitorSuccess, setCompetitorSuccess] = useState(false);
  
  // Form states
  const [competitorName, setCompetitorName] = useState('');
  const [competitorPageId, setCompetitorPageId] = useState('');
  const [notes, setNotes] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [playingVideos, setPlayingVideos] = useState<{ [key: number]: boolean }>({});
  const [videoQuality, setVideoQuality] = useState<{ [key: number]: 'hd' | 'sd' }>({});

  // Helper function to extract page ID from ad data
  const getPageIdFromAd = (adData: SearchAdDetail) => {
    return adData.page_id || 
           adData.meta?.page_id || 
           adData.meta?.snapshot?.page_id || 
           '';
  };

  useEffect(() => {
    const loadAdData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First, try to get from IndexedDB (search results cache)
        try {
          const { searchStorage } = await import('@/lib/search-storage');
          const foundAd = await searchStorage.findAdInResults(id);
          
          if (foundAd) {
            setAd(foundAd);
            setCompetitorName(foundAd.advertiser || foundAd.page_name || '');
            const pageId = foundAd.page_id || 
                         foundAd.meta?.page_id || 
                         foundAd.meta?.snapshot?.page_id || 
                         '';
            setCompetitorPageId(pageId);
            setLoading(false);
            return;
          }
        } catch (dbError) {
          console.warn('Failed to load from IndexedDB:', dbError);
        }
        
        // If not found in cache, try to fetch from recent searches in sessionStorage
        const recentSearches = sessionStorage.getItem('recentSearchResults');
        if (recentSearches) {
          try {
            const searches = JSON.parse(recentSearches);
            // Look through recent searches for the ad
            for (const searchResult of searches) {
              const foundAd = searchResult.ads_preview?.find((ad: any) => ad.ad_archive_id === id);
              if (foundAd) {
                setAd(foundAd);
                setCompetitorName(foundAd.advertiser || foundAd.page_name || '');
                // Extract page_id from multiple possible locations in the response
                const pageId = foundAd.page_id || 
                             foundAd.meta?.page_id || 
                             foundAd.meta?.snapshot?.page_id || 
                             '';
                setCompetitorPageId(pageId);
                setLoading(false);
                return;
              }
            }
          } catch (parseError) {
            console.warn('Failed to parse recent search results:', parseError);
          }
        }
        
        // If still not found, try to fetch from API by searching for the specific ad
        try {
          const response = await fetch('/api/v1/search/get-ad', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ad_archive_id: id }),
          });
          
          if (response.ok) {
            const adData = await response.json();
            if (adData.success && adData.ad) {
              setAd(adData.ad);
              setCompetitorName(adData.ad.advertiser || adData.ad.page_name || '');
              // Extract page_id from multiple possible locations in the response
              const pageId = adData.ad.page_id || 
                           adData.ad.meta?.page_id || 
                           adData.ad.meta?.snapshot?.page_id || 
                           '';
              setCompetitorPageId(pageId);
              setLoading(false);
              return;
            }
          }
        } catch (apiError) {
          console.warn('Failed to fetch ad from API:', apiError);
        }
        
        // If all methods fail, show helpful error message
        setError(`Ad with ID "${id}" not found. This can happen if:
        • The ad data is no longer cached
        • The ad has been removed from Facebook Ad Library
        • There was a network issue
        
        Please return to search and try again, or search for this specific ad ID.`);
        setLoading(false);
        
      } catch (err) {
        console.error('Error loading ad:', err);
        setError('Failed to load ad details');
        setLoading(false);
      }
    };

    if (id) {
      loadAdData();
    }
  }, [id]);

  const handleSaveToDatabase = async () => {
    if (!ad) return;
    
    setIsSaving(true);
    try {
      const saveRequest: SaveAdRequest = {
        ad_archive_id: ad.ad_archive_id,
        competitor_name: competitorName || ad.advertiser,
        competitor_page_id: competitorPageId || ad.page_id,
        notes: notes
      };

      // Make API call to save the ad
      const response = await fetch('/api/v1/search/save-ad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveRequest),
      });

      if (!response.ok) {
        throw new Error('Failed to save ad');
      }

      const result = await response.json();
      
      if (result.success) {
        setSaveSuccess(true);
        
        // Show success message and redirect
        setTimeout(() => {
          router.push('/saved');
        }, 1500);
      } else {
        alert(result.message || 'Failed to save ad to database');
      }
      
    } catch (error) {
      console.error('Error saving ad:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save ad to database';
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCompetitor = async () => {
    if (!ad || !competitorName) return;
    
    setIsAddingCompetitor(true);
    try {
      // Ensure we have a page_id - this is required by the backend
      // Try multiple locations for page_id in the ad data
      const pageId = competitorPageId || 
                    ad.page_id || 
                    ad.meta?.page_id || 
                    ad.meta?.snapshot?.page_id;
      
      if (!pageId) {
        alert('Cannot add competitor: No Facebook Page ID available. Please enter a Page ID manually.');
        setIsAddingCompetitor(false);
        return;
      }

      const competitorRequest = {
        name: competitorName,
        page_id: pageId,
        is_active: true
      };

      // Make API call to add competitor
      const response = await fetch('/api/v1/competitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(competitorRequest),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 400 && result.error?.includes('already exists')) {
          alert(`✓ ${competitorName} is already in your competitors list! You can scrape their ads from the Competitors page.`);
          setCompetitorSuccess(true);
          setTimeout(() => setCompetitorSuccess(false), 3000);
        } else {
          throw new Error(result.error || 'Failed to add competitor');
        }
      } else {
        setCompetitorSuccess(true);
        
        // Show success message with scraping context
        setTimeout(() => {
          alert(`✓ ${competitorName} added as competitor for future scraping! You can now scrape their ads from the Competitors page.`);
          setCompetitorSuccess(false);
        }, 1000);
      }
      
    } catch (error) {
      console.error('Error adding competitor:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to add competitor for scraping: ${errorMessage}`);
    } finally {
      setIsAddingCompetitor(false);
    }
  };

  const handleDownloadAd = () => {
    if (!ad) return;
    
    // Create downloadable ad data
    const downloadData = {
      ad_archive_id: ad.ad_archive_id,
      advertiser: ad.advertiser,
      page_name: ad.page_name,
      media_type: ad.media_type,
      is_active: ad.is_active,
      start_date: ad.start_date,
      duration_days: ad.duration_days,
      creatives_count: ad.creatives_count,
      targeting: ad.targeting,
      lead_form: ad.lead_form,
      creatives: ad.creatives,
      meta: ad.meta,
      exported_at: new Date().toISOString(),
      exported_from: window.location.href
    };
    
    const blob = new Blob([JSON.stringify(downloadData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facebook-ad-${ad.ad_archive_id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('Failed to copy link');
    }
  };

  const handlePlayVideo = (idx: number, quality: 'hd' | 'sd') => {
    setPlayingVideos(prev => ({ ...prev, [idx]: true }));
    setVideoQuality(prev => ({ ...prev, [idx]: quality }));
  };

  const handleDownloadVideo = async (url: string, filename: string) => {
    try {
      // Try to download using fetch and blob
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      // Fallback: open in new tab
      console.warn('Direct download failed, opening in new tab:', error);
      window.open(url, '_blank');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const calculateDaysRunning = () => {
    if (!ad?.start_date) return null;
    
    try {
      const startDate = parseISO(ad.start_date);
      const currentDate = new Date();
      const daysDiff = differenceInDays(currentDate, startDate);
      
      // Use duration_days from API if available, otherwise calculate
      if (ad.duration_days !== undefined && ad.duration_days !== null) {
        return ad.duration_days;
      }
      
      return Math.max(0, daysDiff);
    } catch {
      return null;
    }
  };

  const formatDaysRunning = (days: number | null) => {
    if (days === null) return null;
    
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    if (days < 365) {
      const months = Math.floor(days / 30);
      const remainingDays = days % 30;
      if (remainingDays === 0) {
        return months === 1 ? '1 month' : `${months} months`;
      }
      return `${months}m ${remainingDays}d`;
    }
    
    const years = Math.floor(days / 365);
    const remainingDays = days % 365;
    const months = Math.floor(remainingDays / 30);
    
    if (months === 0) {
      return years === 1 ? '1 year' : `${years} years`;
    }
    return `${years}y ${months}m`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading ad details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !ad) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-400" />
            <h2 className="text-lg font-semibold mb-2 text-red-400">Ad Not Found</h2>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed whitespace-pre-line">
              {error || 'Ad not found'}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Search
              </Button>
              <Button 
                variant="default" 
                onClick={() => router.push(`/search?q=${encodeURIComponent(id)}&type=keyword`)}
              >
                Search for this Ad ID
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/search')}
              >
                New Search
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const daysRunning = calculateDaysRunning();
  const formattedDays = formatDaysRunning(daysRunning);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-8">
        {/* Header with Back Button and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Search
            </Button>
            
            {/* Show search results indicator if available */}
            {(() => {
              try {
                const cachedResults = localStorage.getItem('searchState');
                if (cachedResults) {
                  const results = JSON.parse(cachedResults);
                  return (
                    <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                      {results.searchResult?.ads_preview?.length || 0} results cached
                    </span>
                  );
                }
              } catch (e) {
                return null;
              }
              return null;
            })()}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAddCompetitor}
              disabled={isAddingCompetitor || !competitorName || (!competitorPageId && !ad.page_id && !ad.meta?.page_id && !ad.meta?.snapshot?.page_id)}
              title="Add this advertiser to your competitors list for automated scraping and monitoring"
              className={cn(
                "transition-colors",
                competitorSuccess 
                  ? "bg-green-500/10 border-green-500/50 text-green-400 hover:bg-green-500/20" 
                  : "bg-blue-500/10 border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
              )}
            >
              {isAddingCompetitor ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : competitorSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Added for Scraping!
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 mr-2" />
                  Add for Scraping
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="border-neutral-700 hover:bg-neutral-800"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            
            <Button
              variant="outline"
              onClick={handleDownloadAd}
              className="border-neutral-700 hover:bg-neutral-800"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            
            <Button
              onClick={() => window.open(`https://www.facebook.com/ads/library/?id=${ad.ad_archive_id}`, '_blank')}
              variant="outline"
              className="border-neutral-700 hover:bg-neutral-800"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Facebook
            </Button>
          </div>
        </div>

        {/* Ad Header */}
        <div className="flex items-start gap-4">
          <Avatar className="size-16 ring-2 ring-border/20">
            <AvatarImage 
              src={ad.page_id ? `https://graph.facebook.com/${ad.page_id}/picture?width=64&height=64` : undefined} 
              alt={ad.advertiser || ad.page_name || 'Advertiser'} 
              className="object-cover" 
            />
            <AvatarFallback className="bg-gradient-to-br from-photon-900 to-photon-800 text-photon-200 font-mono text-sm font-semibold">
              {(ad.advertiser || ad.page_name || 'AD').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (isNavigating) return;
                  
                  const pageId = ad.page_id || ad.meta?.page_id || ad.meta?.snapshot?.page_id;
                  if (pageId) {
                    setIsNavigating(true);
                    // Navigate to search page with pre-filled form (no auto-search)
                    router.push(`/search?type=page&q=${encodeURIComponent(pageId)}`);
                  } else {
                    alert('No Page ID available for this advertiser');
                  }
                }}
                disabled={isNavigating}
                className="text-2xl font-bold hover:text-primary transition-colors cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
                title="Click to pre-fill search form for this page"
              >
                {ad.advertiser || ad.page_name || 'Unknown Advertiser'}
              </button>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Archive ID: {ad.ad_archive_id}
              {(ad.page_id || ad.meta?.page_id || ad.meta?.snapshot?.page_id) && (
                <span className="ml-2">
                  • Page ID: {ad.page_id || ad.meta?.page_id || ad.meta?.snapshot?.page_id}
                </span>
              )}
            </p>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground pt-1">
              {ad.start_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(ad.start_date)}</span>
                  {formattedDays && (
                    <span className={cn("font-medium", ad.is_active ? "text-photon-400" : "")}>
                      • {formattedDays}
                    </span>
                  )}
                </div>
              )}
              
              {ad.countries && ad.countries.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Globe2 className="h-4 w-4" />
                  <span>{ad.countries.join(', ')}</span>
                </div>
              )}
              
              {ad.impressions_text && (
                <div className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  <span>{ad.impressions_text}</span>
                </div>
              )}
              
              {ad.spend && (
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" />
                  <span>{ad.spend}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-3">
            {/* Status Badge */}
            <Badge className={cn(
              ad.is_active 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            )}>
              <span className={cn("size-1.5 rounded-full mr-2", ad.is_active ? "bg-emerald-400" : "bg-rose-400")} />
              {ad.is_active ? 'Active' : 'Inactive'}
            </Badge>
            
            {/* Media Type Badge */}
            <Badge variant="outline" className="border-neutral-700 text-neutral-400">
              {ad.media_type === 'video' ? (
                <PlayCircle className="h-3 w-3 mr-1" />
              ) : ad.creatives_count > 1 ? (
                <Grid3X3 className="h-3 w-3 mr-1" />
              ) : (
                <ImageIcon className="h-3 w-3 mr-1" />
              )}
              {ad.media_type === 'video' ? 'Video' : ad.creatives_count > 1 ? 'Carousel' : 'Image'}
            </Badge>
            
            {/* Creatives Count */}
            {ad.creatives_count > 1 && (
              <Badge variant="outline" className="border-neutral-700 text-neutral-400">
                {ad.creatives_count} Creatives
              </Badge>
            )}
          </div>
        </div>

        {/* Page Details & Actions Card */}
        {ad.meta?.snapshot && (
          <Card className="border-neutral-800 bg-gradient-to-br from-neutral-900/50 to-neutral-900/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-400" />
                Page Details & Actions
              </CardTitle>
              <CardDescription>
                Information about the advertiser and available actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Page Information */}
              <div className="grid md:grid-cols-2 gap-6 pb-6 border-b border-border/30">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-12 ring-2 ring-border/20">
                      <AvatarImage 
                        src={ad.meta.snapshot.page_profile_picture_url} 
                        alt={ad.meta.snapshot.page_name} 
                        className="object-cover" 
                      />
                      <AvatarFallback className="bg-gradient-to-br from-photon-900 to-photon-800 text-photon-200">
                        {ad.meta.snapshot.page_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{ad.meta.snapshot.page_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {ad.meta.page_categories?.join(', ') || 'No category'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between py-2 border-b border-border/30">
                      <span className="text-muted-foreground">Page ID</span>
                      <span className="font-mono text-xs">{ad.meta.snapshot.page_id}</span>
                    </div>
                    
                    {ad.meta.page_like_count && (
                      <div className="flex items-center justify-between py-2 border-b border-border/30">
                        <span className="text-muted-foreground">Page Likes</span>
                        <span className="font-semibold text-blue-400">
                          {ad.meta.page_like_count.toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    {ad.meta.snapshot.page_categories && (
                      <div className="flex items-center justify-between py-2 border-b border-border/30">
                        <span className="text-muted-foreground">Categories</span>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {ad.meta.snapshot.page_categories.map((cat: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {ad.meta.publisher_platform && (
                      <div className="flex items-center justify-between py-2 border-b border-border/30">
                        <span className="text-muted-foreground">Platforms</span>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {ad.meta.publisher_platform.map((platform: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="text-sm">
                    <Label className="text-muted-foreground mb-2 block">Page URL</Label>
                    <a 
                      href={ad.meta.snapshot.page_profile_uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 break-all"
                    >
                      {ad.meta.snapshot.page_profile_uri}
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  </div>
                  
                  {ad.meta.cta_type && (
                    <div className="text-sm">
                      <Label className="text-muted-foreground mb-2 block">Call to Action</Label>
                      <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                        {ad.meta.cta_text || ad.meta.cta_type}
                      </Badge>
                    </div>
                  )}
                  
                  {ad.meta.display_format && (
                    <div className="text-sm">
                      <Label className="text-muted-foreground mb-2 block">Display Format</Label>
                      <Badge variant="outline">
                        {ad.meta.display_format}
                      </Badge>
                    </div>
                  )}
                  
                  {ad.meta.start_date && (
                    <div className="text-sm">
                      <Label className="text-muted-foreground mb-2 block">Campaign Duration</Label>
                      <div className="flex items-center gap-2 text-xs">
                        <span>{formatDate(ad.meta.start_date)}</span>
                        {ad.meta.end_date && (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <span>{formatDate(ad.meta.end_date)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Section */}
              <div>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-purple-400" />
                  Quick Actions
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Add for Scraping */}
                  <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg space-y-3">
                    <div className="flex items-start gap-2">
                      <Building2 className="h-5 w-5 text-blue-400 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">Add for Scraping</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Add this advertiser to your competitors list for automated monitoring
                        </p>
                        <div className="space-y-2">
                          <Input
                            value={competitorName}
                            onChange={(e) => setCompetitorName(e.target.value)}
                            placeholder="Competitor name"
                            className="h-8 text-xs"
                          />
                          <Input
                            value={competitorPageId}
                            onChange={(e) => setCompetitorPageId(e.target.value)}
                            placeholder="Page ID (optional)"
                            className="h-8 text-xs"
                          />
                          <Button
                            onClick={handleAddCompetitor}
                            disabled={isAddingCompetitor || !competitorName}
                            size="sm"
                            className="w-full"
                          >
                            {isAddingCompetitor ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Adding...
                              </>
                            ) : competitorSuccess ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Added!
                              </>
                            ) : (
                              <>
                                <Plus className="h-3 w-3 mr-1" />
                                Add for Scraping
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save to Database */}
                  <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg space-y-3">
                    <div className="flex items-start gap-2">
                      <Save className="h-5 w-5 text-green-400 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">Save to Database</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Save this ad to your database for tracking
                        </p>
                        <div className="space-y-2">
                          <Input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add notes (optional)"
                            className="h-8 text-xs"
                          />
                          <Button
                            onClick={handleSaveToDatabase}
                            disabled={isSaving || saveSuccess}
                            size="sm"
                            variant="outline"
                            className="w-full"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Saving...
                              </>
                            ) : saveSuccess ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Redirecting to Saved Ads...
                              </>
                            ) : (
                              <>
                                <Save className="h-3 w-3 mr-1" />
                                Save Ad
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadAd}
                    className="text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="text-xs"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Link
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://www.facebook.com/ads/library/?id=${ad.ad_archive_id}`, '_blank')}
                    className="text-xs"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Facebook
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const pageId = ad.page_id || ad.meta?.page_id || ad.meta?.snapshot?.page_id;
                      if (pageId) {
                        router.push(`/search?type=page&q=${encodeURIComponent(pageId)}`);
                      }
                    }}
                    disabled={!ad.page_id && !ad.meta?.page_id && !ad.meta?.snapshot?.page_id}
                    className="text-xs"
                  >
                    <Search className="h-3 w-3 mr-1" />
                    All Ads
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ad Preview Card */}
        <Card className="border-neutral-800">
          <CardHeader>
            <CardTitle>Ad Preview</CardTitle>
            <CardDescription>
              How this ad appears in the Facebook Ad Library
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md mx-auto">
              <SearchAdCard
                ad={ad}
                isSelected={false}
                onSelectionChange={() => {}} // No selection needed in detail view
              />
            </div>
          </CardContent>
        </Card>

        {/* Ad Content Details */}
        {(ad.meta?.title || ad.meta?.body?.text || ad.meta?.caption || ad.meta?.link_url) && (
          <Card className="border-neutral-800">
            <CardHeader>
              <CardTitle>Ad Content</CardTitle>
              <CardDescription>
                Text and link content from the ad
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ad.meta.title && (
                <div>
                  <Label className="text-muted-foreground text-xs mb-1 block">Headline</Label>
                  <p className="text-lg font-semibold">{ad.meta.title}</p>
                </div>
              )}
              
              {ad.meta.body?.text && (
                <div>
                  <Label className="text-muted-foreground text-xs mb-1 block">Body Text</Label>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{ad.meta.body.text}</p>
                </div>
              )}
              
              {ad.meta.caption && (
                <div>
                  <Label className="text-muted-foreground text-xs mb-1 block">Caption</Label>
                  <p className="text-sm text-muted-foreground">{ad.meta.caption}</p>
                </div>
              )}
              
              {ad.meta.link_url && (
                <div>
                  <Label className="text-muted-foreground text-xs mb-1 block">Link URL</Label>
                  <a 
                    href={ad.meta.link_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-sm break-all"
                  >
                    {ad.meta.link_url}
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  </a>
                </div>
              )}
              
              {ad.meta.link_description && (
                <div>
                  <Label className="text-muted-foreground text-xs mb-1 block">Link Description</Label>
                  <p className="text-sm text-muted-foreground">{ad.meta.link_description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Extra Texts */}
        {ad.meta?.extra_texts && ad.meta.extra_texts.length > 0 && (
          <Card className="border-neutral-800">
            <CardHeader>
              <CardTitle>Additional Text Content</CardTitle>
              <CardDescription>
                All text variations and form fields from the ad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ad.meta.extra_texts.map((textObj: any, idx: number) => (
                  <div 
                    key={idx} 
                    className="p-3 bg-neutral-900/50 rounded-lg border border-border/30 text-sm"
                  >
                    {textObj.text}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Extra Links */}
        {ad.meta?.extra_links && ad.meta.extra_links.length > 0 && (
          <Card className="border-neutral-800">
            <CardHeader>
              <CardTitle>Additional Links</CardTitle>
              <CardDescription>
                All links found in the ad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ad.meta.extra_links.map((link: string, idx: number) => (
                  <a 
                    key={idx}
                    href={link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-neutral-900/50 rounded-lg border border-border/30 hover:border-blue-500/50 transition-colors text-sm text-blue-400 hover:text-blue-300 break-all"
                  >
                    <ExternalLink className="h-4 w-4 flex-shrink-0" />
                    {link}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Extra Images */}
        {ad.meta?.extra_images && ad.meta.extra_images.length > 0 && (
          <Card className="border-neutral-800">
            <CardHeader>
              <CardTitle>Additional Images</CardTitle>
              <CardDescription>
                All images from the ad creative
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {ad.meta.extra_images.map((img: any, idx: number) => (
                  <a
                    key={idx}
                    href={img.original_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square rounded-lg overflow-hidden border border-border/30 hover:border-blue-500/50 transition-colors"
                  >
                    <img 
                      src={img.resized_image_url || img.original_image_url} 
                      alt={`Ad image ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                      <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Videos */}
        {ad.meta?.videos && ad.meta.videos.length > 0 && (
          <Card className="border-neutral-800 bg-gradient-to-br from-red-900/10 to-neutral-900/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-red-400" />
                Video Content
              </CardTitle>
              <CardDescription>
                Video creatives from the ad - {ad.meta.videos.length} video{ad.meta.videos.length > 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {ad.meta.videos.map((video: any, idx: number) => {
                  const isPlaying = playingVideos[idx];
                  const quality = videoQuality[idx] || 'hd';
                  const videoUrl = quality === 'hd' && video.video_hd_url ? video.video_hd_url : video.video_sd_url;
                  
                  return (
                    <div key={idx} className="space-y-3 p-4 bg-neutral-900/50 rounded-lg border border-border/30">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-semibold">Video {idx + 1}</Label>
                        <Badge variant="outline" className="text-xs">
                          <PlayCircle className="h-3 w-3 mr-1" />
                          {video.video_hd_url ? 'HD Available' : 'SD Only'}
                        </Badge>
                      </div>
                      
                      {/* Video Player or Preview */}
                      <div className="relative aspect-video rounded-lg overflow-hidden border border-border/30 bg-black">
                        {isPlaying ? (
                          <video
                            key={videoUrl}
                            controls
                            autoPlay
                            className="w-full h-full"
                            poster={video.video_preview_image_url}
                          >
                            <source src={videoUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                        ) : (
                          <button
                            onClick={() => handlePlayVideo(idx, video.video_hd_url ? 'hd' : 'sd')}
                            className="w-full h-full group cursor-pointer"
                          >
                            <img 
                              src={video.video_preview_image_url} 
                              alt={`Video preview ${idx + 1}`}
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-center justify-center">
                              <div className="text-center">
                                <div className="bg-red-500/20 backdrop-blur-sm rounded-full p-4 mb-3 group-hover:bg-red-500/30 transition-colors">
                                  <PlayCircle className="h-16 w-16 text-white group-hover:scale-110 transition-transform" />
                                </div>
                                <p className="text-white text-sm font-medium">Click to Play Video</p>
                                <p className="text-white/70 text-xs mt-1">
                                  {video.video_hd_url ? 'HD Quality' : 'SD Quality'}
                                </p>
                              </div>
                            </div>
                          </button>
                        )}
                      </div>
                      
                      {/* Quality Selection and Actions */}
                      <div className="space-y-3">
                        {/* Quality Selector */}
                        {video.video_hd_url && video.video_sd_url && (
                          <div className="flex items-center gap-2 p-2 bg-neutral-900/70 rounded-lg border border-border/20">
                            <Label className="text-xs text-muted-foreground">Quality:</Label>
                            <div className="flex gap-2 flex-1">
                              <Button
                                variant={quality === 'hd' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => {
                                  setVideoQuality(prev => ({ ...prev, [idx]: 'hd' }));
                                  if (isPlaying) {
                                    setPlayingVideos(prev => ({ ...prev, [idx]: false }));
                                    setTimeout(() => setPlayingVideos(prev => ({ ...prev, [idx]: true })), 100);
                                  }
                                }}
                                className={cn(
                                  "flex-1 text-xs",
                                  quality === 'hd' 
                                    ? "bg-blue-500 hover:bg-blue-600" 
                                    : "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-400"
                                )}
                              >
                                HD
                              </Button>
                              <Button
                                variant={quality === 'sd' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => {
                                  setVideoQuality(prev => ({ ...prev, [idx]: 'sd' }));
                                  if (isPlaying) {
                                    setPlayingVideos(prev => ({ ...prev, [idx]: false }));
                                    setTimeout(() => setPlayingVideos(prev => ({ ...prev, [idx]: true })), 100);
                                  }
                                }}
                                className={cn(
                                  "flex-1 text-xs",
                                  quality === 'sd' 
                                    ? "bg-purple-500 hover:bg-purple-600" 
                                    : "bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20 text-purple-400"
                                )}
                              >
                                SD
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* Play/Replay Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (isPlaying) {
                                setPlayingVideos(prev => ({ ...prev, [idx]: false }));
                                setTimeout(() => setPlayingVideos(prev => ({ ...prev, [idx]: true })), 100);
                              } else {
                                handlePlayVideo(idx, quality);
                              }
                            }}
                            className="bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-400"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            {isPlaying ? 'Replay' : 'Play Inline'}
                          </Button>
                          
                          {/* Open in New Tab */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(videoUrl, '_blank')}
                            className="bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20 text-purple-400"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open in Tab
                          </Button>
                          
                          {/* Download HD */}
                          {video.video_hd_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadVideo(
                                video.video_hd_url,
                                `video-${ad.ad_archive_id}-hd-${idx + 1}.mp4`
                              )}
                              className="bg-green-500/10 border-green-500/30 hover:bg-green-500/20 text-green-400"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download HD
                            </Button>
                          )}
                          
                          {/* Download SD */}
                          {video.video_sd_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadVideo(
                                video.video_sd_url,
                                `video-${ad.ad_archive_id}-sd-${idx + 1}.mp4`
                              )}
                              className="bg-green-500/10 border-green-500/30 hover:bg-green-500/20 text-green-400"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download SD
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Video URLs for reference */}
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                          View Video URLs
                        </summary>
                        <div className="mt-2 space-y-2">
                          {video.video_hd_url && (
                            <div className="p-2 bg-black/40 rounded border border-border/30">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-muted-foreground">HD URL:</p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    await navigator.clipboard.writeText(video.video_hd_url);
                                    alert('HD URL copied!');
                                  }}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="break-all text-blue-400 text-xs">{video.video_hd_url}</p>
                            </div>
                          )}
                          {video.video_sd_url && (
                            <div className="p-2 bg-black/40 rounded border border-border/30">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-muted-foreground">SD URL:</p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    await navigator.clipboard.writeText(video.video_sd_url);
                                    alert('SD URL copied!');
                                  }}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="break-all text-purple-400 text-xs">{video.video_sd_url}</p>
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Save to Database */}
          <Card className="border-neutral-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save className="h-5 w-5 text-green-400" />
                Save to Database
              </CardTitle>
              <CardDescription>
                Add this ad to your database for tracking and analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="competitor-name">Competitor Name</Label>
                <Input
                  id="competitor-name"
                  value={competitorName}
                  onChange={(e) => setCompetitorName(e.target.value)}
                  placeholder="Enter competitor name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="competitor-page-id">Page ID (Optional)</Label>
                <Input
                  id="competitor-page-id"
                  value={competitorPageId}
                  onChange={(e) => setCompetitorPageId(e.target.value)}
                  placeholder="Facebook Page ID"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this ad"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleSaveToDatabase}
                disabled={isSaving || !competitorName}
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Ad
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Add Competitor for Scraping */}
          <Card className="border-neutral-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-400" />
                Add for Scraping
              </CardTitle>
              <CardDescription>
                Add this advertiser to your competitors list for automated scraping and monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                <p className="font-medium text-blue-400 mb-2">📊 What happens next:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Competitor will be added to your monitoring list</li>
                  <li>• You can scrape their ads from the Competitors page</li>
                  <li>• Set up automated daily scraping for their latest ads</li>
                  <li>• Track their advertising strategies over time</li>
                </ul>
              </div>
              
              {!ad.page_id && !ad.meta?.page_id && !ad.meta?.snapshot?.page_id && (
                <div className="text-sm text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                  <p className="font-medium mb-1">⚠️ Page ID Required</p>
                  <p className="text-xs">This ad doesn't include a Facebook Page ID. You'll need to find and enter the Page ID manually to enable scraping.</p>
                </div>
              )}
              
              <div className="text-sm text-muted-foreground">
                <p><strong>Advertiser:</strong> {ad.advertiser || ad.page_name}</p>
                {(ad.page_id || ad.meta?.page_id || ad.meta?.snapshot?.page_id) && (
                  <p><strong>Page ID:</strong> {ad.page_id || ad.meta?.page_id || ad.meta?.snapshot?.page_id}</p>
                )}
                <p><strong>Status:</strong> {ad.is_active ? 'Active' : 'Inactive'}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="competitor-page-id-card">
                  Facebook Page ID <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="competitor-page-id-card"
                  value={competitorPageId}
                  onChange={(e) => setCompetitorPageId(e.target.value)}
                  placeholder={ad.page_id || ad.meta?.page_id || ad.meta?.snapshot?.page_id || "Enter Facebook Page ID"}
                  className={cn(
                    "transition-colors",
                    !competitorPageId && !ad.page_id && !ad.meta?.page_id && !ad.meta?.snapshot?.page_id && "border-red-500/50 focus:border-red-500"
                  )}
                />
                {!competitorPageId && !ad.page_id && !ad.meta?.page_id && !ad.meta?.snapshot?.page_id && (
                  <p className="text-xs text-red-400">Page ID is required for scraping</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="competitor-notes">Notes (Optional)</Label>
                <Input
                  id="competitor-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Why track this competitor? (e.g., direct competitor, interesting strategy)"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleAddCompetitor}
                disabled={isAddingCompetitor || !competitorName || (!competitorPageId && !ad.page_id && !ad.meta?.page_id && !ad.meta?.snapshot?.page_id)}
                variant="outline"
                className="w-full"
              >
                {isAddingCompetitor ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding for Scraping...
                  </>
                ) : competitorSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
                    Ready for Scraping!
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add for Scraping
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Quick Actions */}
          <Card className="border-neutral-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-purple-400" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Additional actions for this ad
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                onClick={handleDownloadAd}
                className="w-full justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Ad Data
              </Button>
              
              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="w-full justify-start"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.open(`https://www.facebook.com/ads/library/?id=${ad.ad_archive_id}`, '_blank')}
                className="w-full justify-start"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on Facebook
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  if (isNavigating) return;
                  
                  const pageId = ad.page_id || ad.meta?.page_id || ad.meta?.snapshot?.page_id;
                  if (pageId) {
                    setIsNavigating(true);
                    // Add timestamp to force new search
                    const timestamp = Date.now();
                    router.push(`/search?type=page&q=${encodeURIComponent(pageId)}&auto=true&t=${timestamp}`);
                  } else {
                    alert('No Page ID available for this advertiser');
                  }
                }}
                disabled={isNavigating || (!ad.page_id && !ad.meta?.page_id && !ad.meta?.snapshot?.page_id)}
                className="w-full justify-start"
              >
                <Search className="h-4 w-4 mr-2" />
                View All Ads from this Page
              </Button>
              
              {competitorSuccess && (
                <Button
                  variant="default"
                  onClick={() => router.push('/competitors')}
                  className="w-full justify-start bg-green-500/10 border-green-500/50 text-green-400 hover:bg-green-500/20"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Go to Competitors Page
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Targeting Information */}
        {ad.targeting && Object.keys(ad.targeting).length > 0 && (
          <Card className="border-neutral-800 bg-gradient-to-br from-purple-900/10 to-neutral-900/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-400" />
                Targeting Information
              </CardTitle>
              <CardDescription>
                Audience targeting data from Facebook Ad Library
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(ad.targeting).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(ad.targeting).map(([key, value], idx) => (
                    <div 
                      key={idx}
                      className="p-3 bg-neutral-900/50 rounded-lg border border-border/30"
                    >
                      <Label className="text-muted-foreground text-xs mb-1 block capitalize">
                        {key.replace(/_/g, ' ')}
                      </Label>
                      <p className="text-sm">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No targeting information available</p>
              )}
              
              <details className="text-xs mt-4">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                  View Raw Data
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-all max-h-[200px] overflow-auto bg-black/40 p-4 rounded-lg border border-border/30">
                  {JSON.stringify(ad.targeting, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}

        {/* Lead Form */}
        {ad.lead_form && (
          <Card className="border-neutral-800 bg-gradient-to-br from-green-900/10 to-neutral-900/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                Lead Form
              </CardTitle>
              <CardDescription>
                Lead generation form attached to this ad
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ad.lead_form.standalone_fields && ad.lead_form.standalone_fields.length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs mb-2 block">Form Fields</Label>
                  <div className="flex flex-wrap gap-2">
                    {ad.lead_form.standalone_fields.map((field: string, idx: number) => (
                      <Badge 
                        key={idx} 
                        className="bg-green-500/10 text-green-400 border-green-500/20"
                      >
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {ad.lead_form.questions && Object.keys(ad.lead_form.questions).length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs mb-2 block">Custom Questions</Label>
                  <div className="space-y-2">
                    {Object.entries(ad.lead_form.questions).map(([key, value], idx) => (
                      <div 
                        key={idx}
                        className="p-3 bg-neutral-900/50 rounded-lg border border-border/30 text-sm"
                      >
                        <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                  View Raw Data
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-all max-h-[200px] overflow-auto bg-black/40 p-4 rounded-lg border border-border/30">
                  {JSON.stringify(ad.lead_form, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}

        {/* Raw Data */}
        <Card className="border-neutral-800">
          <CardHeader>
            <CardTitle>Raw Data</CardTitle>
            <CardDescription>
              Complete ad data from Facebook Ad Library API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap break-all max-h-[400px] overflow-auto bg-black/40 p-4 rounded-lg border border-border/30">
              {JSON.stringify(ad, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}