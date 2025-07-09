'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdWithAnalysis } from '@/types/ad';
import { adsApi, ApiError, PaginatedAdsResponse } from '@/lib/api';
import { transformAdsWithAnalysis } from '@/lib/transformers';
import { DashboardLayout } from '@/components/dashboard';
import { AdCard } from '@/features/dashboard/components/AdCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { ArrowLeft, Layers, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AdSetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const adSetId = Number(params.id);
  
  const [adVariants, setAdVariants] = useState<AdWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(24);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [bestAdId, setBestAdId] = useState<number | null>(null);

  useEffect(() => {
    if (isNaN(adSetId)) {
      setError('Invalid Ad Set ID');
      setLoading(false);
      return;
    }
    
    fetchAdSetDetails();
  }, [adSetId]);
  
  const fetchAdSetDetails = async () => {
    try {
      // First, let's get the ad set details to find the best_ad_id
      // This is a placeholder - you would need to implement this endpoint
      // For now, we'll fetch the first page of variants and assume the first one is representative
      
      fetchAdVariants();
      
    } catch (err) {
      console.error('Error fetching ad set details:', err);
      setError('Failed to fetch ad set details');
      setLoading(false);
    }
  };

  const fetchAdVariants = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await adsApi.getAdsInSet(adSetId, page, pageSize);
      
      // Update pagination state
      setTotalItems(response.pagination.total_items);
      setTotalPages(response.pagination.total_pages);
      
      // Transform the API response data
      const transformedAds = transformAdsWithAnalysis(response.data);
      
      // For now, we'll assume the first ad is the representative one
      // In a real implementation, you would get this from the ad set endpoint
      if (transformedAds.length > 0 && page === 1) {
        setBestAdId(transformedAds[0].id || null);
      }
      
      setAdVariants(transformedAds);
      
    } catch (err) {
      console.error('Error fetching ad variants:', err);
      
      if (err instanceof ApiError) {
        setError(`API Error: ${err.message}`);
      } else {
        setError('Failed to fetch ad variants. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isNaN(adSetId)) {
      fetchAdVariants();
    }
  }, [page]); // Refetch when page changes

  const handleBackClick = () => {
    router.back();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const renderAdVariants = () => {
    if (adVariants.length === 0) {
      return (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No ad variants found in this set.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {adVariants.map(ad => (
          <div key={ad.id} className="relative">
            {ad.id === bestAdId && (
              <Badge className="absolute -top-2 -right-2 z-20 bg-amber-500 text-black flex items-center gap-1 px-2 py-1 shadow-lg">
                <Star className="h-3 w-3 fill-current" />
                <span className="font-semibold">Best Variant</span>
              </Badge>
            )}
            <AdCard ad={ad} hideSetBadge={true} />
          </div>
        ))}
      </div>
    );
  };

  const renderLoading = () => (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Loading ad variants...</p>
      </div>
    </div>
  );

  const renderError = () => (
    <Card className="border-red-300 bg-red-50 dark:bg-red-900/10">
      <CardHeader>
        <CardTitle className="text-red-600 dark:text-red-400">Error</CardTitle>
        <CardDescription className="text-red-500 dark:text-red-300">
          Failed to load ad variants
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
        <Button variant="outline" className="mt-4" onClick={fetchAdVariants}>
          Try Again
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleBackClick}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h1 className="text-2xl font-bold flex items-center">
              <Layers className="h-6 w-6 mr-2" /> 
              Ad Set #{adSetId}
              {totalItems > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({totalItems} variants)
                </span>
              )}
            </h1>
          </div>
        </div>

        {loading ? renderLoading() : error ? renderError() : (
          <div className="space-y-6">
            {renderAdVariants()}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={totalItems}
                  onPageChange={handlePageChange}
                  onPageSizeChange={(size) => {}}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 