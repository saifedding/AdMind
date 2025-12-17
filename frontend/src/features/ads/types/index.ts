import { AdFilterParams } from '@/lib/api';

export interface AdStatsData {
  totalAds: number;
  highScoreAds: number;
  avgScore: number;
  activeAds: number;
  analyzedAds: number;
}

export interface AdViewSettings {
  viewMode: 'grid' | 'list';
  gridColumns: 2 | 3 | 4 | 5;
}

export interface AdSelectionState {
  selectedAds: Set<number>;
  isDeleting: boolean;
  deletingAds: Set<number>;
}

export interface AdFilters extends AdFilterParams {
  // Extend base filters with any additional UI-specific filters
}

export interface AdDuration {
  formattedDate: string | null;
  duration: number | null;
  isActive: boolean;
}