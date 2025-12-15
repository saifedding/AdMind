'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { adsApi, ApiError } from '@/lib/api';
import { AdWithAnalysis } from '@/types/ad';
import { transformAdsWithAnalysis } from '@/lib/transformers';
import { DashboardLayout } from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Image, ArrowLeft, Globe2, Eye, DollarSign, Zap, TrendingUp, ChevronLeft, ChevronRight, Calendar, Info, RefreshCw, Loader2, Star, Award, Target, Lightbulb, BarChart3, Clock, Users, Heart, Share2, Copy, ExternalLink, Download, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, format, parseISO } from 'date-fns';
import type { AnalyzeVideoResponse } from '@/lib/api';
import { UnifiedAnalysisPanel } from '@/components/unified-analysis';

const CreativeCard = ({ creative, index }: { creative: AdWithAnalysis['creatives'][0], index: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const body = creative.body || '';
  const canTruncate = body.length > 150;

  return (
    <div key={creative.id || index} className="border border-border/30 rounded-lg p-4 space-y-2">
      <h4 className="font-semibold text-sm">Creative {index + 1}</h4>
      {creative.media && creative.media.length > 0 && (
        <div className="rounded-md overflow-hidden">
          {creative.media[0].type === 'Video' ? (
            <video src={creative.media[0].url} controls className="w-full h-auto" />
          ) : (
            <img src={creative.media[0].url} alt={creative.title || ''} className="w-full h-auto" />
          )}
        </div>
      )}
      {creative.title && (
        <p className="text-xs"><strong>Title:</strong> {creative.title}</p>
      )}
      {body && (
        <p className="text-xs">
          <strong>Body:</strong>{' '}
          {canTruncate && !isExpanded ? `${body.substring(0, 150)}...` : body}
          {canTruncate && (
            <Button variant="link" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="p-0 h-auto ml-1 text-xs">
              {isExpanded ? 'Show less' : 'Show more'}
            </Button>
          )}
        </p>
      )}
      {creative.cta?.text && (
        <p className="text-xs"><strong>CTA:</strong> {creative.cta.text}</p>
      )}
    </div>
  );
};

export default function AdDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [ad, setAd] = useState<AdWithAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCreativeIndex, setCurrentCreativeIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeVideoResponse | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [isAnalyzingSet, setIsAnalyzingSet] = useState<boolean>(false);
  const [hookScore, setHookScore] = useState<number>(0);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [showShareMenu, setShowShareMenu] = useState<boolean>(false);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await adsApi.getAdById(Number(id));
        // Transform single ad into array-based transformer and pick first
        const transformed = transformAdsWithAnalysis([response]);
        setAd(transformed[0]);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load ad');
        }
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchAd();
    }
  }, [id]);

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showShareMenu) {
        setShowShareMenu(false);
      }
    };

    if (showShareMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showShareMenu]);

  useEffect(() => {
    if (ad?.analysis?.hook_score !== undefined && ad?.analysis?.hook_score !== null) {
      setHookScore(ad.analysis.hook_score as number);
    } else {
      setHookScore(0);
    }
    if (ad?.is_favorite !== undefined) {
      setIsFavorite(ad.is_favorite);
    }
    if (ad?.ad_set_id) {
      try {
        const cached = localStorage.getItem(`adSetAnalysis:${ad.ad_set_id}`);
        if (cached) {
          const parsed: AnalyzeVideoResponse = JSON.parse(cached);
          setAnalysis(parsed);
          setPrompts(parsed.generation_prompts || []);
        }
      } catch {}
    }
  }, [ad?.id, ad?.analysis?.hook_score, ad?.ad_set_id, ad?.is_favorite]);

  const handleRefresh = async () => {
    if (isRefreshing || !ad) return;
    
    setIsRefreshing(true);
    try {
      // If part of ad set, refresh all ads in the set
      if (ad.ad_set_id && ad.variant_count && ad.variant_count > 1) {
        const result = await adsApi.refreshAdSetMedia(ad.ad_set_id);
        console.log('Ad set refreshed:', result);
        alert(`✓ Refreshed ${result.successful}/${result.total} ads in set!`);
      } else {
        // Single ad refresh
        const result = await adsApi.refreshMediaFromFacebook(ad.id);
        console.log('Ad refreshed:', result);
        alert('✓ Media refreshed successfully!');
      }
      // Reload page to show updated media
      window.location.reload();
    } catch (error) {
      console.error('Failed to refresh:', error);
      alert('✗ Failed to refresh media');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!ad) return;
    try {
      const result = await adsApi.toggleFavorite(ad.id);
      setIsFavorite(result.is_favorite);
      // Update the ad state
      setAd(prev => prev ? { ...prev, is_favorite: result.is_favorite } : prev);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      alert('✗ Failed to update favorite status');
    }
  };

  const handleShare = async (type: 'copy' | 'download') => {
    if (!ad) return;
    
    if (type === 'copy') {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('✓ Link copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy link:', error);
        alert('✗ Failed to copy link');
      }
    } else if (type === 'download') {
      // Create a downloadable summary
      const summary = {
        ad_id: ad.id,
        ad_archive_id: ad.ad_archive_id,
        competitor: ad.competitor?.name || ad.page_name,
        title: ad.main_title,
        body: ad.main_body_text,
        cta: ad.cta_text,
        analysis: ad.analysis ? {
          summary: ad.analysis.summary,
          hook_score: ad.analysis.hook_score,
          overall_score: ad.analysis.overall_score,
          target_audience: ad.analysis.target_audience,
          content_themes: ad.analysis.content_themes
        } : null,
        url: window.location.href,
        exported_at: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ad-${ad.id}-summary.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setShowShareMenu(false);
  };

  const currentCreative = ad?.creatives?.[currentCreativeIndex];
  const media = currentCreative?.media?.[0];

  const renderMedia = () => {
    // Try to get media from creatives first
    if (media) {
      return (
        <div className="rounded-lg overflow-hidden border border-border/20 bg-card relative aspect-video max-h-[600px] w-full mx-auto">
          {media.type === 'Video' ? (
            <video key={media.url} src={media.url} controls className="w-full h-full object-contain" />
          ) : (
            <img src={media.url} alt={currentCreative?.title || 'Ad media'} className="w-full h-full object-contain" />
          )}
        </div>
      );
    }

    // Fallback to main media fields if creatives are empty
    if (ad?.media_type === 'video' && ad?.media_url) {
      return (
        <div className="rounded-lg overflow-hidden border border-border/20 bg-card relative aspect-video max-h-[600px] w-full mx-auto">
          <video key={ad.media_url} src={ad.media_url} controls className="w-full h-full object-contain" />
        </div>
      );
    }

    if (ad?.media_type === 'image' && ad?.media_url) {
      return (
        <div className="rounded-lg overflow-hidden border border-border/20 bg-card relative aspect-video max-h-[600px] w-full mx-auto">
          <img src={ad.media_url} alt={ad.main_title || 'Ad media'} className="w-full h-full object-contain" />
        </div>
      );
    }

    return null;
  };
  
  const renderCarouselControls = () => {
    if (!ad?.creatives || ad.creatives.length <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-4 mt-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setCurrentCreativeIndex(prev => (prev - 1 + ad.creatives.length) % ad.creatives.length)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground font-mono">
          Creative {currentCreativeIndex + 1} / {ad.creatives.length}
        </span>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setCurrentCreativeIndex(prev => (prev + 1) % ad.creatives.length)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const formatAdDuration = (startDateStr?: string, endDateStr?: string, isActive?: boolean): { formattedDate: string | null, duration: number | null, isActive: boolean } => {
    if (!startDateStr) return { formattedDate: null, duration: null, isActive: false };
    try {
      const startDate = parseISO(startDateStr);
      const endDate = endDateStr ? parseISO(endDateStr) : new Date();
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return { formattedDate: null, duration: null, isActive: false };
      
      let duration = differenceInDays(endDate, startDate);
      duration = Math.max(duration, 1);
  
      const formattedStartDate = format(startDate, 'MMM d, yyyy');
      const formattedEndDate = endDateStr ? format(parseISO(endDateStr), 'MMM d, yyyy') : 'Present';
  
      if (isActive) {
        return { 
          formattedDate: `Running since ${formattedStartDate}`, 
          duration, 
          isActive: true 
        };
      }
  
      return { 
        formattedDate: `${formattedStartDate} - ${formattedEndDate}`, 
        duration, 
        isActive: false 
      };
    } catch (error) {
      console.error("Error formatting ad duration:", error);
      return { formattedDate: null, duration: null, isActive: false };
    }
  };

  const analyzeCurrentAd = async () => {
    if (!ad) return;
    try {
      setAnalyzing(true);
      const body: any = {};
      if (media?.type === 'Video' && media?.url) {
        body.video_url = media.url;
      }
      const res = await fetch(`/api/v1/ads/${ad.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, async: false, use_task: false })
      });
      if (!res.ok) throw new Error('Analyze failed');
      const data: AnalyzeVideoResponse = await res.json();

      if (data.source === 'celery-task' && data.raw?.task_id) {
        const taskId = data.raw.task_id;
        const pollInterval = setInterval(async () => {
          try {
            const status = await adsApi.getAdAnalysisTaskStatus(taskId);
            if (status.state === 'SUCCESS' && status.result) {
              clearInterval(pollInterval);
              const finalData = status.result;
              setAnalysis(finalData);
              setPrompts(finalData.generation_prompts || []);
              if (ad?.ad_set_id) {
                try { localStorage.setItem(`adSetAnalysis:${ad.ad_set_id}`, JSON.stringify(finalData)); } catch {}
              }
              setAnalyzing(false);
            } else if (status.state === 'FAILURE') {
              clearInterval(pollInterval);
              alert(`Analysis failed: ${status.error}`);
              setAnalyzing(false);
            }
          } catch (e) {
            console.error(e);
          }
        }, 2000);
        
        // Safety timeout
        setTimeout(() => {
            clearInterval(pollInterval);
            if (analyzing) setAnalyzing(false);
        }, 300000);
        return;
      }

      setAnalysis(data);
      setPrompts(data.generation_prompts || []);
      if (ad?.ad_set_id) {
        try { localStorage.setItem(`adSetAnalysis:${ad.ad_set_id}`, JSON.stringify(data)); } catch {}
      }
      setAnalyzing(false);
    } catch (e) {
      console.error(e);
      alert('Failed to analyze ad');
      setAnalyzing(false);
    }
  };

  const analyzeAdSetBestVariant = async () => {
    if (!ad?.ad_set_id) return;
    try {
      setIsAnalyzingSet(true);
      const variantsResp = await adsApi.getAdsInSet(ad.ad_set_id, 1, 50);
      const variants = variantsResp.data || [];
      if (variants.length === 0) throw new Error('No variants in set');
      const transformed = transformAdsWithAnalysis(variants);
      const pickBest = (adsArr: AdWithAnalysis[]) => {
        let best = adsArr[0];
        const days = (a: AdWithAnalysis) => {
          try {
            const start = a.start_date ? parseISO(a.start_date) : null;
            const end = a.end_date ? parseISO(a.end_date) : new Date();
            if (!start) return 0;
            return Math.max(1, differenceInDays(end, start));
          } catch { return 0; }
        };
        for (const item of adsArr) {
          if (days(item) > days(best)) best = item;
        }
        return best;
      };
      const bestVariant = pickBest(transformed);
      const res = await fetch(`/api/v1/ads/${bestVariant.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ async: false, use_task: false })
      });
      if (!res.ok) throw new Error('Analyze set failed');
      const data: AnalyzeVideoResponse = await res.json();

      if (data.source === 'celery-task' && data.raw?.task_id) {
        const taskId = data.raw.task_id;
        const pollInterval = setInterval(async () => {
          try {
            const status = await adsApi.getAdAnalysisTaskStatus(taskId);
            if (status.state === 'SUCCESS' && status.result) {
              clearInterval(pollInterval);
              const finalData = status.result;
              setAnalysis(finalData);
              setPrompts(finalData.generation_prompts || []);
              if (ad?.ad_set_id) {
                try { localStorage.setItem(`adSetAnalysis:${ad.ad_set_id}`, JSON.stringify(finalData)); } catch {}
              }
              alert(`Analyzed best variant (ID: ${bestVariant.id})`);
              setIsAnalyzingSet(false);
            } else if (status.state === 'FAILURE') {
              clearInterval(pollInterval);
              alert(`Analysis set failed: ${status.error}`);
              setIsAnalyzingSet(false);
            }
          } catch (e) {
            console.error(e);
          }
        }, 2000);

        setTimeout(() => {
            clearInterval(pollInterval);
            if (isAnalyzingSet) setIsAnalyzingSet(false);
        }, 300000);
        return;
      }

      setAnalysis(data);
      setPrompts(data.generation_prompts || []);
      if (ad?.ad_set_id) {
        try { localStorage.setItem(`adSetAnalysis:${ad.ad_set_id}`, JSON.stringify(data)); } catch {}
      }
      alert(`Analyzed best variant (ID: ${bestVariant.id})`);
      setIsAnalyzingSet(false);
    } catch (e) {
      console.error(e);
      alert('Failed to analyze ad set');
      setIsAnalyzingSet(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-sm text-muted-foreground">Loading ad details...</div>
      </DashboardLayout>
    );
  }

  if (error || !ad) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-red-400">{error || 'Ad not found'}</div>
      </DashboardLayout>
    );
  }

  const countries = ad.targeting?.locations?.map(l => l.name) || [];
  const hasHighScore = ad.analysis?.overall_score && ad.analysis.overall_score > 8;
  const adDuration = formatAdDuration(ad.start_date, ad.end_date, ad.is_active);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-8">
        {/* Back Button and Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back to Ads
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleToggleFavorite}
              className={cn(
                "transition-colors",
                isFavorite 
                  ? "bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20" 
                  : "border-neutral-700 hover:bg-neutral-800"
              )}
            >
              <Heart className={cn("h-4 w-4 mr-2", isFavorite && "fill-current")} />
              {isFavorite ? 'Favorited' : 'Add to Favorites'}
            </Button>
            
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="border-neutral-700 hover:bg-neutral-800"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              
              {showShareMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-lg shadow-lg z-10">
                  <div className="p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShare('copy')}
                      className="w-full justify-start text-neutral-300 hover:bg-neutral-800"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShare('download')}
                      className="w-full justify-start text-neutral-300 hover:bg-neutral-800"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Summary
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://www.facebook.com/ads/library/?id=${ad.ad_archive_id}`, '_blank')}
                      className="w-full justify-start text-neutral-300 hover:bg-neutral-800"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on Facebook
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              title={ad?.ad_set_id && ad?.variant_count && ad.variant_count > 1 ? `Refresh all ${ad.variant_count} ads in set` : "Refresh ad media"}
              className="border-neutral-700 hover:bg-neutral-800"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Media'}
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4">
          <Avatar className="size-16 ring-2 ring-border/20">
            <AvatarImage 
              src={ad.page_profile_picture_url || ad.competitor?.page_id ? `https://graph.facebook.com/${ad.competitor?.page_id}/picture?width=64&height=64` : undefined} 
              alt={ad.competitor?.name || ad.page_name || 'Competitor'} 
              className="object-cover" 
            />
            <AvatarFallback className="bg-gradient-to-br from-photon-900 to-photon-800 text-photon-200 font-mono text-sm font-semibold">
              {(ad.competitor?.name || ad.page_name || 'AD').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {ad.competitor?.name || ad.page_name || 'Unknown Competitor'}
              {hasHighScore && <Zap className="h-5 w-5 text-photon-400 fill-photon-400" />}
            </h1>
            <p className="text-sm text-muted-foreground">Ad ID: {ad.id} • Archive ID: {ad.ad_archive_id}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground pt-1">
              {adDuration.formattedDate && (
                <div className="flex items-center gap-1.5" title={`${adDuration.formattedDate} (${adDuration.duration} days)`}>
                  <Calendar className="h-4 w-4" />
                  <span>{adDuration.formattedDate}</span>
                  {adDuration.duration && (
                    <span className={cn("font-medium", adDuration.isActive ? "text-photon-400" : "")}>
                      • {adDuration.duration} {adDuration.duration === 1 ? 'day' : 'days'}
                    </span>
                  )}
                </div>
              )}
              {ad.display_format && (
                <div className="flex items-center gap-1.5" title={`Display Format: ${ad.display_format}`}>
                  <Info className="h-4 w-4" />
                  <span>{ad.display_format}</span>
                </div>
              )}
              {countries.length > 0 && (
                <div className="flex items-center gap-1.5" title={countries.join(', ')}>
                  <Globe2 className="h-4 w-4" />
                  <span>{countries.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end text-right space-y-3">
            {/* Performance Badge */}
            {hasHighScore && (
              <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50 text-yellow-400">
                <Award className="h-3 w-3 mr-1" />
                High Performer
              </Badge>
            )}
            
            {/* Scores Grid */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1 text-foreground">
                  <BarChart3 className="h-4 w-4 text-green-400" />
                  <span className="font-mono font-bold text-xl">
                    {ad.analysis?.overall_score !== undefined && ad.analysis?.overall_score !== null ? ad.analysis.overall_score.toFixed(1) : '0.0'}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">Overall</span>
                <div className="w-12 bg-neutral-800 h-1 rounded-full mx-auto overflow-hidden">
                  <div 
                    className="bg-green-400 h-full transition-all duration-500" 
                    style={{ width: `${((ad.analysis?.overall_score || 0) / 10) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1 text-foreground">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="font-mono font-bold text-xl">
                    {hookScore !== undefined && hookScore !== null ? (hookScore.toFixed ? hookScore.toFixed(1) : hookScore) : '0.0'}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">Hook</span>
                <div className="w-12 bg-neutral-800 h-1 rounded-full mx-auto overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-500" 
                    style={{ width: `${((hookScore || 0) / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Duration Badge */}
            {adDuration.duration && (
              <Badge variant="outline" className="border-neutral-700 text-neutral-400">
                <Clock className="h-3 w-3 mr-1" />
                {adDuration.duration}d {adDuration.isActive ? 'running' : 'ran'}
              </Badge>
            )}
          </div>
        </div>

        {/* Media */}
        {renderMedia()}
        {renderCarouselControls()}

        {/* Performance Insights */}
        {ad.analysis && (
          <Card className="border-neutral-800 bg-gradient-to-br from-neutral-900/50 to-neutral-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Performance Insights
              </CardTitle>
              <CardDescription>
                AI-powered analysis and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Quick Stats */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-neutral-300">Quick Stats</h4>
                  <div className="space-y-3">
                    {ad.analysis.overall_score && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-400">Overall Score</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">{ad.analysis.overall_score?.toFixed(1) || '0.0'}</span>
                          <div className="w-16 bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-green-400 h-full transition-all duration-500" 
                              style={{ width: `${((ad.analysis.overall_score || 0) / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {ad.analysis.hook_score && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-400">Hook Score</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">{ad.analysis.hook_score?.toFixed(1) || '0.0'}</span>
                          <div className="w-16 bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-primary h-full transition-all duration-500" 
                              style={{ width: `${((ad.analysis.hook_score || 0) / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {ad.analysis.confidence_score && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-400">Confidence</span>
                        <span className="font-mono font-semibold">{ad.analysis.confidence_score?.toFixed(1) || '0.0'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Target Audience */}
                {ad.analysis.target_audience && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-neutral-300 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Target Audience
                    </h4>
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      {ad.analysis.target_audience}
                    </p>
                  </div>
                )}

                {/* Content Themes */}
                {ad.analysis.content_themes && ad.analysis.content_themes.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-neutral-300">Content Themes</h4>
                    <div className="flex flex-wrap gap-2">
                      {ad.analysis.content_themes.map((theme, index) => (
                        <Badge key={index} variant="secondary" className="bg-neutral-800 text-neutral-300 text-xs">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              {ad.analysis.summary && (
                <div className="mt-6 pt-6 border-t border-neutral-800">
                  <h4 className="font-semibold text-sm text-neutral-300 mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    AI Summary
                  </h4>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    {ad.analysis.summary}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Enhanced Analysis Showcase */}
        {ad.analysis && (
          <div className="grid lg:grid-cols-2 gap-6 mt-6">
            {/* Creative Analysis */}
            <Card className="border-neutral-800 bg-gradient-to-br from-blue-900/10 to-blue-900/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-400" />
                  Creative Analysis
                </CardTitle>
                <CardDescription>
                  AI-powered insights into creative effectiveness
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Strengths */}
                {ad.analysis.strengths && ad.analysis.strengths.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-green-400 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      What Works Well
                    </h4>
                    <ul className="space-y-1">
                      {ad.analysis.strengths.slice(0, 3).map((strength, index) => (
                        <li key={index} className="text-sm text-neutral-300 flex items-start gap-2">
                          <div className="w-1 h-1 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {ad.analysis.recommendations && ad.analysis.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-yellow-400 mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Improvement Opportunities
                    </h4>
                    <ul className="space-y-1">
                      {ad.analysis.recommendations.slice(0, 3).map((rec, index) => (
                        <li key={index} className="text-sm text-neutral-300 flex items-start gap-2">
                          <div className="w-1 h-1 bg-yellow-400 rounded-full mt-2 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card className="border-neutral-800 bg-gradient-to-br from-green-900/10 to-green-900/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-400" />
                  Performance Metrics
                </CardTitle>
                <CardDescription>
                  Quantitative analysis and scoring
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Scores Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {ad.analysis.overall_score && (
                    <div className="text-center p-3 rounded-lg bg-neutral-900/50">
                      <div className="text-2xl font-bold text-green-400">
                        {ad.analysis.overall_score?.toFixed(1) || '0.0'}
                      </div>
                      <div className="text-xs text-neutral-400">Overall Score</div>
                      <div className="w-full bg-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-green-400 h-full transition-all duration-500" 
                          style={{ width: `${(ad.analysis.overall_score / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {ad.analysis.hook_score && (
                    <div className="text-center p-3 rounded-lg bg-neutral-900/50">
                      <div className="text-2xl font-bold text-primary">
                        {ad.analysis.hook_score?.toFixed(1) || '0.0'}
                      </div>
                      <div className="text-xs text-neutral-400">Hook Score</div>
                      <div className="w-full bg-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-primary h-full transition-all duration-500" 
                          style={{ width: `${(ad.analysis.hook_score / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Performance Category */}
                <div className="text-center">
                  <Badge 
                    className={cn(
                      "text-sm px-3 py-1",
                      (ad.analysis.overall_score || 0) >= 8 ? "bg-green-500/20 text-green-400 border-green-500/50" :
                      (ad.analysis.overall_score || 0) >= 6 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50" :
                      "bg-red-500/20 text-red-400 border-red-500/50"
                    )}
                  >
                    {(ad.analysis.overall_score || 0) >= 8 ? "High Performer" :
                     (ad.analysis.overall_score || 0) >= 6 ? "Good Performance" :
                     "Needs Improvement"}
                  </Badge>
                </div>

                {/* Analysis Metadata */}
                <div className="text-xs text-neutral-500 space-y-1">
                  <div>Analysis Version: {ad.analysis.analysis_version || 'N/A'}</div>
                  <div>Last Updated: {ad.analysis.updated_at ? format(parseISO(ad.analysis.updated_at), 'MMM d, yyyy') : 'N/A'}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Unified Analysis Panel */}
        <div className="mt-6">
          {ad.id && (
            <UnifiedAnalysisPanel
              adId={ad.id}
              adSetId={ad.ad_set_id}
              showAdSetAnalysis={!!(ad.ad_set_id && ad.variant_count && ad.variant_count > 1)}
              onAnalysisComplete={(analysisResult) => {
                // Update the ad state with new analysis data
                setAd(prev => prev ? {
                  ...prev,
                  analysis: {
                    id: analysisResult.analysis_id || 0,
                    summary: analysisResult.summary,
                    hook_score: analysisResult.hook_score,
                    overall_score: analysisResult.overall_score,
                    target_audience: analysisResult.target_audience,
                    content_themes: analysisResult.content_themes || [],
                    analysis_version: 'unified_v1.0',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }
                } : prev);
                
                // Update hook score state
                if (analysisResult.hook_score !== undefined) {
                  setHookScore(analysisResult.hook_score);
                }
              }}
            />
          )}
        </div>

        {/* Content & Analysis */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Ad Content */}
          <Card>
            <CardHeader>
              <CardTitle>Ad Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {(currentCreative?.title || ad.main_title) && <p><strong>Title:</strong> {currentCreative?.title || ad.main_title}</p>}
              {(currentCreative?.body || ad.main_body_text) && <p><strong>Body:</strong> <span className="whitespace-pre-wrap">{currentCreative?.body || ad.main_body_text}</span></p>}
              {(currentCreative?.cta?.text || ad.cta_text) && <p><strong>CTA:</strong> {currentCreative?.cta?.text || ad.cta_text}</p>}
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground flex gap-4">
              <div className="flex items-center gap-1"><Eye className="h-3 w-3" />{ad.impressions_text || 'Unknown'}</div>
              {ad.spend && <div className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{ad.spend}</div>}
            </CardFooter>
          </Card>

          {/* AI Analysis Summary */}
          <Card>
            <CardHeader>
              <CardTitle>AI Analysis Summary</CardTitle>
              <CardDescription>Key insights and metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {ad.analysis ? (
                <>
                  {ad.analysis.summary && (
                    <div>
                      <strong>Summary:</strong>
                      <p className="mt-1 text-neutral-300 leading-relaxed">{ad.analysis.summary}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {ad.analysis.hook_score !== undefined && (
                      <div className="text-center p-2 rounded bg-neutral-900/50">
                        <div className="text-lg font-bold text-primary">{ad.analysis.hook_score?.toFixed(1) || '0.0'}</div>
                        <div className="text-xs text-neutral-400">Hook Score</div>
                      </div>
                    )}
                    {ad.analysis.overall_score !== undefined && (
                      <div className="text-center p-2 rounded bg-neutral-900/50">
                        <div className="text-lg font-bold text-green-400">{ad.analysis.overall_score?.toFixed(1) || '0.0'}</div>
                        <div className="text-xs text-neutral-400">Overall Score</div>
                      </div>
                    )}
                  </div>
                  
                  {ad.analysis.target_audience && (
                    <div>
                      <strong>Target Audience:</strong>
                      <p className="mt-1 text-neutral-300">{ad.analysis.target_audience}</p>
                    </div>
                  )}
                  
                  {ad.analysis.content_themes && ad.analysis.content_themes.length > 0 && (
                    <div>
                      <strong>Content Themes:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ad.analysis.content_themes.map((theme, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p>No analysis data available.</p>
              )}
            </CardContent>
          </Card>

          {/* Lead Form */}
          {ad.lead_form && (
            <Card>
              <CardHeader>
                <CardTitle>Lead Form Preview</CardTitle>
                <CardDescription>A visual representation of the extracted form.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Standalone text fields */}
                {ad.lead_form.standalone_fields?.map((field) => (
                  <div key={field} className="grid w-full items-center gap-2">
                    <Label htmlFor={field} className="text-muted-foreground">{field}</Label>
                    <Input type="text" id={field} readOnly className="bg-muted/50" />
                  </div>
                ))}

                {/* Multi-choice questions */}
                {ad.lead_form.questions && Object.entries(ad.lead_form.questions).map(([question, options]) => (
                  <div key={question} className="grid w-full items-center gap-2">
                    <Label className="text-muted-foreground">{question}</Label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {Array.isArray(options) && options.map((option) => (
                        <Badge key={option} variant="outline" className="cursor-not-allowed font-normal">
                          {option}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button disabled className="w-full">
                  Submit
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        {/* Creatives Data */}
        {ad.creatives && ad.creatives.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Creatives ({ad.creatives.length})</CardTitle>
              <CardDescription>Carousel or multi-card content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ad.creatives.map((creative, i) => (
                  <CreativeCard key={creative.id || i} creative={creative} index={i} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Raw Data */}
        <Card>
          <CardHeader>
            <CardTitle>Raw Data</CardTitle>
            <CardDescription>Technical details for debugging</CardDescription>
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

