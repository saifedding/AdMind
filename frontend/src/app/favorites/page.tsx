'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { AdCard } from '@/features/dashboard/components/AdCard';
import { AdFilters } from '@/features/dashboard/components/AdFilters';
import { Pagination } from '@/components/ui/pagination';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MediaUrlUpdater } from '@/components/ui/media-url-updater';
import { adsApi, AdFilterParams, type ApiAd } from '@/lib/api';
import { transformAdsWithAnalysis } from '@/lib/transformers';
import { Heart, RefreshCw, AlertCircle } from 'lucide-react';
import type { AdWithAnalysis } from '@/types/ad';

export default function FavoritesPage() {
  const [ads, setAds] = useState<AdWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const [filters, setFilters] = useState<AdFilterParams>({
    page: 1,
    page_size: 24,
    is_favorite: true, // Always filter by favorites
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  useEffect(() => {
    fetchFavorites();
  }, [filters]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await adsApi.getAds(filters);
      
      setTotalItems(response.pagination.total_items);
      setTotalPages(response.pagination.total_pages);
      
      const transformedAds = transformAdsWithAnalysis(response.data);
      setAds(transformedAds);
      
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError('Failed to fetch favorite ads. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchFavorites();
  };

  const handleApplyFilters = (newFilters: AdFilterParams) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      is_favorite: true, // Keep favorite filter always on
      page: 1
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      page_size: 24,
      is_favorite: true,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({
      ...prev,
      page
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (pageSize: number) => {
    setFilters(prev => ({
      ...prev,
      page_size: pageSize,
      page: 1
    }));
  };

  const handleFavoriteToggle = (adSetId: number, isFavorite: boolean) => {
    // If unfavorited, remove from list immediately
    if (!isFavorite) {
      setAds(prevAds => prevAds.filter(ad => ad.ad_set_id !== adSetId));
      setTotalItems(prev => prev - 1);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Heart className="h-6 w-6 text-red-500 fill-current" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Favorite Ad Sets</h1>
              <p className="text-muted-foreground">
                {totalItems} {totalItems === 1 ? 'favorite' : 'favorites'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <AdFilters
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
          currentFilters={filters}
          disabled={loading}
          inline={true}
        />

        {/* Content */}
        {error ? (
          <Card className="border-red-300 bg-red-50 dark:bg-red-900/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-[600px] bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : ads.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Favorites Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start adding ad sets to your favorites by clicking the heart icon on any ad card.
              </p>
              <Button onClick={() => window.location.href = '/ads'}>
                Browse Ads
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Ad Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {ads.map((ad) => (
                <div key={`fav-ad-${ad.id ?? 'unknown'}`} className="relative">
                  <AdCard
                    ad={ad}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                  {/* Media URL Updater Button - Only show for favorited ad sets */}
                  {ad.id && (
                    <div className="absolute top-2 right-12 z-10">
                      <MediaUrlUpdater
                        adId={ad.id}
                        currentMediaUrl={
                          ad.creatives?.[0]?.media?.[0]?.url ||
                          ad.media_url ||
                          ad.main_image_urls?.[0] ||
                          ad.main_video_urls?.[0]
                        }
                        onSuccess={fetchFavorites}
                        triggerButton={
                          <Button
                            variant="secondary"
                            size="sm"
                            className="bg-white/90 hover:bg-white shadow-md"
                            title="Update media link"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <Pagination
                  currentPage={filters.page || 1}
                  totalPages={totalPages}
                  pageSize={filters.page_size || 24}
                  totalItems={totalItems}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
