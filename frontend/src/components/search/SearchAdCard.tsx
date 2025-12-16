'use client';
import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  SkipBack, 
  SkipForward,
  Image, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Layers, 
  Calendar, 
  Clock,
  PlayCircle, 
  ImageIcon, 
  Grid3X3
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
  const router = useRouter();
  const [currentCreativeIndex, setCurrentCreativeIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [mediaAspectRatio, setMediaAspectRatio] = useState<string>('aspect-[9/16]'); // Default to portrait
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // Video control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  
  const hasMultipleCreatives = ad.creatives && ad.creatives.length > 1;
  const currentCreative = ad.creatives?.[currentCreativeIndex] || ad.creatives?.[0];
  
  // Enhanced media extraction for Facebook API response structure
  const getPrimaryMedia = () => {
    // First, try to get media from current creative
    if (currentCreative?.media && currentCreative.media.length > 0) {
      const video = currentCreative.media.find((m: any) => m.type === 'Video');
      if (video) {
        // Look for video thumbnail
        const thumbnail = currentCreative.media.find((m: any) => m.type === 'Image');
        return { 
          url: video.url, 
          isVideo: true, 
          thumbnail: thumbnail?.url 
        };
      }
      const image = currentCreative.media.find((m: any) => m.type === 'Image');
      if (image) return { url: image.url, isVideo: false };
    }
    
    // Handle Facebook Ad Library API response structure
    const isVideoType = ad.media_type?.toLowerCase() === 'video';
    
    // Try Facebook API snapshot structure first
    if (ad.meta?.snapshot) {
      const snapshot = ad.meta.snapshot;
      
      // Check for videos in snapshot
      if (snapshot.videos && Array.isArray(snapshot.videos) && snapshot.videos.length > 0) {
        const video = snapshot.videos[0];
        return {
          url: video.video_hd_url || video.video_sd_url,
          isVideo: true,
          thumbnail: video.video_preview_image_url
        };
      }
      
      // Check for images in snapshot
      if (snapshot.images && Array.isArray(snapshot.images) && snapshot.images.length > 0) {
        const image = snapshot.images[0];
        return {
          url: image.original_image_url || image.resized_image_url,
          isVideo: false
        };
      }
      
      // Check for cards (carousel ads)
      if (snapshot.cards && Array.isArray(snapshot.cards) && snapshot.cards.length > 0) {
        const card = snapshot.cards[0];
        if (card.video_hd_url || card.video_sd_url) {
          return {
            url: card.video_hd_url || card.video_sd_url,
            isVideo: true,
            thumbnail: card.video_preview_image_url
          };
        }
        if (card.original_image_url || card.resized_image_url) {
          return {
            url: card.original_image_url || card.resized_image_url,
            isVideo: false
          };
        }
      }
    }
    
    // Fallback to ad-level media URLs (legacy structure)
    if (isVideoType) {
      const videoUrls = ad.meta?.video_urls || ad.meta?.main_video_urls || [];
      const imageUrls = ad.meta?.image_urls || ad.meta?.main_image_urls || [];
      if (videoUrls.length > 0) {
        return { 
          url: videoUrls[0], 
          isVideo: true, 
          thumbnail: imageUrls.length > 0 ? imageUrls[0] : undefined 
        };
      }
    } else {
      const imageUrls = ad.meta?.image_urls || ad.meta?.main_image_urls || [];
      if (imageUrls.length > 0) {
        return { url: imageUrls[0], isVideo: false };
      }
    }
    
    // Check for generic media_url or primary_media_url
    const mediaUrl = ad.meta?.primary_media_url || ad.meta?.media_url;
    if (mediaUrl) {
      return { url: mediaUrl, isVideo: isVideoType };
    }
    
    return { url: null, isVideo: isVideoType };
  };

  const { url: mediaUrl, isVideo, thumbnail } = getPrimaryMedia();
  
  // Enhanced ad copy extraction to handle Facebook API response structure
  const getDisplayContent = () => {
    // Try multiple sources for ad copy in order of preference
    const sources = [
      // From current creative
      currentCreative?.body?.text,
      currentCreative?.body,
      currentCreative?.headline,
      
      // From ad-level data (Facebook API structure)
      ad.meta?.body?.text,
      ad.meta?.body,
      ad.meta?.headline,
      ad.meta?.title,
      
      // From cards array (for carousel/DCO ads)
      ad.meta?.cards?.[0]?.body,
      ad.meta?.cards?.[0]?.title,
      
      // From snapshot data (Facebook Ad Library structure)
      ad.meta?.snapshot?.body?.text,
      ad.meta?.snapshot?.title,
      
      // Fallback to any text content
      ad.meta?.caption,
      ad.meta?.link_description,
    ];
    
    // Find the first non-empty, non-placeholder content
    for (const source of sources) {
      if (source && 
          typeof source === 'string' && 
          source.trim() && 
          !source.includes('{{product.') && // Skip template placeholders
          source !== 'undefined' &&
          source.length > 3) {
        return source.trim();
      }
    }
    
    // If no good content found, try to extract from extra_texts
    if (ad.meta?.extra_texts && Array.isArray(ad.meta.extra_texts)) {
      const meaningfulTexts = ad.meta.extra_texts
        .filter((item: any) => item?.text && 
                typeof item.text === 'string' && 
                item.text.length > 10 && 
                !item.text.includes('{{') &&
                !item.text.toLowerCase().includes('terms and conditions') &&
                !item.text.toLowerCase().includes('privacy policy'))
        .map((item: any) => item.text);
      
      if (meaningfulTexts.length > 0) {
        return meaningfulTexts[0];
      }
    }
    
    return 'No description available';
  };
  
  const displayContent = getDisplayContent();
  
  // Enhanced advertiser name extraction
  const getAdvertiserName = () => {
    return ad.advertiser || 
           ad.meta?.snapshot?.page_name || 
           ad.meta?.page_name || 
           'Unknown Advertiser';
  };
  
  const advertiserName = getAdvertiserName();
  
  // Debug logging for video detection
  if (ad.media_type?.toLowerCase() === 'video') {
    console.log('Video ad detected:', {
      ad_archive_id: ad.ad_archive_id,
      media_type: ad.media_type,
      mediaUrl,
      isVideo,
      meta: ad.meta,
      creatives: ad.creatives
    });
  }
  
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  // Calculate days running
  const calculateDaysRunning = () => {
    if (!ad.start_date) return null;
    
    try {
      const startDate = new Date(ad.start_date);
      const currentDate = new Date();
      const timeDiff = currentDate.getTime() - startDate.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
      
      // If ad has duration_days from API, use that; otherwise calculate from start_date
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

  // Video control functions
  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (newVolume === 0) {
        setIsMuted(true);
        videoRef.current.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    
    if (!isFullscreen) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Video event handlers
  const handleVideoPlay = () => setIsPlaying(true);
  const handleVideoPause = () => setIsPlaying(false);
  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };
  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    setDuration(video.duration);
    setIsVideoLoaded(true);
    handleMediaLoad(video.videoWidth, video.videoHeight);
  };
  const handleVideoVolumeChange = () => {
    if (videoRef.current) {
      setVolume(videoRef.current.volume);
      setIsMuted(videoRef.current.muted);
    }
  };

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (showControls && isPlaying) {
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => clearTimeout(timeout);
  }, [showControls, isPlaying]);



  const handlePrevCreative = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentCreativeIndex(prev => 
      prev > 0 ? prev - 1 : (ad.creatives?.length || 1) - 1
    );
    // Reset aspect ratio to default when changing creatives
    setMediaAspectRatio('aspect-[9/16]');
  };

  const handleNextCreative = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentCreativeIndex(prev => 
      prev < ((ad.creatives?.length || 1) - 1) ? prev + 1 : 0
    );
    // Reset aspect ratio to default when changing creatives
    setMediaAspectRatio('aspect-[9/16]');
  };



  // Function to determine aspect ratio from dimensions
  const getAspectRatioClass = (width: number, height: number): string => {
    const ratio = width / height;
    
    // Common aspect ratios with tolerance
    if (Math.abs(ratio - 16/9) < 0.1) return 'aspect-[16/9]';   // Landscape
    if (Math.abs(ratio - 9/16) < 0.1) return 'aspect-[9/16]';   // Portrait
    if (Math.abs(ratio - 4/3) < 0.1) return 'aspect-[4/3]';     // Traditional
    if (Math.abs(ratio - 3/4) < 0.1) return 'aspect-[3/4]';     // Portrait traditional
    if (Math.abs(ratio - 1) < 0.1) return 'aspect-square';      // Square
    if (Math.abs(ratio - 21/9) < 0.1) return 'aspect-[21/9]';   // Ultra-wide
    if (Math.abs(ratio - 5/4) < 0.1) return 'aspect-[5/4]';     // Classic photo
    if (Math.abs(ratio - 4/5) < 0.1) return 'aspect-[4/5]';     // Instagram portrait
    
    // For other ratios, use closest standard
    if (ratio > 1.5) return 'aspect-[16/9]';  // Wide content
    if (ratio < 0.7) return 'aspect-[9/16]';  // Tall content
    return 'aspect-square'; // Default for near-square content
  };

  // Handle media load to get dimensions
  const handleMediaLoad = (width: number, height: number) => {
    const aspectClass = getAspectRatioClass(width, height);
    setMediaAspectRatio(aspectClass);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    handleMediaLoad(img.naturalWidth, img.naturalHeight);
  };

  const handleVideoLoad = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    handleMediaLoad(video.videoWidth, video.videoHeight);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('input[type="checkbox"]') ||
      target.closest('button') ||
      target.closest('video') ||
      target.closest('.video-controls')
    ) {
      return;
    }
    
    // Navigate to ad detail page
    router.push(`/search/${ad.ad_archive_id}`);
  };

  return (
    <article 
      className={cn(
        "break-inside-avoid bg-[#1e293b] rounded-xl border border-white/5 overflow-hidden group hover:border-primary/50 transition-all duration-300 shadow-lg shadow-black/20 cursor-pointer",
        isSelected && "border border-primary ring-1 ring-primary"
      )}
      onClick={handleCardClick}
    >
      {/* Selected State Banner */}
      {isSelected && (
        <div className="bg-primary/10 px-4 py-1 text-center border-b border-primary/20">
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Selected</p>
        </div>
      )}

      {/* Header Section */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 flex-shrink-0 border border-white/10">
            <AvatarImage src={`https://graph.facebook.com/${ad.meta?.snapshot?.page_id || ad.meta?.page_id}/picture?width=40`} />
            <AvatarFallback className="bg-white text-black text-sm font-bold">
              {advertiserName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click
                if (isNavigating) return;
                
                const pageId = ad.meta?.snapshot?.page_id || ad.meta?.page_id;
                if (pageId) {
                  setIsNavigating(true);
                  // Add timestamp to force new search
                  const timestamp = Date.now();
                  router.push(`/search?type=page&q=${encodeURIComponent(pageId)}&auto=true&t=${timestamp}`);
                } else {
                  alert('No Page ID available for this advertiser');
                }
              }}
              disabled={isNavigating}
              className="text-white font-semibold text-sm hover:text-primary transition-colors text-left flex items-center gap-1 group disabled:opacity-50 disabled:cursor-not-allowed"
              title="Click to view all ads from this page"
            >
              {advertiserName}
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <p className="text-[#92adc9] text-xs">Sponsored</p>
          </div>
        </div>
        <label className="relative inline-flex items-center justify-center cursor-pointer group/check">
          <input 
            type="checkbox" 
            checked={isSelected}
            onChange={(e) => onSelectionChange(ad.ad_archive_id, e.target.checked)}
            className="peer sr-only"
          />
          <div className="w-5 h-5 border-2 border-[#92adc9] rounded md:group-hover/check:border-white peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
            <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100" />
          </div>
        </label>
      </div>

      {/* Ad Content Text */}
      <div className="px-4 pb-3">
        <p className="text-white/90 text-sm leading-relaxed line-clamp-3">
          {displayContent || 'No description available'}
        </p>
      </div>

      {/* Media Section with Dynamic Aspect Ratio */}
      <div className={cn("relative w-full bg-black group/media", mediaAspectRatio)}>
        {/* Carousel Indicator for Multiple Creatives */}
        {hasMultipleCreatives && (
          <div className="absolute top-3 right-3 z-10 bg-black/60 px-2 py-1 rounded-full text-xs font-medium text-white backdrop-blur-sm flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {currentCreativeIndex + 1}/{ad.creatives_count}
          </div>
        )}

        {/* Media Content */}
        {mediaUrl ? (
          isVideo ? (
            <div 
              className="relative h-full w-full"
              onMouseEnter={() => setShowControls(true)}
              onMouseLeave={() => !isPlaying && setShowControls(false)}
            >
              {/* Video Element */}
              <video 
                ref={videoRef}
                src={mediaUrl} 
                className="absolute inset-0 h-full w-full object-cover"
                preload="metadata" 
                playsInline 
                muted={isMuted}
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onTimeUpdate={handleVideoTimeUpdate}
                onLoadedMetadata={handleVideoLoadedMetadata}
                onVolumeChange={handleVideoVolumeChange}
                poster={thumbnail}
              />

              {/* Video overlay for better control visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 opacity-0 group-hover/media:opacity-100 transition-opacity" />
              
              {/* Video Type Badge */}
              <div className="absolute top-3 left-3 bg-black/60 px-2 py-1 rounded text-xs font-medium text-white backdrop-blur-sm flex items-center gap-1">
                <Play className="h-3.5 w-3.5" />
                Video
              </div>

              {/* Duration Badge */}
              {duration > 0 && (
                <div className="absolute top-3 right-3 bg-black/60 px-2 py-1 rounded text-xs font-medium text-white backdrop-blur-sm">
                  {formatTime(duration)}
                </div>
              )}

              {/* Center Play/Pause Button */}
              <div 
                className={cn(
                  "absolute inset-0 flex items-center justify-center transition-opacity cursor-pointer",
                  showControls || !isVideoLoaded ? "opacity-100" : "opacity-0 group-hover/media:opacity-100"
                )}
                onClick={togglePlay}
              >
                <div className="size-16 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/30 hover:scale-110 transition-transform">
                  {isPlaying ? (
                    <Pause className="h-8 w-8 text-white" />
                  ) : (
                    <Play className="h-8 w-8 text-white ml-1" />
                  )}
                </div>
              </div>

              {/* Video Controls */}
              <div 
                className={cn(
                  "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 transition-opacity video-controls",
                  showControls || !isVideoLoaded ? "opacity-100" : "opacity-0"
                )}
              >
                {/* Progress Bar */}
                {isVideoLoaded && (
                  <div className="mb-3">
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #00bcd4 0%, #00bcd4 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) 100%)`
                      }}
                    />
                  </div>
                )}

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Play/Pause */}
                    <button
                      onClick={togglePlay}
                      className="text-white hover:text-primary transition-colors p-1"
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </button>

                    {/* Skip Backward */}
                    <button
                      onClick={() => skipTime(-10)}
                      className="text-white hover:text-primary transition-colors p-1"
                    >
                      <SkipBack className="h-4 w-4" />
                    </button>

                    {/* Skip Forward */}
                    <button
                      onClick={() => skipTime(10)}
                      className="text-white hover:text-primary transition-colors p-1"
                    >
                      <SkipForward className="h-4 w-4" />
                    </button>

                    {/* Volume Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={toggleMute}
                        className="text-white hover:text-primary transition-colors p-1"
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="h-4 w-4" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #00bcd4 0%, #00bcd4 ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) 100%)`
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Time Display */}
                    {isVideoLoaded && (
                      <span className="text-white text-xs font-mono">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    )}

                    {/* Fullscreen */}
                    <button
                      onClick={toggleFullscreen}
                      className="text-white hover:text-primary transition-colors p-1"
                    >
                      {isFullscreen ? (
                        <Minimize className="h-4 w-4" />
                      ) : (
                        <Maximize className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <img 
              ref={imageRef}
              src={mediaUrl} 
              alt={currentCreative?.headline || 'Ad'} 
              className="absolute inset-0 h-full w-full object-cover" 
              loading="lazy"
              onLoad={handleImageLoad}
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Image className="h-8 w-8 text-gray-400" />
          </div>
        )}

        {/* Carousel Navigation for Multiple Creatives */}
        {hasMultipleCreatives && (
          <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black/50 to-transparent flex items-center justify-center opacity-0 group-hover/media:opacity-100 transition-opacity cursor-pointer">
            <button 
              onClick={handleNextCreative}
              className="text-white hover:text-primary transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        )}
        
        {hasMultipleCreatives && currentCreativeIndex > 0 && (
          <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black/50 to-transparent flex items-center justify-center opacity-0 group-hover/media:opacity-100 transition-opacity cursor-pointer">
            <button 
              onClick={handlePrevCreative}
              className="text-white hover:text-primary transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          </div>
        )}

      </div>

      {/* CTA Section */}
      <div className="bg-[#233242] p-3 flex items-center justify-between border-t border-white/5">
        <div className="flex flex-col">
          <span className="text-[10px] text-[#92adc9]">
            {advertiserName.toUpperCase()}.COM
          </span>
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            {currentCreative?.cta?.text || 'Learn More'}
          </span>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            window.open(`https://www.facebook.com/ads/library/?id=${ad.ad_archive_id}`, '_blank');
          }}
          className="text-white hover:text-primary transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
        </button>
      </div>

      {/* Metadata Tags */}
      <div className="p-4 border-t border-white/5 flex flex-wrap gap-2">
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border",
          ad.is_active 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
        )}>
          <span className={cn("size-1.5 rounded-full", ad.is_active ? "bg-emerald-400" : "bg-rose-400")} />
          {ad.is_active ? 'Active' : 'Inactive'}
        </span>
        
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#324d67]/30 text-[#92adc9] text-xs font-medium border border-[#324d67]/30">
          <Calendar className="h-3 w-3" />
          {formatDate(ad.start_date)}
        </span>

        {/* Days Running Tag */}
        {(() => {
          const daysRunning = calculateDaysRunning();
          const formattedDays = formatDaysRunning(daysRunning);
          
          if (!formattedDays) return null;
          
          // Color coding based on duration
          const getColorClasses = (days: number) => {
            if (days <= 7) return "bg-green-500/10 text-green-400 border-green-500/20"; // New (1 week)
            if (days <= 30) return "bg-blue-500/10 text-blue-400 border-blue-500/20";   // Recent (1 month)
            if (days <= 90) return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"; // Established (3 months)
            return "bg-orange-500/10 text-orange-400 border-orange-500/20"; // Long-running (3+ months)
          };
          
          return (
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border",
              getColorClasses(daysRunning || 0)
            )}>
              <Clock className="h-3 w-3" />
              {formattedDays}
            </span>
          );
        })()}
        
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border",
          isVideo 
            ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
            : hasMultipleCreatives 
              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
              : "bg-purple-500/10 text-purple-400 border-purple-500/20"
        )}>
          {isVideo ? (
            <PlayCircle className="h-3 w-3" />
          ) : hasMultipleCreatives ? (
            <Grid3X3 className="h-3 w-3" />
          ) : (
            <ImageIcon className="h-3 w-3" />
          )}
          {isVideo ? 'Video' : hasMultipleCreatives ? 'Carousel' : 'Image'}
        </span>
        
        {ad.ad_archive_id && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#324d67]/30 text-[#92adc9] text-xs font-medium border border-[#324d67]/30">
            ID: {ad.ad_archive_id.slice(-8)}
          </span>
        )}
      </div>

    </article>
  );
}

// Add custom slider styles
const sliderStyles = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 12px;
    width: 12px;
    border-radius: 50%;
    background: #00bcd4;
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .slider::-moz-range-thumb {
    height: 12px;
    width: 12px;
    border-radius: 50%;
    background: #00bcd4;
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .slider::-webkit-slider-track {
    height: 4px;
    cursor: pointer;
    border-radius: 2px;
  }

  .slider::-moz-range-track {
    height: 4px;
    cursor: pointer;
    border-radius: 2px;
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('video-slider-styles')) {
  const style = document.createElement('style');
  style.id = 'video-slider-styles';
  style.textContent = sliderStyles;
  document.head.appendChild(style);
}