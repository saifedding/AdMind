'use client';
import React from 'react';
import { AdWithAnalysis } from '@/types/ad';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Play, Image, Star, TrendingUp, Eye, DollarSign, Globe2, Loader2, ChevronLeft, ChevronRight, FileText, Calendar, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { differenceInDays, format, parseISO } from 'date-fns';

interface AdCardProps {
  ad: AdWithAnalysis;
  isSelected?: boolean;
  isDeleting?: boolean;
  onSelectionChange?: (adId: number, selected: boolean) => void;
  showSelection?: boolean;
}

// Helper function to get main ad content for display
const getMainAdContent = (ad: AdWithAnalysis): string => {
  // Use the main body text, title, or caption from the individual fields
  return ad.main_body_text || ad.main_title || ad.main_caption || ad.ad_copy || 'No content available';
};

const formatAdDuration = (startDateStr?: string, endDateStr?: string, isActive?: boolean): string | null => {
  if (!startDateStr) return null;
  try {
    const startDate = parseISO(startDateStr);
    const endDate = endDateStr ? parseISO(endDateStr) : new Date();
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
    
    let duration = differenceInDays(endDate, startDate);
    duration = Math.max(duration, 1);

    const formattedStartDate = format(startDate, 'MMM d, yyyy');

    if (isActive) {
      return `Running since ${formattedStartDate} (${duration} ${duration > 1 ? 'days' : 'day'})`;
    }

    const formattedEndDate = endDateStr ? format(parseISO(endDateStr), 'MMM d, yyyy') : 'now';
    return `Ran from ${formattedStartDate} to ${formattedEndDate} (${duration} ${duration > 1 ? 'days' : 'day'})`;
  } catch (error) {
    console.error("Error formatting ad duration:", error);
    return null;
  }
};

export function AdCard({ 
  ad, 
  isSelected = false, 
  isDeleting = false, 
  onSelectionChange, 
  showSelection = false 
}: AdCardProps) {
  const router = useRouter();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const hasHighScore = ad.analysis?.overall_score && ad.analysis.overall_score > 8;
  
  const hasMultipleCreatives = ad.creatives && ad.creatives.length > 1;
  const currentCreative = ad.creatives?.[currentCardIndex];
  
  // Get the primary media URL from the current creative, with fallbacks
  const getPrimaryMedia = () => {
    if (currentCreative?.media && currentCreative.media.length > 0) {
      const video = currentCreative.media.find(m => m.type === 'Video');
      if (video) return { url: video.url, isVideo: true };
      
      const image = currentCreative.media.find(m => m.type === 'Image');
      if (image) return { url: image.url, isVideo: false };
    }
    // Fallback for older data structures or single-media ads
    const videoUrl = ad.main_video_urls?.[0] || (ad.media_type === 'video' ? ad.media_url : null);
    if (videoUrl) return { url: videoUrl, isVideo: true };

    const imageUrl = ad.main_image_urls?.[0] || (ad.media_type === 'image' ? ad.media_url : null);
    if (imageUrl) return { url: imageUrl, isVideo: false };

    return { url: ad.media_url, isVideo: ad.media_type === 'video' };
  };

  const { url: primaryMediaUrl, isVideo } = getPrimaryMedia();
  
  // Get main content for display
  const displayContent = getMainAdContent(ad);
  
  // Format score for display
  const scoreText = ad.analysis?.overall_score 
    ? `${ad.analysis.overall_score.toFixed(1)}`
    : 'N/A';
  
  // Get impressions text
  const impressionsText = ad.impressions_text || 'Unknown';
  
  // Get CTA text - prioritize current creative, then meta
  const ctaText = currentCreative?.cta?.text || ad.meta?.cta_type || ad.cta_text || '';

  const countries = ad.targeting?.locations?.map(l => l.name) || [];
  const hasLeadForm = ad.lead_form?.questions && Object.keys(ad.lead_form.questions).length > 0;
  const durationInfo = formatAdDuration(ad.start_date, ad.end_date, ad.is_active);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on checkbox or carousel controls
    if (showSelection && (e.target as HTMLElement).closest('.checkbox-container')) {
      return;
    }
    if ((e.target as HTMLElement).closest('.carousel-control')) {
      return;
    }
    router.push(`/ads/${ad.id}`);
  };

  const handleSelectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (ad.id) {
      onSelectionChange?.(ad.id, e.target.checked);
    }
  };

  return (
    <div className="group relative cursor-pointer" onClick={handleCardClick}>
      <Card className={cn(
        "h-full flex flex-col relative overflow-hidden transition-all duration-300",
        "hover:translate-y-[-2px] hover:bg-card/80 backdrop-blur-sm",
        "border-border/50 hover:border-border",
        hasHighScore && "border-photon-500/30 bg-gradient-to-br from-card via-card to-photon-950/10",
        isSelected && "border-photon-500/50 bg-photon-500/5",
        isDeleting && "opacity-50 scale-95 pointer-events-none"
      )}>
        {/* High Score Indicator */}
        {hasHighScore && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-photon-400 via-photon-500 to-photon-600" />
        )}
        
        {/* Selection Checkbox */}
        {showSelection && (
          <div className="absolute top-2 right-2 z-10 checkbox-container">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleSelectionChange}
              className="w-4 h-4 rounded border-border/60 bg-background/80 text-photon-500 focus:ring-photon-500/50 focus:ring-2 focus:ring-offset-0"
            />
          </div>
        )}
        
        {/* Deletion Overlay */}
        {isDeleting && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20 rounded-lg">
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-2">
              <span className="text-red-400 text-sm font-medium">Deleting...</span>
            </div>
          </div>
        )}
        
        <CardHeader className="pb-3 relative">
          <div className="flex items-start space-x-3">
            <Avatar className="size-11 ring-2 ring-border/20 group-hover:ring-photon-500/30 transition-all duration-300">
              <AvatarImage 
                src={ad.page_profile_picture_url || ad.competitor?.page_id 
                  ? `https://graph.facebook.com/${ad.competitor.page_id}/picture?width=44&height=44`
                  : undefined
                }
                alt={ad.competitor?.name || ad.page_name || 'Competitor'}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-photon-900 to-photon-800 text-photon-200 font-mono text-sm font-semibold">
                {(ad.competitor?.name || ad.page_name || 'AD').substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <h4 className="font-mono font-semibold text-sm text-foreground truncate">
                  {ad.competitor?.name || ad.page_name || 'Unknown Competitor'}
                </h4>
                {hasHighScore && (
                  <Star className="h-3.5 w-3.5 text-photon-400 fill-photon-400" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {durationInfo && (
                  <div className="flex items-center gap-1" title={durationInfo}>
                    <Calendar className="h-3 w-3" />
                    <span>{durationInfo.split('(')[0]}</span>
                  </div>
                )}
                {ad.display_format && (
                  <div className="flex items-center gap-1" title={`Display Format: ${ad.display_format}`}>
                    <Info className="h-3 w-3" />
                    <span>{ad.display_format}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Score Badge */}
            <div className={cn(
              "flex flex-col items-end text-right",
              hasHighScore ? "text-photon-300" : "text-muted-foreground"
            )}>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs font-mono font-semibold">{scoreText}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Score</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 px-6 pb-4">
          {/* Media Section */}
          {primaryMediaUrl && (
            <div className="mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-iridium-900/30 to-iridium-800/30 border border-border/30 relative group/media">
              {isVideo ? (
                <div className="relative">
                  <video 
                    src={primaryMediaUrl}
                    className="w-full h-36 object-cover"
                    preload="metadata"
                    muted
                    controls
                    playsInline
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover/media:opacity-100 transition-opacity duration-200">
                    <div className="bg-white/90 rounded-full p-2">
                      <Play className="h-4 w-4 text-black fill-black" />
                    </div>
                  </div>
                </div>
              ) : (
                <img 
                  src={primaryMediaUrl} 
                  alt={ad.main_title || ad.page_name || 'Ad'}
                  className="w-full h-36 object-cover group-hover/media:scale-[1.02] transition-transform duration-300"
                  loading="lazy"
                />
              )}
            </div>
          )}
          
          {/* Card Carousel Section */}
          {hasMultipleCreatives && currentCreative && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">
                    Creative {currentCardIndex + 1} of {ad.creatives.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentCardIndex(prev => prev > 0 ? prev - 1 : (ad.creatives?.length || 1) - 1);
                    }}
                    className="p-1 hover:bg-accent rounded-sm transition-colors carousel-control"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentCardIndex(prev => prev < ((ad.creatives?.length || 1) - 1) ? prev + 1 : 0);
                    }}
                    className="p-1 hover:bg-accent rounded-sm transition-colors carousel-control"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="bg-gradient-to-br from-accent/40 to-accent/20 border border-border/50 rounded-lg p-3">
                <div className="text-xs space-y-2">
                  {currentCreative.title && (
                    <div className="font-semibold text-foreground text-sm">
                      {currentCreative.title}
                    </div>
                  )}
                  {currentCreative.body && (
                    <div className="text-muted-foreground leading-relaxed">
                      {currentCreative.body}
                    </div>
                  )}
                  {ctaText && (
                    <div className="flex justify-start">
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-photon-500/10 border border-photon-500/20">
                        <span className="text-xs text-photon-400 font-medium">
                          {ctaText}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Card indicators */}
              <div className="flex justify-center gap-1 mt-2">
                {ad.creatives.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentCardIndex(index);
                    }}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-all duration-200",
                      currentCardIndex === index ? "bg-photon-400 scale-110" : "bg-muted-foreground/50 hover:bg-muted-foreground/80"
                    )}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Content Section */}
          <div className="space-y-3">
            <h5 className="font-medium text-sm text-foreground line-clamp-2 leading-relaxed">
              {ad.main_title || ad.page_name || 'Ad'}
            </h5>
            {displayContent && (
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                {displayContent}
              </p>
            )}
          </div>
          
          {/* Form Details Section */}
          {hasLeadForm && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-3 w-3 text-blue-400" />
                <span className="text-xs text-blue-400 font-medium">Lead Form</span>
              </div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {Object.entries(ad.lead_form.questions || {}).map(([question, answer]) => (
                  <div key={question} className="text-xs text-blue-300 leading-relaxed">
                    {typeof answer === 'string' ? answer : JSON.stringify(answer)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-3 pb-4 px-4 text-xs text-muted-foreground">
          <div className="flex-1 flex items-center gap-4 truncate">
            <div title="Impressions" className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              <span className="font-mono text-xs">{impressionsText}</span>
            </div>
            {ad.spend && (
              <div title="Spend" className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                <span className="font-mono text-xs">{ad.spend}</span>
              </div>
            )}
            {(countries.length > 0 || hasLeadForm) && (
              <div className="flex-grow border-t border-border/40 mx-2"></div>
            )}
            {hasLeadForm && (
              <div className="flex items-center gap-1.5" title="Has Lead Form">
                <FileText className="h-3.5 w-3.5 text-photon-400" />
                <span className="font-mono text-xs text-photon-400">Lead Form</span>
              </div>
            )}
            {countries.length > 0 && (
              <div className="flex items-center gap-1.5 truncate" title={countries.join(', ')}>
                <Globe2 className="h-3.5 w-3.5" />
                <span className="font-mono text-xs truncate">{countries.join(', ')}</span>
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default AdCard; 