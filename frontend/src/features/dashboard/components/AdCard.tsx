'use client';
import React from 'react';
import { AdWithAnalysis } from '@/types/ad';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Play, Image, Star, TrendingUp, Eye, DollarSign, Globe2, Loader2, ChevronLeft, ChevronRight, FileText, Calendar, Info, Clock, ChevronDown } from 'lucide-react';
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
        formattedDate: `Since ${formattedStartDate}`, 
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

export function AdCard({ 
  ad, 
  isSelected = false, 
  isDeleting = false, 
  onSelectionChange, 
  showSelection = false 
}: AdCardProps) {
  const router = useRouter();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showFullContent, setShowFullContent] = useState(false);
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
  const adDuration = formatAdDuration(ad.start_date, ad.end_date, ad.is_active);

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

  const handleSeeMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFullContent(!showFullContent);
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
        
        {/* Media Section - Now at the top of the card for more prominence */}
        {primaryMediaUrl && (
          <div className="relative overflow-hidden">
            {isVideo ? (
              <div className="relative">
                <video 
                  src={primaryMediaUrl}
                  className="w-full h-44 object-cover"
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
                className="w-full h-44 object-cover group-hover:scale-[1.02] transition-transform duration-300"
                loading="lazy"
              />
            )}
            
            {/* Carousel indicators directly overlaid on media */}
            {hasMultipleCreatives && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {ad.creatives.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentCardIndex(index);
                    }}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-all duration-200",
                      currentCardIndex === index ? "bg-white scale-110" : "bg-white/50 hover:bg-white/80"
                    )}
                  />
                ))}
              </div>
            )}
            
            {/* Carousel navigation */}
            {hasMultipleCreatives && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentCardIndex(prev => prev > 0 ? prev - 1 : (ad.creatives?.length || 1) - 1);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-black/30 hover:bg-black/50 rounded-full carousel-control"
                >
                  <ChevronLeft className="h-4 w-4 text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentCardIndex(prev => prev < ((ad.creatives?.length || 1) - 1) ? prev + 1 : 0);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/30 hover:bg-black/50 rounded-full carousel-control"
                >
                  <ChevronRight className="h-4 w-4 text-white" />
                </button>
              </>
            )}
          </div>
        )}
        
        <CardHeader className="pb-2 relative pt-3">
          <div className="flex items-start space-x-3">
            <Avatar className="size-10 ring-2 ring-border/20 group-hover:ring-photon-500/30 transition-all duration-300">
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
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-mono font-semibold text-sm text-foreground truncate">
                  {ad.competitor?.name || ad.page_name || 'Unknown Competitor'}
                </h4>
                {hasHighScore && (
                  <Star className="h-3.5 w-3.5 text-photon-400 fill-photon-400" />
                )}
              </div>
              
              {/* Improved Ad Duration Display */}
              {adDuration.formattedDate && (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{adDuration.formattedDate}</span>
                  </div>
                  
                  {adDuration.duration && (
                    <div className={cn(
                      "flex items-center gap-1 font-medium",
                      adDuration.isActive ? "text-photon-400" : "text-muted-foreground"
                    )}>
                      <Clock className="h-3 w-3" />
                      <span>{adDuration.duration} {adDuration.duration === 1 ? 'day' : 'days'}</span>
                    </div>
                  )}
                </div>
              )}
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
        
        <CardContent className="flex-1 px-4 py-2">
          {/* Content Section with See More functionality */}
          <div className="space-y-2">
            <h5 className="font-medium text-sm text-foreground line-clamp-1 leading-relaxed">
              {ad.main_title || ad.page_name || 'Ad'}
            </h5>
            
            {displayContent && (
              <div>
                <p className={cn(
                  "text-xs text-muted-foreground leading-relaxed overflow-hidden",
                  showFullContent ? "" : "line-clamp-2"
                )}>
                  {displayContent}
                </p>
                
                {displayContent.length > 120 && (
                  <button 
                    onClick={handleSeeMoreClick}
                    className="text-xs text-photon-400 hover:text-photon-300 mt-1 flex items-center gap-1 carousel-control"
                  >
                    {showFullContent ? 'See less' : 'See more'}
                    <ChevronDown className={cn(
                      "h-3 w-3 transition-transform",
                      showFullContent ? "rotate-180" : ""
                    )} />
                  </button>
                )}
              </div>
            )}
            
            {/* CTA if present */}
            {ctaText && (
              <div className="mt-2">
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-photon-500/10 border border-photon-500/20">
                  <span className="text-xs text-photon-400 font-medium">
                    {ctaText}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="pt-2 pb-3 px-4 text-xs text-muted-foreground">
          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Only keep the most important metrics */}
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
            </div>
            
            {countries.length > 0 && (
              <div className="flex items-center gap-1 truncate" title={countries.join(', ')}>
                <Globe2 className="h-3.5 w-3.5" />
                <span className="font-mono text-xs truncate">
                  {countries.length > 1 ? `${countries[0]} +${countries.length - 1}` : countries[0]}
                </span>
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default AdCard; 