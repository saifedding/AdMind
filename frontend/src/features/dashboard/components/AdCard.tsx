'use client';
import React, { useRef, useEffect, useState } from 'react';
import { AdWithAnalysis, type Creative } from '@/types/ad';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn, formatAdDuration } from '@/lib/utils';
import { 
  Play, Image, Eye, DollarSign, Globe2, Loader2, 
  ChevronLeft, ChevronRight, Clock, Layers, RefreshCw, 
  FolderPlus, Plus, Check, Save, Search, X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { adsApi, type ApiFavoriteList } from '@/lib/api';
import { AnalysisStatusBadge } from '@/components/unified-analysis';

interface AdCardProps {
  ad: AdWithAnalysis;
  isSelected?: boolean;
  isDeleting?: boolean;
  onSelectionChange?: (adId: number, selected: boolean) => void;
  showSelection?: boolean;
  hideSetBadge?: boolean;
  disableSetNavigation?: boolean;
  onSaveToggle?: (adId: number, isSaved: boolean) => void;
}

const getMainAdContent = (ad: AdWithAnalysis, creative?: Creative): string => {
  return (
    creative?.body || creative?.title || creative?.caption ||
    ad.main_body_text || ad.main_title || ad.main_caption || ad.ad_copy ||
    ''
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
  const [isSaved, setIsSaved] = useState(ad.is_favorite || false);
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const hasMultipleCreatives = ad.creatives && ad.creatives.length > 1;
  const currentCreative = ad.creatives?.[currentCardIndex];
  const isAdSet = ad.variant_count && ad.variant_count > 1;
  
  useEffect(() => { setIsSaved(ad.is_favorite || false); }, [ad.is_favorite, ad.id]);
  useEffect(() => { if (showListsDropdown && favoriteLists.length === 0) loadFavoriteLists(); }, [showListsDropdown]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowListsDropdown(false);
    };
    if (showListsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showListsDropdown]);
  
  const getPrimaryMedia = () => {
    if (currentCreative?.media && currentCreative.media.length > 0) {
      const video = currentCreative.media.find(m => m.type === 'Video');
      if (video) return { url: video.url, isVideo: true };
      const image = currentCreative.media.find(m => m.type === 'Image');
      if (image) return { url: image.url, isVideo: false };
    }
    const videoUrl = ad.main_video_urls?.[0] || (ad.media_type === 'video' ? ad.media_url : null);
    if (videoUrl) return { url: videoUrl, isVideo: true };
    const imageUrl = ad.main_image_urls?.[0] || (ad.media_type === 'image' ? ad.media_url : null);
    if (imageUrl) return { url: imageUrl, isVideo: false };
    return { url: ad.media_url, isVideo: ad.media_type === 'video' };
  };

  const { url: primaryMediaUrl, isVideo } = getPrimaryMedia();
  const displayContent = getMainAdContent(ad, currentCreative);
  const impressionsText = ad.impressions_text || '';
  const ctaText = currentCreative?.cta?.text || ad.meta?.cta_type || ad.cta_text || '';
  const countries = ad.targeting?.locations?.map(l => l.name) || [];
  const isActive = ad.is_active !== undefined ? ad.is_active : (ad.meta?.is_active !== undefined ? ad.meta.is_active : !ad.end_date || new Date(ad.end_date) >= new Date());
  const adDuration = formatAdDuration(ad.start_date, ad.end_date, isActive);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.carousel-control')) return;
    if ((e.target as HTMLElement).closest('.action-btn')) return;
    if (disableSetNavigation) { router.push(`/ads/${ad.id}`); return; }
    if (isAdSet && ad.ad_set_id) router.push(`/ad-sets/${ad.ad_set_id}`);
    else router.push(`/ads/${ad.id}`);
  };

  const handleSelectionToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ad.id) onSelectionChange?.(ad.id, !isSelected);
  };

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (isSaved) {
        if (!ad.id) return;
        const res = await adsApi.unsaveAdContent(ad.id);
        setIsSaved(res.is_saved);
        onSaveToggle?.(ad.ad_set_id || ad.id, res.is_saved);
      } else {
        if (!ad.id) return;
        const res = await adsApi.saveAdContent(ad.id);
        setIsSaved(res.is_saved);
        onSaveToggle?.(ad.ad_set_id || ad.id, res.is_saved);
      }
    } catch (err) { console.error('Save error:', err); }
    finally { setIsSaving(false); }
  };

  const handleRefreshClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (isAdSet && ad.ad_set_id) await adsApi.refreshAdSetMedia(ad.ad_set_id);
      else if (ad.id) await adsApi.refreshMediaFromFacebook(ad.id);
      window.location.reload();
    } catch (err) { console.error('Refresh error:', err); }
    finally { setIsRefreshing(false); }
  };

  const loadFavoriteLists = async () => {
    setLoadingLists(true);
    try {
      if (listsLoadedOnceRef.current && favoriteLists.length > 0) { setLoadingLists(false); return; }
      const res = await adsApi.getFavoriteLists();
      setFavoriteLists(res.lists);
      if (res.lists.length === 0) {
        try { await adsApi.ensureDefaultFavoriteList(); const r = await adsApi.getFavoriteLists(); setFavoriteLists(r.lists); } catch (_) {}
      }
      if (ad.id) { try { const r = await adsApi.getAdFavoriteLists(ad.id); setAdListIds(r.list_ids); } catch (_) { setAdListIds([]); } }
      listsLoadedOnceRef.current = true;
    } catch (err) { console.error('Load lists error:', err); }
    finally { setLoadingLists(false); }
  };

  const handleAddToListClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowListsDropdown(!showListsDropdown);
    if (!showListsDropdown) { loadFavoriteLists(); setShowCreateForm(false); }
  };

  const handleCreateList = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCreatingList || !newListName.trim()) return;
    setIsCreatingList(true);
    try {
      const created = await adsApi.createFavoriteList({ name: newListName.trim(), color: newListColor });
      if (ad.id) { try { await adsApi.addAdToFavoriteList(created.id, ad.id); setAdListIds(p => [...p, created.id]); } catch (_) {} }
      setFavoriteLists(p => [created, ...p]);
      setNewListName('');
      setShowCreateForm(false);
    } catch (err) { console.error('Create list error:', err); }
    finally { setIsCreatingList(false); }
  };

  const handleToggleList = async (e: React.MouseEvent, listId: number) => {
    e.stopPropagation();
    if (addingToList === listId || !ad.id) return;
    setAddingToList(listId);
    try {
      if (adListIds.includes(listId)) {
        await adsApi.removeAdFromFavoriteList(listId, ad.id);
        setAdListIds(p => p.filter(id => id !== listId));
        setFavoriteLists(p => p.map(l => l.id === listId ? { ...l, item_count: Math.max(0, (l.item_count ?? 0) - 1) } : l));
      } else {
        await adsApi.addAdToFavoriteList(listId, ad.id);
        setAdListIds(p => [...p, listId]);
        setFavoriteLists(p => p.map(l => l.id === listId ? { ...l, item_count: (l.item_count ?? 0) + 1 } : l));
      }
    } catch (err) { console.error('Toggle list error:', err); }
    finally { setAddingToList(null); }
  };

  return (
    <div className="group relative cursor-pointer" onClick={handleCardClick}>
      <Card className={cn(
        "overflow-hidden transition-all duration-200 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-xl p-0",
        "hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-0.5",
        isSelected && "ring-2 ring-blue-500",
        isDeleting && "opacity-50 pointer-events-none",
        isAdSet && !hideSetBadge && "border-l-2 border-l-indigo-500"
      )}>
        


        {/* Media Section */}
        <div className="relative aspect-[9/16] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
          {/* Gradients */}
          <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/50 to-transparent z-10" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent z-10" />
          
          {/* Top Left: Media Type + Status + Selection */}
          <div className="absolute top-2 left-2 z-20 flex gap-1">
            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold text-white", isVideo ? "bg-blue-600" : "bg-purple-600")}>
              {isVideo ? 'VIDEO' : 'IMAGE'}
            </span>
            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold text-white", isActive ? "bg-green-600" : "bg-gray-600")}>
              {isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
            {showSelection && (
              <button
                onClick={handleSelectionToggle}
                className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-bold text-white action-btn",
                  isSelected 
                    ? "bg-blue-500 hover:bg-blue-600" 
                    : "bg-gray-500 hover:bg-gray-600"
                )}
              >
                {isSelected ? "✓" : "SELECT"}
              </button>
            )}
          </div>

          {/* Top Right: Score - No longer needs adjustment since checkbox moved */}
          {ad.analysis?.overall_score != null && (
            <div className={cn(
              "absolute top-2 right-2 z-20 px-2 py-0.5 rounded text-[11px] font-semibold text-white",
              ad.analysis.overall_score >= 8 ? "bg-green-600" : ad.analysis.overall_score >= 6 ? "bg-yellow-500" : "bg-red-600"
            )}>
              ⭐ {ad.analysis.overall_score.toFixed(1)}
            </div>
          )}

          {/* Bottom Left: Analysis + Variants - Adjusted to avoid action buttons */}
          <div className="absolute bottom-2 left-2 z-20 flex gap-1">
            {ad.id && (
              <AnalysisStatusBadge
                adId={ad.id}
                adSetId={ad.ad_set_id}
                hasAnalysis={undefined}
                showAnalyzeButton={true}
                size="sm"
                className="!py-0.5 !px-2 !text-[10px] !bg-black/60"
                onAnalysisComplete={() => window.location.reload()}
              />
            )}
            {isAdSet && !hideSetBadge && (
              <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold flex items-center gap-0.5">
                <Layers className="h-2.5 w-2.5" />{ad.variant_count}
              </span>
            )}
          </div>

          {/* Media */}
          {primaryMediaUrl ? (
            isVideo ? (
              <div className="relative h-full w-full">
                <video src={primaryMediaUrl} className="absolute inset-0 h-full w-full object-cover" preload="metadata" playsInline controls ref={videoRef}
                  onPlay={() => setIsVideoPlaying(true)} onPause={() => setIsVideoPlaying(false)} onEnded={() => setIsVideoPlaying(false)} />
                {!isVideoPlaying && (
                  <button type="button" className="absolute inset-0 flex items-center justify-center z-10 carousel-control"
                    onClick={(e) => { e.stopPropagation(); videoRef.current?.play(); }}>
                    <div className="bg-white/90 rounded-full p-3 shadow-lg"><Play className="h-5 w-5 text-gray-800 fill-gray-800 ml-0.5" /></div>
                  </button>
                )}
              </div>
            ) : (
              <img src={primaryMediaUrl} alt={ad.main_title || 'Ad'} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center"><Image className="h-8 w-8 text-gray-400" /></div>
          )}

          {/* Hover Quick Actions - Positioned to avoid video controls */}
          <div className="absolute bottom-12 right-2 z-20 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              aria-label={isSaved ? 'Unsave' : 'Save'}
              title={isSaved ? 'Unsave' : 'Save'}
              onClick={handleSaveClick}
              disabled={isSaving}
              className={cn("p-1.5 rounded-full shadow-lg bg-white/95 hover:bg-white backdrop-blur-sm action-btn", isSaved ? "ring-2 ring-emerald-500" : "")}
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-800" /> : <Save className="h-3.5 w-3.5 text-gray-800" />}
            </button>
            <button
              aria-label="Refresh media"
              title="Refresh"
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              className="p-1.5 rounded-full shadow-lg bg-white/95 hover:bg-white backdrop-blur-sm action-btn"
            >
              {isRefreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-800" /> : <RefreshCw className="h-3.5 w-3.5 text-gray-800" />}
            </button>
            <button
              aria-label="Add to list"
              title="Add to list"
              onClick={handleAddToListClick}
              className="p-1.5 rounded-full shadow-lg bg-white/95 hover:bg-white backdrop-blur-sm action-btn"
            >
              <FolderPlus className="h-3.5 w-3.5 text-gray-800" />
            </button>
          </div>

          {/* Carousel */}
          {hasMultipleCreatives && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setCurrentCardIndex(p => p > 0 ? p - 1 : (ad.creatives?.length || 1) - 1); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 hover:bg-white rounded-full carousel-control z-20 shadow-lg backdrop-blur-sm">
                <ChevronLeft className="h-3 w-3 text-gray-800" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setCurrentCardIndex(p => p < ((ad.creatives?.length || 1) - 1) ? p + 1 : 0); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 hover:bg-white rounded-full carousel-control z-20 shadow-lg backdrop-blur-sm">
                <ChevronRight className="h-3 w-3 text-gray-800" />
              </button>
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-1 z-20">
                {ad.creatives?.map((_, i) => (
                  <button key={i} onClick={(e) => { e.stopPropagation(); setCurrentCardIndex(i); }}
                    className={cn("h-1 rounded-full transition-all carousel-control", currentCardIndex === i ? "bg-white w-3" : "bg-white/50 w-1")} />
                ))}
              </div>
            </>
          )}
        </div>
        {/* Content Section */}
        <CardContent className="p-2 space-y-1">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={ad.page_profile_picture_url || (ad.competitor?.page_id ? `https://graph.facebook.com/${ad.competitor.page_id}/picture?width=40` : undefined)} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-[11px] font-bold">
                {(ad.competitor?.name || ad.page_name || 'AD').substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">{ad.competitor?.name || ad.page_name || 'Unknown'}</h4>
              {impressionsText && (
                <p className="text-xs text-gray-500 flex items-center gap-1"><Eye className="h-3 w-3" />{impressionsText}</p>
              )}
            </div>
          </div>

          {/* Body Text */}
          {displayContent && (
            <div>
              <p className={cn("text-xs text-gray-700 dark:text-gray-300 leading-snug", !showFullContent && "line-clamp-3")}>{displayContent}</p>
              {displayContent.length > 100 && (
                <button onClick={(e) => { e.stopPropagation(); setShowFullContent(!showFullContent); }}
                  className="text-xs text-blue-600 hover:text-blue-700 mt-0.5 font-medium carousel-control">
                  {showFullContent ? 'Less' : 'More'}
                </button>
              )}
            </div>
          )}

          {/* CTA */}
          {ctaText && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-[11px] font-medium text-blue-700 dark:text-blue-300">
              <span className="w-1 h-1 rounded-full bg-blue-500" />{ctaText}
            </span>
          )}

          {/* Bottom Row: Days + Spend + Countries + Date */}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Days Running Count */}
              {adDuration.duration !== null && (
                <span className={cn(
                  "font-semibold flex items-center gap-1",
                  adDuration.duration >= 60 ? "text-emerald-600" : adDuration.duration >= 30 ? "text-amber-600" : "text-red-600"
                )}>
                  <Clock className="h-3 w-3" />
                  {adDuration.duration}d
                </span>
              )}
              {/* Spend */}
              {ad.spend && (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />{ad.spend}
                </span>
              )}
              {/* Date Range */}
              {adDuration.formattedDate && (
                <span className="text-gray-500 truncate">
                  {adDuration.formattedDate}
                </span>
              )}
            </div>
            {/* Countries */}
            {countries.length > 0 && (
              <span className="text-gray-500 flex items-center gap-1 flex-shrink-0" title={countries.join(', ')}>
                <Globe2 className="h-3 w-3" />{countries.length > 2 ? `${countries[0]}+${countries.length-1}` : countries.join(',')}
              </span>
            )}
          </div>
        </CardContent>



        {/* Lists Dropdown */}
        {showListsDropdown && (
          <div ref={dropdownRef} onClick={(e) => e.stopPropagation()}
            className="absolute bottom-full right-2 mb-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden action-btn">
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <span className="text-xs font-semibold">Add to List</span>
              <button onClick={() => setShowListsDropdown(false)} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><X className="h-3.5 w-3.5" /></button>
            </div>
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                <input value={listsQuery} onChange={(e) => setListsQuery(e.target.value)} placeholder="Search..."
                  className="w-full pl-7 pr-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900" onClick={(e) => e.stopPropagation()} />
              </div>
            </div>
            {showCreateForm ? (
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 space-y-2">
                <input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="List name"
                  className="w-full px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600" onClick={(e) => e.stopPropagation()} />
                <div className="flex items-center gap-1">
                  {['blue','green','yellow','red','purple','indigo'].map((c) => (
                    <button key={c} onClick={(e) => { e.stopPropagation(); setNewListColor(c); }}
                      className={cn("w-4 h-4 rounded-full", `bg-${c}-500`, newListColor === c && "ring-2 ring-offset-1 ring-gray-400")} />
                  ))}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setShowCreateForm(false)} className="flex-1 px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50">Cancel</button>
                  <button onClick={handleCreateList} disabled={!newListName.trim() || isCreatingList}
                    className="flex-1 px-2 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50">
                    {isCreatingList ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : 'Create'}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); setShowCreateForm(true); }}
                className="w-full px-3 py-2 text-xs text-left flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 text-blue-500 font-medium">
                <Plus className="h-3 w-3" />New List
              </button>
            )}
            <div className="max-h-32 overflow-y-auto">
              {loadingLists ? (
                <div className="p-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-blue-500" /></div>
              ) : favoriteLists.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500">No lists</div>
              ) : (
                (listsQuery ? favoriteLists.filter(l => l.name.toLowerCase().includes(listsQuery.toLowerCase())) : favoriteLists).map((list) => {
                  const isInList = adListIds.includes(list.id);
                  const isLoading = addingToList === list.id;
                  return (
                    <button key={list.id} onClick={(e) => handleToggleList(e, list.id)} disabled={isLoading}
                      className={cn("w-full px-3 py-2 flex items-center gap-2 text-left text-xs", isInList ? "bg-emerald-50 dark:bg-emerald-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700")}>
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", `bg-${list.color || 'blue'}-500`)} />
                      <span className="flex-1 truncate font-medium">{list.name}</span>
                      {typeof list.item_count === 'number' && <Badge variant="secondary" className="text-[9px] px-1">{list.item_count}</Badge>}
                      {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : isInList ? <Check className="h-3 w-3 text-emerald-500" /> : <Plus className="h-3 w-3 text-gray-400" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Deletion Overlay */}
        {isDeleting && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-40 rounded-lg">
            <span className="text-red-400 text-xs font-medium bg-red-500/20 px-3 py-1 rounded">Deleting...</span>
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdCard;
