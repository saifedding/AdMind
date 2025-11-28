'use client';

import { AdWithAnalysis } from '@/types/ad';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Image as ImageIcon, 
  Calendar, 
  Target, 
  TrendingUp, 
  ExternalLink,
  Eye,
  EyeOff,
  FolderPlus,
  Loader2,
  Check,
  Plus
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { adsApi, type ApiFavoriteList } from '@/lib/api';
import { useEffect, useState } from 'react';

export interface AdListProps {
  ads: AdWithAnalysis[];
  selectedAds: Set<number>;
  onSelectionChange: (adId: number, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  showSelection?: boolean;
}

export function AdList({ 
  ads, 
  selectedAds, 
  onSelectionChange, 
  onSelectAll,
  showSelection = true 
}: AdListProps) {
  const router = useRouter();
  const [favoriteLists, setFavoriteLists] = useState<ApiFavoriteList[]>([]);
  const [adListIdsByAd, setAdListIdsByAd] = useState<Record<number, number[]>>({});
  const [showDropdownForAd, setShowDropdownForAd] = useState<number | null>(null);
  const [loadingLists, setLoadingLists] = useState(false);
  const [addingToList, setAddingToList] = useState<number | null>(null);

  const handleAdClick = (adId: number) => {
    router.push(`/ads/${adId}`);
  };

  const openFavoritesDropdown = async (adId?: number) => {
    if (!adId) return;
    setShowDropdownForAd(prev => (prev === adId ? null : adId));
    if (showDropdownForAd === adId) return;
    setLoadingLists(true);
    try {
      if (favoriteLists.length === 0) {
        const listsResponse = await adsApi.getFavoriteLists();
        setFavoriteLists(listsResponse.lists);
      }
      if (adId && adListIdsByAd[adId] === undefined) {
        const adListsResponse = await adsApi.getAdFavoriteLists(adId);
        setAdListIdsByAd(prev => ({ ...prev, [adId]: adListsResponse.list_ids }));
      }
    } catch (error) {
      console.error('Error loading favorite lists:', error);
    } finally {
      setLoadingLists(false);
    }
  };

  const toggleAdInList = async (listId: number, adId?: number) => {
    if (!adId) return;
    if (addingToList === listId) return;
    setAddingToList(listId);
    try {
      const current = adListIdsByAd[adId] || [];
      const isInList = current.includes(listId);
      if (isInList) {
        await adsApi.removeAdFromFavoriteList(listId, adId);
        const updated = current.filter(id => id !== listId);
        setAdListIdsByAd(prev => ({ ...prev, [adId]: updated }));
      } else {
        await adsApi.addAdToFavoriteList(listId, adId);
        const updated = [...current, listId];
        setAdListIdsByAd(prev => ({ ...prev, [adId]: updated }));
      }
    } catch (error) {
      console.error('Error toggling favorite list:', error);
    } finally {
      setAddingToList(null);
    }
  };

  const formatScore = (score?: number) => {
    if (score === undefined) return 'N/A';
    return score.toFixed(1);
  };

  const getScoreColor = (score?: number) => {
    if (score === undefined) return 'text-gray-400';
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const allSelected = ads.length > 0 && ads.every(ad => ad.id !== undefined && selectedAds.has(ad.id));
  const someSelected = ads.some(ad => ad.id !== undefined && selectedAds.has(ad.id));

  return (
    <div className="space-y-4">
      {/* Header with bulk select */}
      {showSelection && onSelectAll && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => onSelectAll(checked === true)}
                />
                <span className="text-sm font-medium">
                  {selectedAds.size > 0 ? `${selectedAds.size} selected` : 'Select all'}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {ads.length} ads total
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ad List */}
      <div className="space-y-2">
        {ads.map((ad) => (
          <Card 
            key={ad.id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => ad.id && handleAdClick(ad.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                {/* Selection Checkbox */}
                {showSelection && ad.id !== undefined && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedAds.has(ad.id)}
                      onCheckedChange={(checked) => onSelectionChange(ad.id!, checked === true)}
                    />
                  </div>
                )}

                {/* Media Preview */}
                <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-iridium-800 flex items-center justify-center overflow-hidden">
                  {(() => {
                    const firstCreative = ad.creatives?.[0];
                    const firstMedia = firstCreative?.media?.[0];
                    const mediaType = firstMedia?.type || ad.media_type;
                    const mediaUrl = firstMedia?.url || ad.media_url;

                    if (mediaType === 'video') {
                      return mediaUrl ? (
                        <div className="relative w-full h-full">
                          <video className="w-full h-full object-cover" preload="metadata" muted>
                            <source src={mediaUrl} type="video/mp4" />
                          </video>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="h-6 w-6 text-white/80" />
                          </div>
                        </div>
                      ) : (
                        <Play className="h-6 w-6 text-iridium-400" />
                      );
                    }
                    
                    return mediaUrl ? (
                      <img src={mediaUrl} alt="Ad preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-iridium-400" />
                    );
                  })()}
                </div>

                {/* Competitor Info */}
                <div className="flex-shrink-0 flex items-center space-x-2">
                                   <Avatar className="h-8 w-8">
                   <AvatarImage 
                     src={ad.competitor?.page_id 
                       ? `https://graph.facebook.com/${ad.competitor.page_id}/picture?width=32&height=32`
                       : undefined
                     }
                   />
                   <AvatarFallback>
                     {ad.competitor?.name.charAt(0).toUpperCase()}
                   </AvatarFallback>
                 </Avatar>
                  <div>
                    <div className="font-medium text-sm">{ad.competitor?.name}</div>
                    <div className="text-xs text-muted-foreground">{ad.page_name}</div>
                  </div>
                </div>

                {/* Ad Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="font-medium text-sm truncate">
                        {ad.main_title || ad.ad_copy || 'Untitled Ad'}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {ad.main_body_text || ad.main_caption || 'No description available'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex-shrink-0 flex items-center space-x-4 text-xs text-muted-foreground">
                  {/* Countries */}
                  {ad.targeting?.locations && ad.targeting.locations.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <Target className="h-3 w-3" />
                      <div className="flex space-x-1">
                        {ad.targeting.locations.slice(0, 2).map((location) => (
                          <Badge key={location.name} variant="outline" className="text-xs">
                            {location.name}
                          </Badge>
                        ))}
                        {ad.targeting.locations.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{ad.targeting.locations.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Date */}
                  {ad.date_found && (
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(ad.date_found)}</span>
                    </div>
                  )}

                  {/* AI Score */}
                  {ad.analysis?.overall_score && (
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3" />
                      <span className={getScoreColor(ad.analysis.overall_score)}>
                        {formatScore(ad.analysis.overall_score)}
                      </span>
                    </div>
                  )}

                  {/* Active Status */}
                  <div className="flex items-center space-x-1">
                    {(ad.meta?.is_active ?? ad.is_active) ? (
                      <Eye className="h-3 w-3 text-green-400" />
                    ) : (
                      <EyeOff className="h-3 w-3 text-gray-400" />
                    )}
                    <span className={(ad.meta?.is_active ?? ad.is_active) ? 'text-green-400' : 'text-gray-400'}>
                      {(ad.meta?.is_active ?? ad.is_active) ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 relative" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => ad.id && handleAdClick(ad.id)}
                    className="h-8 w-8 p-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>

                  {/* Add to Favorite Lists */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openFavoritesDropdown(ad.id)}
                    className="h-8 w-8 p-0 ml-1"
                    title="Add to favorite lists"
                  >
                    <FolderPlus className="h-4 w-4 text-yellow-500" />
                  </Button>

                  {showDropdownForAd === ad.id && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto z-50">
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
                          {favoriteLists.map((list) => {
                            const currentIds = ad.id ? (adListIdsByAd[ad.id] || []) : [];
                            const isInList = currentIds.includes(list.id);
                            const isLoading = addingToList === list.id;
                            return (
                              <button
                                key={list.id}
                                onClick={() => toggleAdInList(list.id, ad.id)}
                                disabled={isLoading}
                                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left disabled:opacity-50"
                              >
                                <div className={`w-3 h-3 rounded-full bg-${list.color || 'blue'}-500 flex-shrink-0`} />
                                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {list.name}
                                </span>
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 
