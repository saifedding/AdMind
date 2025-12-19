import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompetitorsStore } from '../stores/competitors-store';
import { useCompetitorsQuery } from '../hooks/use-competitors-query';

export function CompetitorPagination() {
  const {
    searchTerm,
    statusFilter,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
  } = useCompetitorsStore();

  const { data: competitorsData } = useCompetitorsQuery({
    page: currentPage,
    page_size: pageSize,
    is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
    search: searchTerm || undefined,
    sort_by: sortBy,
    sort_order: sortOrder
  });

  if (!competitorsData || competitorsData.total_pages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-2 pt-6">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Rows per page</span>
        <Select
          value={`${pageSize}`}
          onValueChange={(value) => {
            setPageSize(Number(value));
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-24 bg-card border-border">
            <SelectValue placeholder={pageSize} />
          </SelectTrigger>
          <SelectContent>
            {[20, 50, 100, 500, 1000].map(size => (
              <SelectItem key={size} value={`${size}`}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          disabled={!competitorsData.has_previous}
          onClick={() => setCurrentPage(currentPage - 1)}
          className="border-border"
        >
          Previous
        </Button>
        
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {competitorsData.total_pages}
        </span>
        
        <Button
          variant="outline"
          disabled={!competitorsData.has_next}
          onClick={() => setCurrentPage(currentPage + 1)}
          className="border-border"
        >
          Next
        </Button>
      </div>
    </div>
  );
}