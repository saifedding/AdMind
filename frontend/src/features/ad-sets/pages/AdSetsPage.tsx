'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { useAdSets } from '../hooks/useAdSets';
import { AdSetGrid, AdSetSortControls, AdSetStats } from '../components';

export default function AdSetsPage() {
  const {
    adSets,
    loading,
    error,
    page,
    totalItems,
    totalPages,
    sortBy,
    sortOrder,
    setPage,
    setSortBy,
    toggleSortOrder,
    refetch
  } = useAdSets(24);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Ad Sets</h1>
            <p className="text-muted-foreground">
              Browse all ad sets grouped by similar creative content
            </p>
            <AdSetStats totalItems={totalItems} />
          </div>
          
          <div className="flex items-center space-x-2">
            <AdSetSortControls
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortByChange={setSortBy}
              onToggleSortOrder={toggleSortOrder}
            />
            {error && (
              <Button variant="outline" onClick={refetch}>
                Try Again
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AdSetGrid adSets={adSets} loading={loading} error={error} />
        </div>
        
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
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
    </DashboardLayout>
  );
}