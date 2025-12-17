export interface AdSetDetails {
  id: number;
  variant_count: number;
  first_seen_date?: string;
  last_seen_date?: string;
  best_ad_id?: number;
}

export interface AdSetSortOptions {
  sortBy: 'created_at' | 'variant_count' | 'first_seen_date' | 'last_seen_date';
  sortOrder: 'asc' | 'desc';
}

export interface AdSetFilters {
  minVariants?: number;
  maxVariants?: number;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface AdSetStats {
  totalSets: number;
  totalVariants: number;
  averageVariantsPerSet: number;
}