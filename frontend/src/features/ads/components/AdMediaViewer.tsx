'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AdWithAnalysis } from '@/types/ad';

interface AdMediaViewerProps {
  ad: AdWithAnalysis;
  currentCreativeIndex: number;
  onCreativeIndexChange: (index: number) => void;
}

export function AdMediaViewer({ ad, currentCreativeIndex, onCreativeIndexChange }: AdMediaViewerProps) {
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
          onClick={() => onCreativeIndexChange((currentCreativeIndex - 1 + ad.creatives.length) % ad.creatives.length)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground font-mono">
          Creative {currentCreativeIndex + 1} / {ad.creatives.length}
        </span>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => onCreativeIndexChange((currentCreativeIndex + 1) % ad.creatives.length)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div>
      {renderMedia()}
      {renderCarouselControls()}
    </div>
  );
}