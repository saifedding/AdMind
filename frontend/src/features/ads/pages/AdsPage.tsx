'use client';

import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Pagination } from '@/components/ui/pagination';
import { Brain } from 'lucide-react';
import { AdFilters } from '@/features/dashboard/components/AdFilters';
import { ActiveFilterBadges } from '@/features/dashboard/components/ActiveFilterBadges';
import { BulkActionToolbar } from '@/features/dashboard/components/BulkActionToolbar';
import { AdList } from '@/features/dashboard/components/AdList';
import { useAds } from '../hooks/useAds';
import { 
  AdStats, 
  AdGrid, 
  AdLoadingState, 
  AdErrorState, 
  AdEmptyState, 
  AdViewControls 
} from '../components';

function AdsPageInner() {
  const {
    ads,
    loading,
    error,
    stats,
    filters,
    viewSettings,
    selectionState,
    totalItems,
    totalPages,
    setViewMode,
    setGridColumns,
    handleApplyFilters,
    handleResetFilters,
    handleSearch,
    handleRemoveFilter,
    handlePageChange,
    handlePageSizeChange,
    handleAdSelection,
    handleSelectAll,
    handleClearSelection,
    handleBulkDelete,
    handleSaveToggle,
    handleRefresh,
  } = useAds();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8 text-photon-400" />
              Ad Intelligence
            </h1>
            <p className="text-muted-foreground">
              Discover high-performing ads with AI-powered analysis and insights
              {totalItems > 0 && (
                <span className="ml-2 text-photon-400">
                  • Page {filters.page || 1} of {totalPages} ({totalItems} ads)
                </span>
              )}
            </p>
          </div>
          <AdViewControls
            viewSettings={viewSettings}
            loading={loading}
            onViewChange={setViewMode}
            onGridColumnsChange={setGridColumns}
            onSearch={handleSearch}
            onRefresh={handleRefresh}
          />
        </div>

        {/* Content */}
        {loading ? (
          <AdLoadingState stats={stats} />
        ) : error ? (
          <AdErrorState error={error} onRetry={handleRefresh} />
        ) : ads.length === 0 ? (
          <AdEmptyState
            stats={stats}
            filters={filters}
            loading={loading}
            onApplyFilters={handleApplyFilters}
            onResetFilters={handleResetFilters}
            onRemoveFilter={handleRemoveFilter}
            onRefresh={handleRefresh}
          />
        ) : (
          <div className="space-y-8">
            <AdStats stats={stats} />
            
            {/* Inline Filters Section */}
            <AdFilters 
              onApplyFilters={handleApplyFilters} 
              onResetFilters={handleResetFilters}
              currentFilters={filters}
              inline
              disabled={loading}
            />
            
            {/* Active Filters */}
            <ActiveFilterBadges filters={filters} onRemoveFilter={handleRemoveFilter} />
            
            {/* Bulk Action Toolbar */}
            <BulkActionToolbar 
              selectedCount={selectionState.selectedAds.size}
              onDelete={handleBulkDelete}
              onClear={handleClearSelection}
              isDeleting={selectionState.isDeleting}
              disabled={loading}
            />
            
            {/* Ad Content */}
            {viewSettings.viewMode === 'list' ? (
              <AdList 
                ads={ads}
                selectedAds={selectionState.selectedAds}
                onSelectionChange={handleAdSelection}
                onSelectAll={handleSelectAll}
                showSelection={true}
              />
            ) : (
              <AdGrid
                ads={ads}
                viewSettings={viewSettings}
                selectionState={selectionState}
                onSelectionChange={handleAdSelection}
                onSaveToggle={handleSaveToggle}
              />
            )}
            
            {/* Pagination */}
            <Pagination
              currentPage={filters.page || 1}
              totalPages={totalPages}
              pageSize={filters.page_size || 24}
              totalItems={totalItems}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              disabled={loading}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function AdsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <AdsPageInner />
    </Suspense>
  );
}