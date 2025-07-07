'use client';

import React, { useState } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger,
  SheetFooter
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/datepicker';
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Filter, 
  X, 
  Check,
  RefreshCw,
  ChevronRight,
  CalendarRange
} from 'lucide-react';
import { AdFilterParams } from '@/lib/api';

interface AdFiltersProps {
  onApplyFilters: (filters: AdFilterParams) => void;
  onResetFilters: () => void;
  disabled?: boolean;
}

export function AdFilters({ onApplyFilters, onResetFilters, disabled = false }: AdFiltersProps) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<AdFilterParams>({});
  
  // Score ranges
  const [overallScoreRange, setOverallScoreRange] = useState<number[]>([0, 10]);
  const [hookScoreRange, setHookScoreRange] = useState<number[]>([0, 10]);

  // Handle form submission
  const handleApplyFilters = () => {
    const appliedFilters: AdFilterParams = {
      ...filters,
      min_overall_score: overallScoreRange[0] || undefined,
      max_overall_score: overallScoreRange[1] || undefined,
      min_hook_score: hookScoreRange[0] || undefined,
      max_hook_score: hookScoreRange[1] || undefined
    };
    
    onApplyFilters(appliedFilters);
    setOpen(false);
  };

  const handleReset = () => {
    setFilters({});
    setOverallScoreRange([0, 10]);
    setHookScoreRange([0, 10]);
    onResetFilters();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-mono text-photon-300">Ad Filters</SheetTitle>
          <SheetDescription>
            Filter ads based on performance, content, and metadata
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Search</label>
            <Input 
              placeholder="Search by ad title, copy, or caption" 
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>

          {/* Media Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Media Type</label>
            <Select 
              value={filters.media_type || 'all'} 
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                media_type: value === 'all' ? undefined : value 
              }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Media Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Media Types</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="carousel">Carousel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Status</label>
            <Select 
              value={filters.is_active !== undefined ? String(filters.is_active) : 'all'}
              onValueChange={(value) => {
                const isActive = value === 'all' ? undefined : value === 'true';
                setFilters(prev => ({ ...prev, is_active: isActive }));
              }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Ads" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ads</SelectItem>
                <SelectItem value="true">Active Ads</SelectItem>
                <SelectItem value="false">Ended Ads</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Score Ranges */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-foreground">Overall Score Range</label>
            <Slider 
              value={overallScoreRange} 
              min={0} 
              max={10} 
              step={0.5}
              onValueChange={setOverallScoreRange}
              className="pb-6 mb-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{overallScoreRange[0].toFixed(1)}</span>
              <span>{overallScoreRange[1].toFixed(1)}</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <label className="text-sm font-medium text-foreground">Hook Score Range</label>
            <Slider 
              value={hookScoreRange} 
              min={0} 
              max={10} 
              step={0.5}
              onValueChange={setHookScoreRange}
              className="pb-6 mb-2" 
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{hookScoreRange[0].toFixed(1)}</span>
              <span>{hookScoreRange[1].toFixed(1)}</span>
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-foreground flex items-center gap-1">
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker
                label="From"
                value={filters.date_from || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
              />
              <DatePicker
                label="To"
                value={filters.date_to || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
              />
            </div>
          </div>

          {/* Sort Options */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Sort By</label>
            <div className="grid grid-cols-2 gap-2">
              <Select 
                value={filters.sort_by || 'created_at'} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, sort_by: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Created At" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Created At</SelectItem>
                  <SelectItem value="overall_score">Overall Score</SelectItem>
                  <SelectItem value="hook_score">Hook Score</SelectItem>
                  <SelectItem value="date_found">Date Found</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={filters.sort_order || 'desc'} 
                onValueChange={(value: 'asc' | 'desc') => setFilters(prev => ({ ...prev, sort_order: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Descending" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <SheetFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline"
            onClick={handleReset}
            className="w-full sm:w-auto"
          >
            <X className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button 
            onClick={handleApplyFilters}
            className="w-full sm:w-auto bg-photon-500 hover:bg-photon-600 text-black"
          >
            <Check className="mr-2 h-4 w-4" />
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default AdFilters; 