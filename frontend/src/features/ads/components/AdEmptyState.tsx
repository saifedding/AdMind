'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, RefreshCw, Filter } from 'lucide-react';
import { AdFilters } from '@/features/dashboard/components/AdFilters';
import { ActiveFilterBadges } from '@/features/dashboard/components/ActiveFilterBadges';
import { AdFilterParams } from '@/lib/api';
import { AdStats } from './AdStats';
import { AdStatsData } from '../types';

interface AdEmptyStateProps {
  stats: AdStatsData;
  filters: AdFilterParams;
  loading: boolean;
  onApplyFilters: (filters: AdFilterParams) => void;
  onResetFilters: () => void;
  onRemoveFilter: (key: keyof AdFilterParams) => void;
  onRefresh: () => void;
}

export function AdEmptyState({ 
  stats, 
  filters, 
  loading, 
  onApplyFilters, 
  onResetFilters, 
  onRemoveFilter, 
  onRefresh 
}: AdEmptyStateProps) {
  return (
    <div className="space-y-8">
      <AdStats stats={stats} />

      <AdFilters
        onApplyFilters={onApplyFilters}
        onResetFilters={onResetFilters}
        currentFilters={filters}
        inline
        disabled={loading}
      />

      <ActiveFilterBadges
        filters={filters}
        onRemoveFilter={onRemoveFilter}
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
              <Button onClick={onRefresh} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              {Object.keys(filters).some(k => !['page','page_size','sort_by','sort_order'].includes(k)) && (
                <Button onClick={onResetFilters} variant="secondary">
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
}