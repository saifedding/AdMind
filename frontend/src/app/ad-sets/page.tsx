'use client';

import { useEffect, useState } from 'react';
import { adsApi, ApiError } from '@/lib/api';
import { AdWithAnalysis } from '@/types/ad';
import { transformAdsWithAnalysis } from '@/lib/transformers';
import { DashboardLayout } from '@/components/dashboard';
import { AdCard } from '@/features/dashboard/components/AdCard';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Grid, Layers, ChevronUp, ChevronDown, ImageIcon, Film, Calendar } from 'lucide-react';

export default function AdSetsPage() {
  const [adSets, setAdSets] = useState<AdWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(24);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchAdSets();
  }, [page, sortBy, sortOrder]);

  const fetchAdSets = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adsApi.getAllAdSets(page, pageSize, sortBy, sortOrder);
      
      setTotalItems(response.pagination.total_items);
      setTotalPages(response.pagination.total_pages);
      
      const transformedAds = transformAdsWithAnalysis(response.data);
      setAdSets(transformedAds);
      
    } catch (err) {
      console.error('Error fetching ad sets:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to fetch ad sets');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setPage(1); // Reset to first page when changing sort
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    setPage(1); // Reset to first page when changing sort order
  };

  const renderSortIcon = () => {
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const renderAdSets = () => {
    if (adSets.length === 0) {
      return (
        <Card className="col-span-full border-muted bg-muted/20">
          <CardContent className="text-center p-12">
            <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No ad sets found.</p>
          </CardContent>
        </Card>
      );
    }

    return adSets.map(ad => (
      <div key={ad.ad_set_id} className="group">
        <AdCard ad={ad} />
      </div>
    ));
  };

  const renderLoading = () => (
    <div className="col-span-full flex items-center justify-center h-96">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="text-muted-foreground">Loading ad sets...</p>
      </div>
    </div>
  );

  const renderError = () => (
    <Card className="col-span-full border-red-300 bg-red-50 dark:bg-red-900/10">
      <CardHeader>
        <CardTitle className="text-red-600 dark:text-red-400">Error</CardTitle>
        <CardDescription className="text-red-500 dark:text-red-300">
          Failed to load ad sets
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
        <Button variant="outline" className="mt-4" onClick={fetchAdSets}>
          Try Again
        </Button>
      </CardContent>
    </Card>
  );

  const renderStats = () => {
    if (totalItems === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-3 mb-6">
        <Badge variant="outline" className="bg-muted/50 text-foreground flex items-center gap-1 px-3 py-1.5">
          <Layers className="h-4 w-4" />
          <span>{totalItems} Ad Sets</span>
        </Badge>
      </div>
    );
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
            {renderStats()}
          </div>
          
          <div className="flex items-center space-x-2">
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Date Created</SelectItem>
                <SelectItem value="variant_count">Variant Count</SelectItem>
                <SelectItem value="first_seen_date">First Seen Date</SelectItem>
                <SelectItem value="last_seen_date">Last Seen Date</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="icon" onClick={toggleSortOrder} title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}>
              {renderSortIcon()}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading && renderLoading()}
          {error && renderError()}
          {!loading && !error && renderAdSets()}
        </div>
        
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
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
    </DashboardLayout>
  );
} 