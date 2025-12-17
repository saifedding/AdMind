'use client';

import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { ArrowLeft, Layers, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdSetDetails } from '../hooks/useAdSetDetails';
import { AdSetSummary, AdVariantGrid } from '../components';

export default function AdSetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const adSetId = Number(params.id);
  
  const {
    adVariants,
    adSetDetails,
    loading,
    error,
    page,
    totalItems,
    totalPages,
    bestAdId,
    isRefreshing,
    setPage,
    refreshAdSetMedia
  } = useAdSetDetails(adSetId, 24);

  const handleBackClick = () => {
    router.back();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

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
          
          <Button 
            onClick={refreshAdSetMedia}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? 'Refreshing...' : `Refresh All (${totalItems})`}
          </Button>
        </div>

        <div className="space-y-6">
          <AdSetSummary adSetDetails={adSetDetails} />
          
          <AdVariantGrid 
            adVariants={adVariants}
            bestAdId={bestAdId}
            loading={loading}
            error={error}
          />
          
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                pageSize={24}
                totalItems={totalItems}
                onPageChange={handlePageChange}
                onPageSizeChange={() => {}}
              />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}