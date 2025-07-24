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
import { ArrowLeft, Layers, Star, Calendar, Clock, Info, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatAdSetDuration, cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface AdSetDetails {
  id: number;
  variant_count: number;
  first_seen_date?: string;
  last_seen_date?: string;
  best_ad_id?: number;
}

export default function AdSetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const adSetId = Number(params.id);
  
  const [adVariants, setAdVariants] = useState<AdWithAnalysis[]>([]);
  const [adSetDetails, setAdSetDetails] = useState<AdSetDetails | null>(null);
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
      
      // Extract AdSet details from the first ad (they should all have the same adset metadata)
      if (transformedAds.length > 0 && page === 1) {
        const firstAd = transformedAds[0];
        // Find the ad with the highest score to mark as best variant
        let highestScoringAd = transformedAds[0];
        
        transformedAds.forEach(ad => {
          if (ad.analysis?.overall_score && 
              (!highestScoringAd.analysis?.overall_score || 
               ad.analysis.overall_score > highestScoringAd.analysis.overall_score)) {
            highestScoringAd = ad;
          }
        });
        
        setBestAdId(highestScoringAd.id || null);
        
        setAdSetDetails({
          id: adSetId,
          variant_count: response.pagination.total_items,
          first_seen_date: firstAd.ad_set_first_seen_date,
          last_seen_date: firstAd.ad_set_last_seen_date,
          best_ad_id: highestScoringAd.id
        });
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

  const renderAdSetSummary = () => {
    if (!adSetDetails) return null;
    
    const adSetDuration = formatAdSetDuration(
      adSetDetails.first_seen_date,
      adSetDetails.last_seen_date
    );
    
    return (
      <Card className="mb-6 bg-muted/30">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-500" />
                Ad Set Details
              </h2>
              <p className="text-sm text-muted-foreground">
                This creative concept contains {adSetDetails.variant_count} variants that have been tested over time.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {adSetDetails.first_seen_date && adSetDetails.last_seen_date && (
                <div className="flex items-center gap-1.5 rounded-md bg-indigo-100 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 px-3 py-1.5">
                  <Calendar className="h-4 w-4" />
                  <div className="text-sm">
                    <span className="font-medium">Lifetime:</span>{' '}
                    <span>{adSetDuration.formattedDate}</span>
                  </div>
                </div>
              )}
              
              {adSetDuration.duration && (
                <div className="flex items-center gap-1.5 rounded-md bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-300 px-3 py-1.5">
                  <Clock className="h-4 w-4" />
                  <div className="text-sm">
                    <span className="font-medium">Duration:</span>{' '}
                    <span>{adSetDuration.duration} days</span>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-1.5 rounded-md bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 px-3 py-1.5">
                <Star className="h-4 w-4" />
                <div className="text-sm font-medium">
                  Best variant highlighted
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAdVariants = () => {
    if (adVariants.length === 0) {
      return (
        <Card className="border-muted bg-muted/20">
          <CardContent className="text-center p-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No ad variants found in this set.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {adVariants.map(ad => (
          <div key={ad.id} className="relative">
            {ad.id === bestAdId && (
              <div className="absolute -top-2 -right-2 z-20">
                <Badge className="bg-amber-500 text-black flex items-center gap-1 px-2 py-1 shadow-lg">
                  <Star className="h-3 w-3 fill-current" />
                  <span className="font-semibold">Best Variant</span>
                </Badge>
              </div>
            )}
            <div className={cn(
              ad.id === bestAdId && "ring-2 ring-amber-500 ring-offset-2 rounded-lg"
            )}>
              <AdCard ad={ad} hideSetBadge={true} disableSetNavigation={true} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderLoading = () => (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
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
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={handleBackClick}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h1 className="text-2xl font-bold flex items-center">
              <Layers className="h-6 w-6 mr-2 text-indigo-500" /> 
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
            {renderAdSetSummary()}
            {renderAdVariants()}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={totalItems}
                  onPageChange={handlePageChange}
                  onPageSizeChange={() => {}}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 