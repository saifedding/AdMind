'use client';

import { AdWithAnalysis } from '@/types/ad';
import { AdCard } from '@/features/dashboard/components/AdCard';
import { Card, CardContent } from '@/components/ui/card';
import { Layers } from 'lucide-react';

interface AdSetGridProps {
  adSets: AdWithAnalysis[];
  loading?: boolean;
  error?: string | null;
}

export function AdSetGrid({ adSets, loading, error }: AdSetGridProps) {
  if (loading) {
    return (
      <div className="col-span-full flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="text-muted-foreground">Loading ad sets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full border-red-300 bg-red-50 dark:bg-red-900/10">
        <CardContent className="text-center p-12">
          <p className="text-red-600 dark:text-red-300">{error}</p>
        </CardContent>
      </Card>
    );
  }

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

  return (
    <>
      {adSets.map(ad => (
        <div key={ad.ad_set_id} className="group">
          <AdCard ad={ad} />
        </div>
      ))}
    </>
  );
}