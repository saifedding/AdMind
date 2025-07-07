'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AdFilterParams } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface ActiveFilterBadgesProps {
  filters: AdFilterParams;
  onRemoveFilter: (key: keyof AdFilterParams) => void;
}

export function ActiveFilterBadges({ filters, onRemoveFilter }: ActiveFilterBadgesProps) {
  // These filters are always applied, so we don't show badges for them
  const defaultFilters = ['page', 'page_size', 'has_analysis', 'sort_by', 'sort_order'];
  
  const getFilterLabel = (key: string, value: any): string => {
    switch (key) {
      case 'media_type':
        return `Media: ${value}`;
      case 'is_active':
        return value ? 'Active Ads' : 'Inactive Ads';
      case 'min_overall_score':
        return `Min Score: ${value}`;
      case 'max_overall_score':
        return `Max Score: ${value}`;
      case 'min_hook_score':
        return `Min Hook: ${value}`;
      case 'max_hook_score':
        return `Max Hook: ${value}`;
      case 'date_from':
        return `From: ${formatDate(value)}`;
      case 'date_to':
        return `To: ${formatDate(value)}`;
      case 'competitor_id':
        return `Competitor ID: ${value}`;
      case 'competitor_name':
        return `Competitor: ${value}`;
      case 'search':
        return `Search: ${value}`;
      default:
        return `${key}: ${value}`;
    }
  };

  // Get active filters (exclude defaults and empty values)
  const activeFilters = Object.entries(filters).filter(([key, value]) => {
    return (
      !defaultFilters.includes(key) && 
      value !== undefined && 
      value !== null && 
      value !== ''
    );
  });

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {activeFilters.map(([key, value]) => (
        <Badge 
          key={key}
          variant="secondary"
          className="px-3 py-1 gap-1 text-xs bg-photon-900/50 border border-photon-700/30 text-photon-300 hover:bg-photon-800/50"
        >
          {getFilterLabel(key, value)}
          <button 
            onClick={() => onRemoveFilter(key as keyof AdFilterParams)}
            className="ml-1 hover:text-photon-100 rounded-full"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove {key} filter</span>
          </button>
        </Badge>
      ))}
    </div>
  );
}

export default ActiveFilterBadges; 