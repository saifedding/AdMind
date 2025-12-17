'use client';

import { AdStats } from './AdStats';
import { AdStatsData } from '../types';

interface AdLoadingStateProps {
  stats: AdStatsData;
}

export function AdLoadingState({ stats }: AdLoadingStateProps) {
  return (
    <div className="space-y-8">
      <AdStats stats={stats} />
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
}