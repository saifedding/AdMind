'use client';

import { AdWithAnalysis } from '@/types/ad';
import { AdCard } from '@/features/dashboard/components/AdCard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdVariantGridProps {
  adVariants: AdWithAnalysis[];
  bestAdId: number | null;
  loading?: boolean;
  error?: string | null;
}

export function AdVariantGrid({ adVariants, bestAdId, loading, error }: AdVariantGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="text-muted-foreground">Loading ad variants...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-300 bg-red-50 dark:bg-red-900/10">
        <CardContent className="text-center p-12">
          <p className="text-red-600 dark:text-red-300">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (adVariants.length === 0) {
    return (
      <Card className="border-muted bg-muted/20">
        <CardContent className="text-center p-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">No ad variants found in this set.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {adVariants.map(ad => (
        <div key={ad.id} className="relative">
          {ad.id === bestAdId && (
            <div className="absolute -top-2 -right-2 z-20">
              <Badge className="bg-amber-500 text-black flex items-center gap-1 px-2 py-1 shadow-lg">
                <Star className="h-3 w-3 fill-current" />
                <span className="font-semibold">Best Variant</span>
              </Badge>
            </div>
          )}
          <div className={cn(
            ad.id === bestAdId && "ring-2 ring-amber-500 ring-offset-2 rounded-lg"
          )}>
            <AdCard ad={ad} hideSetBadge={true} disableSetNavigation={true} />
          </div>
        </div>
      ))}
    </div>
  );
}