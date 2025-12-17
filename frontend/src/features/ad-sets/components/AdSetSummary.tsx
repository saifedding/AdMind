'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, Calendar, Clock, Star } from 'lucide-react';
import { formatAdSetDuration } from '@/lib/utils';
import { AdSetDetails } from '../types';

interface AdSetSummaryProps {
  adSetDetails: AdSetDetails | null;
}

export function AdSetSummary({ adSetDetails }: AdSetSummaryProps) {
  if (!adSetDetails) return null;
  
  const adSetDuration = formatAdSetDuration(
    adSetDetails.first_seen_date,
    adSetDetails.last_seen_date
  );
  
  return (
    <Card className="mb-6 bg-muted/30">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-500" />
              Ad Set Details
            </h2>
            <p className="text-sm text-muted-foreground">
              This creative concept contains {adSetDetails.variant_count} variants that have been tested over time.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {adSetDetails.first_seen_date && adSetDetails.last_seen_date && (
              <div className="flex items-center gap-1.5 rounded-md bg-indigo-100 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 px-3 py-1.5">
                <Calendar className="h-4 w-4" />
                <div className="text-sm">
                  <span className="font-medium">Lifetime:</span>{' '}
                  <span>{adSetDuration.formattedDate}</span>
                </div>
              </div>
            )}
            
            {adSetDuration.duration && (
              <div className="flex items-center gap-1.5 rounded-md bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-300 px-3 py-1.5">
                <Clock className="h-4 w-4" />
                <div className="text-sm">
                  <span className="font-medium">Duration:</span>{' '}
                  <span>{adSetDuration.duration} days</span>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-1.5 rounded-md bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 px-3 py-1.5">
              <Star className="h-4 w-4" />
              <div className="text-sm font-medium">
                Best variant highlighted
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}