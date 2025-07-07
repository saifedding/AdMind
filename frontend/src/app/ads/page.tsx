'use client';

import { AdCard } from '@/features/dashboard/components/AdCard';
import { AdList } from '@/features/dashboard/components/AdList';
import { BulkActionToolbar } from '@/features/dashboard/components/BulkActionToolbar';
import { AdWithAnalysis } from '@/types/ad';
import { adsApi, ApiError } from '@/lib/api';
import { transformAdsWithAnalysis } from '@/lib/transformers';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { ViewToggle } from '@/components/ui/view-toggle';
import { 
  Brain, 
  TrendingUp, 
  Target,
  RefreshCw,
  Filter,
  Search,
  Zap,
  Eye,
  DollarSign,
  MousePointer
} from 'lucide-react';
import { AdFilters } from '@/features/dashboard/components/AdFilters';
import { AdSearch } from '@/features/dashboard/components/AdSearch';
import { ActiveFilterBadges } from '@/features/dashboard/components/ActiveFilterBadges';
import { AdFilterParams } from '@/lib/api';

export default function AdIntelligencePage() {
  const [ads, setAds] = useState<AdWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState({
    totalAds: 0,
    highScoreAds: 0,
    avgScore: 0,
    activeAds: 0,
    analyzedAds: 0,
  });
  const [filters, setFilters] = useState<AdFilterParams>({
    page: 1,
    page_size: 24,
    // has_analysis: true, // Removed - let users see all ads
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  
  // New state for view and selection
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAds, setSelectedAds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingAds, setDeletingAds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchAds();
  }, [filters]);

  // Clear selection when ads change (e.g., after deletion)
  useEffect(() => {
    if (selectedAds.size > 0) {
      const currentAdIds = new Set(ads.map(ad => ad.id));
      const validSelectedAds = new Set(
        Array.from(selectedAds).filter(id => currentAdIds.has(id))
      );
      
      if (validSelectedAds.size !== selectedAds.size) {
        console.log('Clearing invalid selections:', 
          Array.from(selectedAds).filter(id => !currentAdIds.has(id)));
        setSelectedAds(validSelectedAds);
      }
    }
  }, [ads]);

  const fetchAds = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create a simplified version of filters that should be compatible with the current backend
      const safeFilters: AdFilterParams = {
        page: filters.page,
        page_size: filters.page_size,
        // has_analysis: true, // Removed - show all ads, not just analyzed ones
        sort_by: filters.sort_by || 'created_at',
        sort_order: filters.sort_order || 'desc',
      };
      
      // Only add these filters if they're defined, as they might cause the join_entities error
      if (filters.search) safeFilters.search = filters.search;
      if (filters.media_type) safeFilters.media_type = filters.media_type;
      if (filters.is_active !== undefined) safeFilters.is_active = filters.is_active;
      
      // Fetch ads with analysis using simplified filters
      const response = await adsApi.getAds(safeFilters);
      
      const transformedAds = transformAdsWithAnalysis(response.data);
      
      // Use actual pagination metadata from backend
      setTotalItems(response.pagination.total_items);
      setTotalPages(response.pagination.total_pages);
      
      // Apply client-side filtering for complex filter types that the backend doesn't support
      let filteredAds = transformedAds;
      
      // Client-side score filtering
      if (filters.min_overall_score !== undefined) {
        filteredAds = filteredAds.filter(ad => 
          ad.analysis?.overall_score !== undefined && 
          ad.analysis.overall_score >= filters.min_overall_score!
        );
      }
      
      if (filters.max_overall_score !== undefined) {
        filteredAds = filteredAds.filter(ad => 
          ad.analysis?.overall_score !== undefined && 
          ad.analysis.overall_score <= filters.max_overall_score!
        );
      }
      
      if (filters.min_hook_score !== undefined) {
        filteredAds = filteredAds.filter(ad => 
          ad.analysis?.hook_score !== undefined && 
          ad.analysis.hook_score >= filters.min_hook_score!
        );
      }
      
      if (filters.max_hook_score !== undefined) {
        filteredAds = filteredAds.filter(ad => 
          ad.analysis?.hook_score !== undefined && 
          ad.analysis.hook_score <= filters.max_hook_score!
        );
      }
      
      // Date filtering
      if (filters.date_from) {
        const fromDate = new Date(filters.date_from);
        filteredAds = filteredAds.filter(ad => {
          const adDate = new Date(ad.date_found);
          return adDate >= fromDate;
        });
      }
      
      if (filters.date_to) {
        const toDate = new Date(filters.date_to);
        filteredAds = filteredAds.filter(ad => {
          const adDate = new Date(ad.date_found);
          return adDate <= toDate;
        });
      }
      
      setAds(filteredAds);
      
      // Calculate stats based on filtered ads
      const highScoreCount = filteredAds.filter(ad => ad.analysis?.overall_score && ad.analysis.overall_score > 8).length;
      const activeCount = filteredAds.filter(ad => ad.is_active).length;
      const adsWithAnalysis = filteredAds.filter(ad => ad.analysis?.overall_score);
      const avgScore = adsWithAnalysis.length > 0 
        ? adsWithAnalysis.reduce((sum, ad) => sum + (ad.analysis?.overall_score || 0), 0) / adsWithAnalysis.length 
        : 0;
      
      setStats({
        totalAds: filteredAds.length,
        highScoreAds: highScoreCount,
        avgScore: avgScore,
        activeAds: activeCount,
        analyzedAds: adsWithAnalysis.length, // Add count of analyzed ads
      });
    } catch (err) {
      console.error('Error fetching ads:', err);
      
      if (err instanceof ApiError) {
        // If we get the specific join_entities error, show a more user-friendly message
        if (err.message.includes('join_entities')) {
          setError('Some filter options are not supported by the current backend version. Please try with fewer filters.');
        } else {
          setError(`API Error: ${err.message}`);
        }
      } else {
        setError('Failed to fetch ads. Please ensure the backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAds();
  };

  const handleApplyFilters = (newFilters: AdFilterParams) => {
    // Merge with existing filters, reset to page 1
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      page_size: 24,
      // has_analysis: true, // Removed - show all ads when resetting
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  };

  const handleSearch = (query: string) => {
    setFilters(prev => ({
      ...prev,
      search: query,
      page: 1
    }));
  };

  const handleRemoveFilter = (key: keyof AdFilterParams) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return { ...newFilters, page: 1 };
    });
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({
      ...prev,
      page
    }));
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (pageSize: number) => {
    setFilters(prev => ({
      ...prev,
      page_size: pageSize,
      page: 1 // Reset to first page when changing page size
    }));
  };

  // Selection handlers
  const handleAdSelection = (adId: number, selected: boolean) => {
    setSelectedAds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(adId);
      } else {
        newSet.delete(adId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedAds(new Set(ads.map(ad => ad.id)));
    } else {
      setSelectedAds(new Set());
    }
  };

  const handleClearSelection = () => {
    setSelectedAds(new Set());
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedAds.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedAds.size} ads? This action cannot be undone.`)) {
      return;
    }

    const adIds = Array.from(selectedAds);
    
    setIsDeleting(true);
    setDeletingAds(new Set(adIds));
    
    try {
      console.log('Deleting ads:', adIds);
      
      const result = await adsApi.bulkDeleteAds(adIds);
      console.log('Delete result:', result);
      
      // Clear selection immediately
      setSelectedAds(new Set());
      
      // Optimistically remove deleted ads from current state
      setAds(prevAds => prevAds.filter(ad => !adIds.includes(ad.id)));
      
      // Small delay to show the deletion animation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh data from server to ensure consistency
      await fetchAds();
      
      // Show success message
      alert(`Successfully deleted ${result.deleted_count} out of ${result.requested_count} ads`);
    } catch (err) {
      console.error('Error deleting ads:', err);
      alert('Failed to delete ads. Please try again.');
      
      // On error, restore the selection
      setSelectedAds(new Set(adIds));
    } finally {
      setIsDeleting(false);
      setDeletingAds(new Set());
    }
  };

  const renderStats = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Ads</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalAds}</div>
          <p className="text-xs text-photon-400">Total in Database</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">AI Analyzed</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-400">{stats.analyzedAds}</div>
          <p className="text-xs text-muted-foreground">With AI Analysis</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.avgScore.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">Performance Rating</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">High Performers</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-photon-400">{stats.highScoreAds}</div>
          <p className="text-xs text-muted-foreground">Score &gt; 8.0</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Active Ads</CardTitle>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-400">{stats.activeAds}</div>
          <p className="text-xs text-muted-foreground">Currently Running</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderLoadingState = () => (
    <div className="space-y-8">
      {renderStats()}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-card rounded-xl border animate-pulse h-96">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-iridium-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-iridium-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-iridium-700 rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-32 bg-iridium-700 rounded-lg mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-iridium-700 rounded w-full"></div>
                <div className="h-3 bg-iridium-700 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="space-y-8">
      <div className="max-w-2xl mx-auto text-center">
        <Card className="bg-red-900/20 border-red-500">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center justify-center gap-2">
              <Brain className="h-5 w-5" />
              Connection Error
            </CardTitle>
            <CardDescription className="text-red-300">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleRefresh} className="bg-photon-500 text-photon-950 hover:bg-photon-400">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Connection
            </Button>
            
            <div className="bg-iridium-900/50 border border-iridium-700 rounded-lg p-4 text-left">
              <h3 className="font-mono font-semibold text-photon-300 mb-2">Setup Instructions</h3>
              <div className="text-sm text-iridium-300 space-y-1">
                <p>1. Start the backend server:</p>
                <code className="block bg-iridium-800 p-2 rounded text-xs">cd backend && python -m uvicorn app.main:app --reload</code>
                <p>2. Backend should be available at: <code className="bg-iridium-800 px-2 py-1 rounded">http://localhost:8000</code></p>
                <p>3. Check the API docs at: <code className="bg-iridium-800 px-2 py-1 rounded">http://localhost:8000/docs</code></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="space-y-8">
      {renderStats()}
      <div className="text-center py-12">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-photon-300 flex items-center justify-center gap-2">
              <Brain className="h-5 w-5" />
              No Ads Found
            </CardTitle>
            <CardDescription>
              No ads with AI analysis were found in the database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-iridium-400">
              Try running the scraper or adding some test data to the backend.
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

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
          <div className="flex gap-3">
            <ViewToggle 
              view={viewMode} 
              onViewChange={setViewMode}
              disabled={loading}
            />
            <AdFilters 
              onApplyFilters={handleApplyFilters} 
              onResetFilters={handleResetFilters}
              disabled={loading}
            />
            <AdSearch 
              onSearch={handleSearch} 
              disabled={loading}
            />
            <Button onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Content */}
        {loading ? renderLoadingState() : error ? renderErrorState() : ads.length === 0 ? renderEmptyState() : (
          <div className="space-y-8">
            {renderStats()}
            
            {/* Active Filters */}
            <ActiveFilterBadges filters={filters} onRemoveFilter={handleRemoveFilter} />
            
            {/* Bulk Action Toolbar */}
            <BulkActionToolbar 
              selectedCount={selectedAds.size}
              onDelete={handleBulkDelete}
              onClear={handleClearSelection}
              isDeleting={isDeleting}
              disabled={loading}
            />
            
            {/* Ad Content */}
            {viewMode === 'list' ? (
              <AdList 
                ads={ads}
                selectedAds={selectedAds}
                onSelectionChange={handleAdSelection}
                onSelectAll={handleSelectAll}
                showSelection={true}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {ads.map((ad) => (
                  <AdCard 
                    key={ad.id} 
                    ad={ad} 
                    isSelected={selectedAds.has(ad.id)}
                    isDeleting={deletingAds.has(ad.id)}
                    onSelectionChange={handleAdSelection}
                    showSelection={true}
                  />
                ))}
              </div>
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