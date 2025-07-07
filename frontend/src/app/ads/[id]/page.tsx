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
import { Play, Image, ArrowLeft, Globe2, Eye, DollarSign, Zap, TrendingUp, ChevronLeft, ChevronRight, Calendar, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, format, parseISO } from 'date-fns';

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

  const currentCreative = ad?.creatives?.[currentCreativeIndex];
  const media = currentCreative?.media?.[0];

  const renderMedia = () => {
    if (!media) return null;

    return (
      <div className="rounded-lg overflow-hidden border border-border/20 bg-card relative aspect-video max-h-[600px] w-full mx-auto">
        {media.type === 'Video' ? (
          <video key={media.url} src={media.url} controls className="w-full h-full object-contain" />
        ) : (
          <img src={media.url} alt={currentCreative?.title || 'Ad media'} className="w-full h-full object-contain" />
        )}
      </div>
    );
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
        {/* Back Button */}
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to Ads
        </Button>

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
          <div className="flex flex-col items-end text-right">
            <div className="flex items-center gap-1 text-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="font-mono font-semibold text-lg">
                {ad.analysis?.overall_score ? ad.analysis.overall_score.toFixed(1) : 'N/A'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Overall Score</span>
          </div>
        </div>

        {/* Media */}
        {renderMedia()}
        {renderCarouselControls()}

        {/* Content & Analysis */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Ad Content */}
          <Card>
            <CardHeader>
              <CardTitle>Ad Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {currentCreative?.title && <p><strong>Title:</strong> {currentCreative.title}</p>}
              {currentCreative?.body && <p><strong>Body:</strong> <span className="whitespace-pre-wrap">{currentCreative.body}</span></p>}
              {currentCreative?.cta?.text && <p><strong>CTA:</strong> {currentCreative.cta.text}</p>}
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground flex gap-4">
              <div className="flex items-center gap-1"><Eye className="h-3 w-3" />{ad.impressions_text || 'Unknown'}</div>
              {ad.spend && <div className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{ad.spend}</div>}
            </CardFooter>
          </Card>

          {/* AI Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>AI Analysis</CardTitle>
              <CardDescription>Insights generated by AI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {ad.analysis ? (
                <>
                  {ad.analysis.summary && <p><strong>Summary:</strong> {ad.analysis.summary}</p>}
                  {ad.analysis.hook_score !== undefined && <p><strong>Hook Score:</strong> {ad.analysis.hook_score}</p>}
                  {ad.analysis.overall_score !== undefined && <p><strong>Overall Score:</strong> {ad.analysis.overall_score}</p>}
                  {ad.analysis.confidence_score !== undefined && <p><strong>Confidence:</strong> {ad.analysis.confidence_score}</p>}
                  {ad.analysis.target_audience && <p><strong>Target Audience:</strong> {ad.analysis.target_audience}</p>}
                  {ad.analysis.content_themes && <p><strong>Themes:</strong> {ad.analysis.content_themes.join(', ')}</p>}
                  {ad.analysis.analysis_version && <p><strong>Version:</strong> {ad.analysis.analysis_version}</p>}
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