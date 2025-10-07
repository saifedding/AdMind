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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  MousePointer,
  LayoutGrid
} from 'lucide-react';
import { AdFilters } from '@/features/dashboard/components/AdFilters';
import { AdSearch } from '@/features/dashboard/components/AdSearch';
import { ActiveFilterBadges } from '@/features/dashboard/components/ActiveFilterBadges';
import { AdFilterParams } from '@/lib/api';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const storageKey = 'adsFilters';

  const parseInitialFilters = (): AdFilterParams => {
    // If URL has any search params, use them.
    if (searchParams?.toString()) {
      const params: AdFilterParams = {
        page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
        page_size: searchParams.get('page_size') ? Number(searchParams.get('page_size')) : 24,
        sort_by: (searchParams.get('sort_by') as any) || 'created_at',
        sort_order: (searchParams.get('sort_order') as any) || 'desc',
      };
      if (searchParams.get('search')) params.search = searchParams.get('search')!;
      if (searchParams.get('media_type')) params.media_type = searchParams.get('media_type')!;
      if (searchParams.get('is_active')) params.is_active = searchParams.get('is_active') === 'true';
      if (searchParams.get('min_overall_score')) params.min_overall_score = Number(searchParams.get('min_overall_score'));
      if (searchParams.get('max_overall_score')) params.max_overall_score = Number(searchParams.get('max_overall_score'));
      if (searchParams.get('min_hook_score')) params.min_hook_score = Number(searchParams.get('min_hook_score'));
      if (searchParams.get('max_hook_score')) params.max_hook_score = Number(searchParams.get('max_hook_score'));
      if (searchParams.get('min_duration_days')) params.min_duration_days = Number(searchParams.get('min_duration_days'));
      if (searchParams.get('max_duration_days')) params.max_duration_days = Number(searchParams.get('max_duration_days'));
      if (searchParams.get('date_from')) params.date_from = searchParams.get('date_from')!;
      if (searchParams.get('date_to')) params.date_to = searchParams.get('date_to')!;
      if (searchParams.get('competitor_id')) params.competitor_id = Number(searchParams.get('competitor_id'));
      return params;
    }

    // Fallback to sessionStorage if available (e.g., navigating back without query string)
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (stored) return JSON.parse(stored) as AdFilterParams;
      } catch (_) {}
    }

    // Default filters
    return {
    page: 1,
    page_size: 24,
    sort_by: 'created_at',
    sort_order: 'desc',
    };
  };

  const [filters, setFilters] = useState<AdFilterParams>(parseInitialFilters);
  
  // New state for view and selection
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridColumns, setGridColumns] = useState<2 | 3 | 4 | 5>(3); // Default to 3 columns
  const [selectedAds, setSelectedAds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingAds, setDeletingAds] = useState<Set<number>>(new Set());
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const isDevMode = process.env.NODE_ENV === 'development';

  useEffect(() => {
    fetchAds();
  }, [filters]);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });

    // Persist to sessionStorage for navigation without query params
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(storageKey, JSON.stringify(filters));
    }
  }, [filters, router, pathname]);

  // Clear selection when ads change (e.g., after deletion)
  useEffect(() => {
    if (selectedAds.size > 0) {
      const currentAdIds = new Set(ads.map(ad => ad.id).filter((id): id is number => id !== undefined));
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
      if (filters.competitor_id) safeFilters.competitor_id = filters.competitor_id;
      
      // Add duration filters
      if (filters.min_duration_days !== undefined) safeFilters.min_duration_days = filters.min_duration_days;
      if (filters.max_duration_days !== undefined) safeFilters.max_duration_days = filters.max_duration_days;
      
      // Add score filters
      if (filters.min_overall_score !== undefined) safeFilters.min_overall_score = filters.min_overall_score;
      if (filters.max_overall_score !== undefined) safeFilters.max_overall_score = filters.max_overall_score;
      if (filters.min_hook_score !== undefined) safeFilters.min_hook_score = filters.min_hook_score;
      if (filters.max_hook_score !== undefined) safeFilters.max_hook_score = filters.max_hook_score;
      
      // Add date filters
      if (filters.date_from) safeFilters.date_from = filters.date_from;
      if (filters.date_to) safeFilters.date_to = filters.date_to;
      
      // Fetch ads with analysis using simplified filters
      const response = await adsApi.getAds(safeFilters);
      
      // Use actual pagination metadata from backend
      setTotalItems(response.pagination.total_items);
      setTotalPages(response.pagination.total_pages);
      
      const transformedAds = transformAdsWithAnalysis(response.data);
      setAds(transformedAds);
      
      // The client-side filtering was removed for debugging.
      // The stats are now calculated on the transformed ads.
      
      // Calculate stats based on transformed ads
      const highScoreCount = transformedAds.filter(ad => 
        ad.analysis?.overall_score !== undefined && 
        ad.analysis.overall_score > 8).length;
      const activeCount = transformedAds.filter(ad => ad.is_active === true).length;
      const adsWithAnalysis = transformedAds.filter(ad => 
        ad.analysis?.overall_score !== undefined);
      const avgScore = adsWithAnalysis.length > 0 
        ? adsWithAnalysis.reduce((sum, ad) => sum + (ad.analysis?.overall_score || 0), 0) / adsWithAnalysis.length 
        : 0;
      
      setStats({
        totalAds: response.pagination.total_items,
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

  const handleSaveToggle = (adIdOrSetId: number, isSaved: boolean) => {
    // If filtering by favorites and ad is being unsaved, remove it from view
    if (filters.is_favorite === true && !isSaved) {
      setAds(prevAds => prevAds.filter(ad => 
        ad.ad_set_id !== adIdOrSetId && ad.id !== adIdOrSetId
      ));
    } else {
      // Otherwise just update the save status
      setAds(prevAds => prevAds.map(ad => {
        // Match by ad_set_id (for ad sets) or by ad id (for single ads)
        if (ad.ad_set_id === adIdOrSetId || ad.id === adIdOrSetId) {
          return { ...ad, is_favorite: isSaved };
        }
        return ad;
      }));
    }
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
      // Filter out ads with undefined id before creating the Set
      setSelectedAds(new Set(ads.map(ad => ad.id).filter((id): id is number => id !== undefined)));
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
      setAds(prevAds => prevAds.filter(ad => !adIds.includes(ad.id as number)));
      
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

  const handleDropAllAds = async () => {
    if (!window.confirm('WARNING: This will delete ALL ads in the database. This action cannot be undone. Are you sure?')) {
      return;
    }
    
    try {
      setIsDeletingAll(true);
      const result = await adsApi.deleteAllAds();
      alert(`Successfully deleted ${result.count} ads`);
      fetchAds(); // Refresh the ads list
    } catch (error) {
      console.error('Error deleting all ads:', error);
      alert(`Error deleting all ads: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeletingAll(false);
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
      
      {/* Dev Tools card removed as per requirements */}
    </div>
  );

  const renderLoadingState = () => (
    <div className="space-y-8">
      {renderStats()}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* Filter controls still available when no ads */}
      <AdFilters
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
        currentFilters={filters}
        inline
        disabled={loading}
      />

      {/* Active filter badges with ability to remove */}
      <ActiveFilterBadges
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
      />

      <div className="text-center py-12">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-photon-300 flex items-center justify-center gap-2">
              <Brain className="h-5 w-5" />
              No Ads Found
            </CardTitle>
            <CardDescription>
              No ads match the current filters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-iridium-400">
              Adjust or clear filters to broaden your search.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              {/* Clear all filters button appears only if any extra filters are active */}
              {Object.keys(filters).some(k => !['page','page_size','sort_by','sort_order'].includes(k)) && (
                <Button onClick={handleResetFilters} variant="secondary">
                  <Filter className="mr-2 h-4 w-4" />
                  Clear Filters
            </Button>
              )}
            </div>
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
            {viewMode === 'grid' && (
              <Select 
                value={String(gridColumns)} 
                onValueChange={(value) => setGridColumns(Number(value) as 2 | 3 | 4 | 5)}
                disabled={loading}
              >
                <SelectTrigger className="w-[140px]">
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Columns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                  <SelectItem value="4">4 Columns</SelectItem>
                  <SelectItem value="5">5 Columns</SelectItem>
                </SelectContent>
              </Select>
            )}
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
              <div className={`grid gap-6 ${
                gridColumns === 2 ? 'grid-cols-1 lg:grid-cols-2' :
                gridColumns === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                gridColumns === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
                'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
              }`}>
                {ads.map((ad) => (
                  <AdCard 
                    key={`ad-${ad.id ?? 'unknown'}`} 
                    ad={ad} 
                    isSelected={ad.id !== undefined && selectedAds.has(ad.id)}
                    isDeleting={ad.id !== undefined && deletingAds.has(ad.id)}
                    onSelectionChange={handleAdSelection}
                    onSaveToggle={handleSaveToggle}
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