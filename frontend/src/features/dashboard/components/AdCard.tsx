'use client';
import React, { useRef, useEffect, useState } from 'react';
import { AdWithAnalysis, type Creative } from '@/types/ad';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn, formatAdDuration, formatAdSetDuration } from '@/lib/utils';
import { Play, Image, Star, TrendingUp, Eye, DollarSign, Globe2, Loader2, ChevronLeft, ChevronRight, FileText, Calendar, Info, Clock, ChevronDown, Layers, Power, RefreshCw, FolderPlus, Plus, Check, Save, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { adsApi, type ApiFavoriteList } from '@/lib/api';

interface AdCardProps {
  ad: AdWithAnalysis;
  isSelected?: boolean;
  isDeleting?: boolean;
  onSelectionChange?: (adId: number, selected: boolean) => void;
  showSelection?: boolean;
  hideSetBadge?: boolean; // Add this prop to hide the "Set of X" badge when viewing variants
  disableSetNavigation?: boolean; // Add this prop to disable navigation to ad set when already viewing set details
  onSaveToggle?: (adId: number, isSaved: boolean) => void; // Callback when save status changes
}

// Helper function to get main ad content for display
const getMainAdContent = (ad: AdWithAnalysis, creative?: Creative): string => {
  return (
    // Prefer current creative text if available
    creative?.body || creative?.title || creative?.caption ||
    // Fall back to ad-level extracted fields
    ad.main_body_text || ad.main_title || ad.main_caption || ad.ad_copy ||
    // Last resort
    'No content available'
  );
};

export function AdCard({ 
  ad, 
  isSelected = false, 
  isDeleting = false, 
  onSelectionChange, 
  showSelection = false,
  hideSetBadge = false,
  disableSetNavigation = false,
  onSaveToggle
}: AdCardProps) {
  const router = useRouter();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showFullContent, setShowFullContent] = useState(false);
  const [isSaved, setIsSaved] = useState(ad.is_favorite || false); // Reuse is_favorite field as "is_saved"
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showListsDropdown, setShowListsDropdown] = useState(false);
  const [favoriteLists, setFavoriteLists] = useState<ApiFavoriteList[]>([]);
  const [adListIds, setAdListIds] = useState<number[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [addingToList, setAddingToList] = useState<number | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState<string>('blue');
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [listsQuery, setListsQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listsLoadedOnceRef = useRef(false);
  const hasHighScore = ad.analysis?.overall_score && ad.analysis.overall_score > 8;
  
  // Sync isSaved state when ad prop changes
  useEffect(() => {
    setIsSaved(ad.is_favorite || false);
  }, [ad.is_favorite, ad.id]);

  // Load lists when dropdown opens
  useEffect(() => {
    if (showListsDropdown && favoriteLists.length === 0) {
      loadFavoriteLists();
    }
  }, [showListsDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowListsDropdown(false);
      }
    };

    if (showListsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showListsDropdown]);
  
  const hasMultipleCreatives = ad.creatives && ad.creatives.length > 1;
  const currentCreative = ad.creatives?.[currentCardIndex];
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
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
  const displayContent = getMainAdContent(ad, currentCreative);
  
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
  // Determine active status more reliably
  const isActive = ad.is_active !== undefined ? ad.is_active
    : (ad.meta?.is_active !== undefined ? ad.meta.is_active
      : !ad.end_date || new Date(ad.end_date) >= new Date());

  const adDuration = formatAdDuration(ad.start_date, ad.end_date, isActive);
  const displayAdSetDate = ad.variant_count && ad.variant_count > 1;
  const adSetDuration = formatAdSetDuration(ad.ad_set_first_seen_date, ad.ad_set_last_seen_date);

  // Duration badge logic
  const durationDays = adDuration.duration;
  const durationBadgeClass = durationDays !== null ? (
    durationDays >= 60
      ? "bg-green-500/90 text-white"
      : durationDays >= 30
      ? "bg-yellow-400/90 text-black"
      : "bg-red-500/90 text-white"
  ) : "bg-gray-500/90 text-white";

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on checkbox or carousel controls
    if (showSelection && (e.target as HTMLElement).closest('.checkbox-container')) {
      return;
    }
    if ((e.target as HTMLElement).closest('.carousel-control')) {
      return;
    }
    
    // If disableSetNavigation is true, always go to individual ad
    if (disableSetNavigation) {
      router.push(`/ads/${ad.id}`);
      return;
    }
    
    // If this is part of an ad set with variants, go to the ad set detail page
    if (ad.variant_count && ad.variant_count > 1 && ad.ad_set_id) {
      router.push(`/ad-sets/${ad.ad_set_id}`);
    } else {
      // Otherwise go to the individual ad detail page
      router.push(`/ads/${ad.id}`);
    }
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

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      if (isSaved) {
        // Unsave: Delete media files and mark as unsaved
        const unsaveResponse = await adsApi.unsaveAdContent(ad.id);
        setIsSaved(unsaveResponse.is_saved);
        
        if (onSaveToggle) {
          if (ad.ad_set_id) {
            onSaveToggle(ad.ad_set_id, unsaveResponse.is_saved);
          } else {
            onSaveToggle(ad.id, unsaveResponse.is_saved);
          }
        }
        
        const deleted = unsaveResponse.deleted;
        const totalDeleted = (deleted.images_deleted || 0) + (deleted.videos_deleted || 0);
        const spaceSaved = ((deleted.space_freed || 0) / (1024 * 1024)).toFixed(2); // Convert to MB
        
        alert(
          `✓ Ad unsaved!\n\n` +
          `Deleted from disk:\n` +
          `- ${deleted.images_deleted || 0} image(s)\n` +
          `- ${deleted.videos_deleted || 0} video(s)\n` +
          `- ${spaceSaved} MB freed\n\n` +
          `The ad is no longer marked as saved.`
        );
      } else {
        // Save: Download media and mark as saved
        const saveResponse = await adsApi.saveAdContent(ad.id);
        setIsSaved(saveResponse.is_saved);
        
        // Notify parent component if callback provided
        if (onSaveToggle) {
          if (ad.ad_set_id) {
            onSaveToggle(ad.ad_set_id, saveResponse.is_saved);
          } else {
            onSaveToggle(ad.id, saveResponse.is_saved);
          }
        }
        
        // Show success message
        const contentInfo = saveResponse.content;
        const imagesDownloaded = contentInfo.images_downloaded || 0;
        const videosDownloaded = contentInfo.videos_downloaded || 0;
        const creativesCount = contentInfo.creatives_count || 0;
        
        alert(
          `✓ Ad saved permanently!\n\n` +
          `Downloaded to server:\n` +
          `- ${imagesDownloaded} image(s)\n` +
          `- ${videosDownloaded} video(s)\n` +
          `- ${creativesCount} creative(s)\n` +
          `- All text content\n\n` +
          `✅ You can now view this ad even when Facebook links expire!\n` +
          `The media files are saved on your backend server.`
        );
      }
    } catch (error) {
      console.error('Failed to save/unsave ad:', error);
      alert('✗ Failed to save/unsave ad. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRefreshing) return;
    
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

  const loadFavoriteLists = async () => {
    setLoadingLists(true);
    try {
      if (listsLoadedOnceRef.current && favoriteLists.length > 0) {
        setLoadingLists(false);
        return;
      }
      const listsResponse = await adsApi.getFavoriteLists();
      setFavoriteLists(listsResponse.lists);

      if (listsResponse.lists.length === 0) {
        try {
          const created = await adsApi.ensureDefaultFavoriteList();
          const refreshed = await adsApi.getFavoriteLists();
          setFavoriteLists(refreshed.lists);
          alert(`Created default list: ${created.name}`);
        } catch (_) {}
      }

      if (ad.id) {
        try {
          const adListsResponse = await adsApi.getAdFavoriteLists(ad.id);
          setAdListIds(adListsResponse.list_ids);
        } catch (_) {
          setAdListIds([]);
        }
      } else {
        setAdListIds([]);
      }
      listsLoadedOnceRef.current = true;
    } catch (error) {
      console.error('Error loading lists:', error);
    } finally {
      setLoadingLists(false);
    }
  };

  const handleAddToListClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const wasOpen = showListsDropdown;
    setShowListsDropdown(!showListsDropdown);
    if (!wasOpen) {
      loadFavoriteLists();
      setShowCreateForm(false);
    } else {
      setShowCreateForm(false);
    }
  };

  const handleCreateList = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCreatingList) return;
    const name = newListName.trim();
    if (!name) return;
    setIsCreatingList(true);
    try {
      const created = await adsApi.createFavoriteList({ name, color: newListColor });
      let createdWithCount = created;
      if (ad.id) {
        try {
          await adsApi.addAdToFavoriteList(created.id, ad.id);
          setAdListIds(prev => [...prev, created.id]);
          createdWithCount = { ...created, item_count: (created.item_count ?? 0) + 1 };
        } catch (_) {}
      }
      setFavoriteLists(prev => [createdWithCount, ...prev]);
      setNewListName('');
      alert(`Created list: ${created.name}`);
    } catch (error) {
      console.error('Error creating list:', error);
      alert('Failed to create list');
    } finally {
      setIsCreatingList(false);
    }
  };

  const handleToggleList = async (e: React.MouseEvent, listId: number) => {
    e.stopPropagation();
    if (addingToList === listId) return;
    if (!ad.id) {
      alert('This ad has no ID and cannot be added to a list.');
      return;
    }

    setAddingToList(listId);
    try {
      const isInList = adListIds.includes(listId);
      if (isInList) {
        await adsApi.removeAdFromFavoriteList(listId, ad.id);
        setAdListIds(prev => prev.filter(id => id !== listId));
        setFavoriteLists(prev => prev.map(l => l.id === listId ? { ...l, item_count: Math.max(0, (l.item_count ?? 0) - 1) } : l));
        alert('Removed from list');
      } else {
        await adsApi.addAdToFavoriteList(listId, ad.id);
        setAdListIds(prev => [...prev, listId]);
        setFavoriteLists(prev => prev.map(l => l.id === listId ? { ...l, item_count: (l.item_count ?? 0) + 1 } : l));
        alert('Added to list');
      }
    } catch (error) {
      console.error('Error toggling list:', error);
      alert('Failed to update favorite list');
    } finally {
      setAddingToList(null);
    }
  };

  return (
    <div className="group relative cursor-pointer" onClick={handleCardClick}>
      <Card className={cn(
        "h-full flex flex-col relative overflow-hidden transition-all duration-300 p-0",
        "hover:translate-y-[-2px] hover:bg-card/80 backdrop-blur-sm",
        "border-border/50 hover:border-border",
        hasHighScore && "border-photon-500/30 bg-gradient-to-br from-card via-card to-photon-950/10",
        isSelected && "border-photon-500/50 bg-photon-500/5",
        isDeleting && "opacity-50 scale-95 pointer-events-none",
        // Add visual distinction for ad sets
        ad.variant_count && ad.variant_count > 1 ? "border-l-4 border-l-indigo-500" : ""
      )}>
        {/* High Score Indicator */}
        {hasHighScore && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-photon-400 via-photon-500 to-photon-600" />
        )}
        
        {/* Selection Checkbox */}
        {showSelection && (
          <div className="absolute top-0.5 right-0.5 z-30 checkbox-container">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleSelectionChange}
              className="w-4 h-4 rounded border-border/60 bg-background/80 text-photon-500 focus:ring-photon-500/50 focus:ring-2 focus:ring-offset-0"
            />
          </div>
        )}
        
        {/* Save Button - Positioned at bottom-right */}
        <button
          onClick={handleSaveClick}
          disabled={isSaving}
          className={cn(
            "absolute z-10 p-2 rounded-full backdrop-blur-sm transition-all duration-200",
            "hover:scale-110 active:scale-95",
            showSelection ? "bottom-2 right-7" : "bottom-2 right-2",
            isSaved 
              ? "bg-green-500/90 text-white hover:bg-green-600/90" 
              : "bg-black/40 text-white hover:bg-black/60",
            isSaving && "opacity-50 cursor-not-allowed"
          )}
          title={isSaved ? "Click to unsave (remove from saved ads)" : "Click to save (download media permanently to server)"}
        >
          <Save
            className={cn(
              "h-4 w-4 transition-all",
              isSaved && "fill-current"
            )}
          />
        </button>
        
        {/* Refresh Button */}
        <button
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          className={cn(
            "absolute z-10 p-2 rounded-full backdrop-blur-sm transition-all duration-200",
            "hover:scale-110 active:scale-95",
            showSelection ? "bottom-2 right-16" : "bottom-2 right-11",
            "bg-blue-500/90 text-white hover:bg-blue-600/90",
            isRefreshing && "opacity-50 cursor-not-allowed"
          )}
          title={ad.ad_set_id && ad.variant_count && ad.variant_count > 1 ? `Refresh all ${ad.variant_count} ads in set` : "Refresh ad media from Facebook"}
        >
          <RefreshCw
            className={cn(
              "h-4 w-4 transition-all",
              isRefreshing && "animate-spin"
            )}
          />
        </button>
        
        {/* Add to Lists Button with Dropdown */}
        <div className="absolute z-10" style={{ bottom: '0.5rem', right: showSelection ? '6.25rem' : '5rem' }} ref={dropdownRef}>
          <button
            onClick={handleAddToListClick}
            className={cn(
              "p-2 rounded-full backdrop-blur-sm transition-all duration-200",
              "hover:scale-110 active:scale-95",
              "bg-yellow-500/90 text-white hover:bg-yellow-600/90"
            )}
            title="Add to favorite lists"
          >
            <FolderPlus className="h-4 w-4" />
          </button>

          {/* Dropdown Menu */}
          {showListsDropdown && (
            <div className="absolute bottom-full right-0 mb-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-xs text-muted-foreground flex items-center justify-between">
                <span>Favorite Lists ({favoriteLists.length})</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowCreateForm(v => !v); }}
                  className={cn(
                    "px-2 py-1 rounded-md text-[11px] font-medium",
                    "bg-yellow-500/90 text-white hover:bg-yellow-600/90"
                  )}
                >
                  {showCreateForm ? 'Close' : 'New'}
                </button>
              </div>
              {showCreateForm && (
                <div className="px-4 pt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={newListName}
                      onChange={(e) => { e.stopPropagation(); setNewListName(e.target.value); }}
                      placeholder="New list name"
                      className="flex-1 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                    />
                    <button
                      onClick={handleCreateList}
                      disabled={!newListName.trim() || isCreatingList}
                      className={cn(
                        "px-2 py-1 rounded-md text-xs font-medium",
                        "bg-photon-500/90 text-white hover:bg-photon-600/90",
                        isCreatingList && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isCreatingList ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Create & Add'
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {['blue','green','yellow','red','purple','indigo'].map((c) => (
                      <button
                        key={c}
                        onClick={(e) => { e.stopPropagation(); setNewListColor(c); }}
                        className={cn(
                          "w-4 h-4 rounded-full border border-transparent",
                          c === 'blue' && "bg-blue-500",
                          c === 'green' && "bg-green-500",
                          c === 'yellow' && "bg-yellow-500",
                          c === 'red' && "bg-red-500",
                          c === 'purple' && "bg-purple-500",
                          c === 'indigo' && "bg-indigo-500",
                          newListColor === c ? "ring-2 ring-offset-2 ring-photon-500" : ""
                        )}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="px-4 pt-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={listsQuery}
                    onChange={(e) => { e.stopPropagation(); setListsQuery(e.target.value); }}
                    placeholder="Search lists"
                    className="w-full pl-7 pr-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                  />
                </div>
              </div>
              {loadingLists ? (
                <div className="p-4 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                </div>
              ) : favoriteLists.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No lists yet. Create one in Favorite Lists page.
                </div>
              ) : (
                <div className="py-2">
                  {(listsQuery ? favoriteLists.filter(l => l.name.toLowerCase().includes(listsQuery.toLowerCase())) : favoriteLists).map((list) => {
                    const isInList = adListIds.includes(list.id);
                    const isLoading = addingToList === list.id;
                    return (
                      <button
                        key={list.id}
                        onClick={(e) => handleToggleList(e, list.id)}
                        disabled={isLoading}
                        className={cn(
                          "w-full px-4 py-2 flex items-center gap-3 transition-colors text-left disabled:opacity-50",
                          isInList ? "bg-green-50 dark:bg-green-900/20" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        <div className={`w-3 h-3 rounded-full bg-${list.color || 'blue'}-500 flex-shrink-0`} />
                        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">
                          {list.name}
                        </span>
                        {typeof list.item_count === 'number' && (
                          <Badge variant="secondary" className="text-[10px]">{list.item_count}</Badge>
                        )}
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : isInList ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Plus className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Ad Set Variants Badge - REMOVED, now integrated into top badges */}
        
        {/* Standalone Ad Indicator */}
        {(!ad.variant_count || ad.variant_count <= 1) && !hideSetBadge && (
          <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-md bg-background/70 backdrop-blur-sm text-xs flex items-center gap-1 shadow-sm">
            <FileText className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground font-medium">Single Ad</span>
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
          <div className="relative aspect-[9/16] w-full overflow-hidden rounded-t-lg">
            {/* Gradient overlay at bottom for readability */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
            
            {/* Score Badge Overlay */}
            {ad.analysis?.overall_score != null && (
              <div
                className={cn(
                  "absolute top-2 right-2 z-20 px-2 py-0.5 rounded-md text-xs font-bold shadow-md backdrop-blur-sm",
                  ad.analysis.overall_score >= 8
                    ? "bg-green-500/90 text-white"
                    : ad.analysis.overall_score >= 6
                    ? "bg-yellow-400/90 text-black"
                    : "bg-red-500/90 text-white"
                )}
                title={`Overall Score: ${ad.analysis.overall_score.toFixed(1)}`}
              >
                {ad.analysis.overall_score.toFixed(1)}
              </div>
            )}

            {/* Media Type, Status & Duration Badges */}
            <div className="absolute top-2 left-2 z-20 flex flex-wrap gap-1">
              {/* Media type badge */}
              <div 
                className="flex items-center gap-1 rounded-md bg-black/50 backdrop-blur-sm px-2 py-0.5"
                title={`Media Type: ${isVideo ? 'Video' : 'Image'}`}
              >
                {isVideo ? (
                  <Play className="h-3 w-3 text-blue-300" />
                ) : (
                  <Image className="h-3 w-3 text-purple-300" />
                )}
                <span className="text-xs font-medium text-white">
                  {isVideo ? 'Video' : 'Image'}
                </span>
              </div>

              {/* Status badge */}
              <div 
                className={cn(
                  "flex items-center gap-1 rounded-md backdrop-blur-sm px-2 py-0.5",
                  isActive ? "bg-green-500/90 text-white" : "bg-gray-500/90 text-white"
                )}
                title={`Status: ${isActive ? 'Active' : 'Inactive'}`}
              >
                <Power className="h-3 w-3" />
                <span className="text-xs font-medium">
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Ad duration badge */}
              {adDuration.formattedDate && (
                <div 
                  className={cn(
                    "flex items-center gap-1 rounded-md backdrop-blur-sm px-2 py-0.5", 
                    durationBadgeClass
                  )}
                  title={`Ad Duration: ${adDuration.duration} days`}
                >
                  <Clock className="h-3 w-3" />
                  <span className="text-xs font-medium">
                    {adDuration.duration}d
                  </span>
                </div>
              )}
              
              {/* Variant count badge */}
              {ad.variant_count && ad.variant_count > 1 && !hideSetBadge && (
                <div 
                  className="flex items-center gap-1 rounded-md bg-indigo-500/90 text-white px-2 py-0.5"
                  title={`${ad.variant_count} variants in this ad set`}
                >
                  <Layers className="h-3 w-3" />
                  <span className="text-xs font-medium">
                    {ad.variant_count}
                  </span>
                </div>
              )}
            </div>
            
            {isVideo ? (
              <div className="relative h-full w-full">
                <video 
                  src={primaryMediaUrl}
                  className="absolute inset-0 h-full w-full object-cover"
                  preload="metadata"
                  playsInline
                  controls
                  ref={videoRef}
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onEnded={() => setIsVideoPlaying(false)}
                />
                <div className={cn(
                  "absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-200",
                  isVideoPlaying ? "opacity-0" : "opacity-100"
                )}
                >
                  <button
                    type="button"
                    className="bg-white/90 rounded-full p-3 shadow-lg pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!videoRef.current) return;
                      videoRef.current.play();
                      setIsVideoPlaying(true);
                    }}
                  >
                    <Play className="h-5 w-5 text-black fill-black" />
                  </button>
                </div>
              </div>
            ) : (
              <img 
                src={primaryMediaUrl} 
                alt={ad.main_title || ad.page_name || 'Ad'}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                loading="lazy"
              />
            )}
            
            {/* Carousel indicators directly overlaid on media */}
            {hasMultipleCreatives && (
              <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-1 z-20">
                {ad.creatives.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentCardIndex(index);
                    }}
                    className={cn(
                      "h-2 w-2 rounded-full transition-all duration-200",
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
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full carousel-control z-20 backdrop-blur-md"
                >
                  <ChevronLeft className="h-4 w-4 text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentCardIndex(prev => prev < ((ad.creatives?.length || 1) - 1) ? prev + 1 : 0);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full carousel-control z-20 backdrop-blur-md"
                >
                  <ChevronRight className="h-4 w-4 text-white" />
                </button>
              </>
            )}

            {/* Ad Set Lifetime */}
            {displayAdSetDate && adSetDuration.formattedDate && (
              <div 
                className="flex items-center gap-1.5 rounded-md bg-indigo-100 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 px-3 py-1.5"
                title="Period this ad set has been active"
              >
                <Calendar className="h-4 w-4" />
                <div className="text-sm">
                  <span className="font-medium">Date Range:</span>{' '}
                  <span>{adSetDuration.formattedDate}</span>
                </div>
              </div>
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
              
              {/* Ad Set Date Range - REMOVED, now overlaid on media */}
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
            
            {(hideSetBadge ? adDuration.formattedDate : adSetDuration.formattedDate) && (
              <div className="flex items-center gap-1 text-muted-foreground mt-2 text-xs">
                <Calendar className="h-3 w-3" />
                <span>{hideSetBadge ? adDuration.formattedDate : adSetDuration.formattedDate}</span>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="pt-2 pb-3 px-4 text-xs text-muted-foreground">
          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center gap-3">
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
