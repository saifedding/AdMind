'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, Heart, Share2, Copy, Download, ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdDetailActionsProps {
  isFavorite: boolean;
  showShareMenu: boolean;
  isRefreshing: boolean;
  adArchiveId?: string;
  adSetId?: number;
  variantCount?: number;
  onBack: () => void;
  onToggleFavorite: () => void;
  onToggleShareMenu: () => void;
  onShare: (type: 'copy' | 'download') => void;
  onRefresh: () => void;
}

export function AdDetailActions({
  isFavorite,
  showShareMenu,
  isRefreshing,
  adArchiveId,
  adSetId,
  variantCount,
  onBack,
  onToggleFavorite,
  onToggleShareMenu,
  onShare,
  onRefresh
}: AdDetailActionsProps) {
  return (
    <div className="flex items-center justify-between">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />Back to Ads
      </Button>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={onToggleFavorite}
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
            onClick={onToggleShareMenu}
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
                  onClick={() => onShare('copy')}
                  className="w-full justify-start text-neutral-300 hover:bg-neutral-800"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onShare('download')}
                  className="w-full justify-start text-neutral-300 hover:bg-neutral-800"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Summary
                </Button>
                {adArchiveId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`https://www.facebook.com/ads/library/?id=${adArchiveId}`, '_blank')}
                    className="w-full justify-start text-neutral-300 hover:bg-neutral-800"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Facebook
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
        
        <Button
          onClick={onRefresh}
          disabled={isRefreshing}
          variant="outline"
          title={adSetId && variantCount && variantCount > 1 ? `Refresh all ${variantCount} ads in set` : "Refresh ad media"}
          className="border-neutral-700 hover:bg-neutral-800"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Media'}
        </Button>
      </div>
    </div>
  );
}