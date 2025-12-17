'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface AdSetSortControlsProps {
  sortBy: string;
  sortOrder: string;
  onSortByChange: (value: string) => void;
  onToggleSortOrder: () => void;
}

export function AdSetSortControls({
  sortBy,
  sortOrder,
  onSortByChange,
  onToggleSortOrder
}: AdSetSortControlsProps) {
  const renderSortIcon = () => {
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  return (
    <div className="flex items-center space-x-2">
      <Select value={sortBy} onValueChange={onSortByChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created_at">Date Created</SelectItem>
          <SelectItem value="variant_count">Variant Count</SelectItem>
          <SelectItem value="first_seen_date">First Seen Date</SelectItem>
          <SelectItem value="last_seen_date">Last Seen Date</SelectItem>
        </SelectContent>
      </Select>
      
      <Button 
        variant="outline" 
        size="icon" 
        onClick={onToggleSortOrder} 
        title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
      >
        {renderSortIcon()}
      </Button>
    </div>
  );
}