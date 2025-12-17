'use client';

import { AdWithAnalysis } from '@/types/ad';
import { AdCard } from '@/features/dashboard/components/AdCard';
import { AdViewSettings, AdSelectionState } from '../types';

interface AdGridProps {
  ads: AdWithAnalysis[];
  viewSettings: AdViewSettings;
  selectionState: AdSelectionState;
  onSelectionChange: (adId: number, selected: boolean) => void;
  onSaveToggle: (adIdOrSetId: number, isSaved: boolean) => void;
}

export function AdGrid({ 
  ads, 
  viewSettings, 
  selectionState, 
  onSelectionChange, 
  onSaveToggle 
}: AdGridProps) {
  const { gridColumns } = viewSettings;
  const { selectedAds, deletingAds } = selectionState;

  const gridClasses = {
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
  };

  return (
    <div className={`grid gap-6 ${gridClasses[gridColumns]}`}>
      {ads.map((ad) => (
        <AdCard 
          key={`ad-${ad.id ?? 'unknown'}`} 
          ad={ad} 
          isSelected={ad.id !== undefined && selectedAds.has(ad.id)}
          isDeleting={ad.id !== undefined && deletingAds.has(ad.id)}
          onSelectionChange={onSelectionChange}
          onSaveToggle={onSaveToggle}
          showSelection={true}
        />
      ))}
    </div>
  );
}