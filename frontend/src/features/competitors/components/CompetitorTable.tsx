import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CategoryBadge } from '@/components/CategoryBadge';
import { Eye, Edit2, Download, Eraser, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCompetitorsStore } from '../stores/competitors-store';
import { useCompetitorsQuery } from '../hooks/use-competitors-query';
import type { Competitor } from '@/lib/api';

export function CompetitorTable() {
  const router = useRouter();
  const {
    searchTerm,
    statusFilter,
    categoryFilter,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
    selectedIds,
    setSelectedCompetitor,
    setEditDialogOpen,
    setScrapingCompetitor,
    setScrapeDialogOpen,
    setClearingCompetitor,
    setClearDialogOpen,
    setConfirmDeleteDialogOpen,
    toggleSelectId,
    selectAllVisible,
    deselectAllVisible,
  } = useCompetitorsStore();

  const { data: competitorsData, isLoading, error } = useCompetitorsQuery({
    page: currentPage,
    page_size: pageSize,
    is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
    category_id: categoryFilter === null ? undefined : categoryFilter,
    search: searchTerm || undefined,
    sort_by: sortBy,
    sort_order: sortOrder
  });

  const competitors = competitorsData?.data || [];
  const visibleCompetitorIds = competitors.map(c => c.id);
  const isAllVisibleSelected = selectedIds.length > 0 && visibleCompetitorIds.every(id => selectedIds.includes(id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      selectAllVisible(visibleCompetitorIds);
    } else {
      deselectAllVisible(visibleCompetitorIds);
    }
  };

  const handleViewCompetitor = (competitor: Competitor) => {
    router.push(`/competitors/${competitor.id}`);
  };

  const handleEditCompetitor = (competitor: Competitor) => {
    setSelectedCompetitor(competitor);
    setEditDialogOpen(true);
  };

  const handleScrapeCompetitor = (competitor: Competitor) => {
    setScrapingCompetitor(competitor);
    setScrapeDialogOpen(true);
  };

  const handleClearAds = (competitor: Competitor) => {
    setClearingCompetitor(competitor);
    setClearDialogOpen(true);
  };

  const handleDeleteCompetitor = (competitor: Competitor) => {
    setSelectedCompetitor(competitor);
    setConfirmDeleteDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 w-10 text-left">
                <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
              </th>
              <th className="p-2 text-left font-semibold">Name</th>
              <th className="p-2 text-left font-semibold">Page ID</th>
              <th className="p-2 text-left font-semibold">Category</th>
              <th className="p-2 text-left font-semibold">Status</th>
              <th className="p-2 text-left font-semibold">Ads</th>
              <th className="p-2 text-left font-semibold">Last Updated</th>
              <th className="p-2 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="border-b animate-pulse">
                <td className="p-2">
                  <div className="h-4 w-4 bg-muted rounded"></div>
                </td>
                <td className="p-2">
                  <div className="h-4 bg-muted rounded w-32"></div>
                </td>
                <td className="p-2">
                  <div className="h-4 bg-muted rounded w-24"></div>
                </td>
                <td className="p-2">
                  <div className="h-6 bg-muted rounded w-20"></div>
                </td>
                <td className="p-2">
                  <div className="h-6 bg-muted rounded w-16"></div>
                </td>
                <td className="p-2">
                  <div className="h-4 bg-muted rounded w-8"></div>
                </td>
                <td className="p-2">
                  <div className="h-4 bg-muted rounded w-20"></div>
                </td>
                <td className="p-2">
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <div key={j} className="h-8 w-8 bg-muted rounded"></div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-400">Failed to load competitors: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2 w-10 text-left">
              <Checkbox
                checked={isAllVisibleSelected}
                onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                aria-label="Select all"
              />
            </th>
            <th className="p-2 text-left font-semibold">Name</th>
            <th className="p-2 text-left font-semibold">Page ID</th>
            <th className="p-2 text-left font-semibold">Category</th>
            <th className="p-2 text-left font-semibold">Status</th>
            <th className="p-2 text-left font-semibold">Ads</th>
            <th className="p-2 text-left font-semibold">Last Updated</th>
            <th className="p-2 text-left font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {competitors.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center p-8 text-muted-foreground">
                No competitors found.
              </td>
            </tr>
          ) : (
            competitors.map(competitor => (
              <tr key={competitor.id} className="border-b hover:bg-muted/50 transition-colors">
                <td className="p-2">
                  <Checkbox
                    checked={selectedIds.includes(competitor.id)}
                    onCheckedChange={(checked) => toggleSelectId(competitor.id)}
                    aria-label={`Select ${competitor.name}`}
                  />
                </td>
                <td className="p-2 font-medium">{competitor.name}</td>
                <td className="p-2 text-muted-foreground">{competitor.page_id}</td>
                <td className="p-2">
                  {competitor.category_name ? (
                    <CategoryBadge 
                      categoryName={competitor.category_name} 
                      size="sm" 
                      variant="outline"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">Uncategorized</span>
                  )}
                </td>
                <td className="p-2">
                  <Badge 
                    variant={competitor.is_active ? 'default' : 'secondary'}
                    className={competitor.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                  >
                    {competitor.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="p-2">{competitor.ads_count || 0}</td>
                <td className="p-2 text-muted-foreground">{formatDate(competitor.updated_at)}</td>
                <td className="p-2">
                  <div className="flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleViewCompetitor(competitor)}
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEditCompetitor(competitor)}
                      title="Edit competitor"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleScrapeCompetitor(competitor)}
                      title="Scrape ads"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleClearAds(competitor)}
                      title="Clear ads"
                    >
                      <Eraser className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive" 
                      onClick={() => handleDeleteCompetitor(competitor)}
                      title="Delete competitor"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}