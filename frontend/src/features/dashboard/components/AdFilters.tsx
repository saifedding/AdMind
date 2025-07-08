'use client';

import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  ChevronUp,
  CalendarRange,
  Target,
  Star,
  Activity
} from 'lucide-react';
import { AdFilterParams, getCompetitors, type Competitor } from '@/lib/api';

// Simple global store for competitors
class CompetitorsStore {
  private static instance: CompetitorsStore;
  private competitors: Competitor[] = [];
  private loading = false;
  private loaded = false;

  static getInstance(): CompetitorsStore {
    if (!CompetitorsStore.instance) {
      CompetitorsStore.instance = new CompetitorsStore();
    }
    return CompetitorsStore.instance;
  }

  async getCompetitors(): Promise<Competitor[]> {
    if (this.loaded) {
      return this.competitors;
    }

    if (this.loading) {
      // Wait for current loading to complete
      while (this.loading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.competitors;
    }

    this.loading = true;
    try {
      console.log('Fetching competitors...');
      const response = await getCompetitors({ page: 1, page_size: 100 });
      console.log('Competitors response:', response);
      this.competitors = response.data; // Extract data from paginated response
      this.loaded = true;
      console.log('Loaded competitors:', this.competitors.length, this.competitors);
    } catch (e) {
      console.error('Failed to load competitors', e);
      this.competitors = []; // Reset on error
    } finally {
      this.loading = false;
    }
    
    return this.competitors;
  }

  refresh() {
    this.loaded = false;
    this.competitors = [];
  }
}

interface AdFiltersProps {
  onApplyFilters: (filters: AdFilterParams) => void;
  onResetFilters: () => void;
  disabled?: boolean;
  inline?: boolean;
  currentFilters?: AdFilterParams; // Add current filters prop
}

export function AdFilters({ 
  onApplyFilters, 
  onResetFilters, 
  disabled = false, 
  inline = false,
  currentFilters = {} 
}: AdFiltersProps) {
  const [open, setOpen] = useState(inline);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Initialize filters from current filters
  const [filters, setFilters] = useState<AdFilterParams>(currentFilters);
  
  // Score ranges - initialize from current filters
  const [overallScoreRange, setOverallScoreRange] = useState<number[]>([
    currentFilters.min_overall_score || 0,
    currentFilters.max_overall_score || 10
  ]);
  const [hookScoreRange, setHookScoreRange] = useState<number[]>([
    currentFilters.min_hook_score || 0,
    currentFilters.max_hook_score || 10
  ]);
  const [durationRange, setDurationRange] = useState<number[]>([
    currentFilters.min_duration_days || 1,
    currentFilters.max_duration_days || 365
  ]);

  // Competitors
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loadingCompetitors, setLoadingCompetitors] = useState(false);

  // Update internal state when currentFilters prop changes
  useEffect(() => {
    setFilters(currentFilters);
    setOverallScoreRange([
      currentFilters.min_overall_score || 0,
      currentFilters.max_overall_score || 10
    ]);
    setHookScoreRange([
      currentFilters.min_hook_score || 0,
      currentFilters.max_hook_score || 10
    ]);
    setDurationRange([
      currentFilters.min_duration_days || 1,
      currentFilters.max_duration_days || 365
    ]);
  }, [currentFilters]);

  useEffect(() => {
    // Load competitors from global store
    (async () => {
      setLoadingCompetitors(true);
      try {
        const competitorsStore = CompetitorsStore.getInstance();
        const data = await competitorsStore.getCompetitors();
        console.log('Setting competitors in component:', data);
        setCompetitors(data);
      } catch (e) {
        console.error('Failed to load competitors in component', e);
        // Set empty array as fallback
        setCompetitors([]);
      } finally {
        setLoadingCompetitors(false);
      }
    })();
  }, []);

  // Handle form submission
  const handleApplyFilters = () => {
    const appliedFilters: AdFilterParams = {
      ...filters,
      min_overall_score: overallScoreRange[0] !== 0 ? overallScoreRange[0] : undefined,
      max_overall_score: overallScoreRange[1] !== 10 ? overallScoreRange[1] : undefined,
      min_hook_score: hookScoreRange[0] !== 0 ? hookScoreRange[0] : undefined,
      max_hook_score: hookScoreRange[1] !== 10 ? hookScoreRange[1] : undefined,
      // Send duration filters if user has moved away from the full range [1, 365]
      min_duration_days: durationRange[0] !== 1 || durationRange[1] !== 365 ? durationRange[0] : undefined,
      max_duration_days: durationRange[0] !== 1 || durationRange[1] !== 365 ? durationRange[1] : undefined
    };
    
    onApplyFilters(appliedFilters);
    setOpen(false);
  };

  const handleReset = () => {
    setFilters({});
    setOverallScoreRange([0, 10]);
    setHookScoreRange([0, 10]);
    setDurationRange([1, 365]);
    onResetFilters();
    setOpen(false);
  };

  if (inline) {
  return (
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
        {/* Row 1: Main Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-8 gap-4">
          {/* Competitor */}
          <div className="space-y-2 min-w-0 xl:col-span-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Target className="h-3 w-3" />
              <span className="truncate">Competitor</span>
            </label>
            <Select 
              value={filters.competitor_id ? String(filters.competitor_id) : 'all'} 
              onValueChange={(v) => setFilters(p => ({ ...p, competitor_id: v === 'all' ? undefined : Number(v) }))}
              disabled={loadingCompetitors}
            >
              <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 min-w-0">
                <SelectValue placeholder={loadingCompetitors ? "Loading..." : "All"} />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                <SelectItem value="all">All Competitors</SelectItem>
                {competitors.length > 0 ? competitors.map(c => (
                  <SelectItem key={c.id} value={String(c.id)} title={c.name}>
                    <span className="truncate block max-w-[250px]">{c.name}</span>
                  </SelectItem>
                )) : (
                  <SelectItem value="no-data" disabled>
                    {loadingCompetitors ? 'Loading...' : 'No competitors found'}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Media Type */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Media Type</label>
            <Select 
              value={filters.media_type || 'all'} 
              onValueChange={(v) => setFilters(p => ({ ...p, media_type: v === 'all' ? undefined : v }))}
            >
              <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 min-w-0">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="carousel">Carousel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Status
            </label>
            <Select 
              value={filters.is_active !== undefined ? String(filters.is_active) : 'all'} 
              onValueChange={(v) => setFilters(p => ({ ...p, is_active: v === 'all' ? undefined : v === 'true' }))}
            >
              <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 min-w-0">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Ended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Overall Score Range */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Star className="h-3 w-3" />
              <span className="truncate">Overall Score</span>
            </label>
            <div className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md">
              <Slider 
                value={overallScoreRange} 
                min={0} 
                max={10} 
                step={0.5}
                onValueChange={setOverallScoreRange}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>{overallScoreRange[0]}</span>
                <span>{overallScoreRange[1]}</span>
              </div>
            </div>
          </div>

          {/* Hook Score Range */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Hook Score</label>
            <div className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md">
              <Slider 
                value={hookScoreRange} 
                min={0} 
                max={10} 
                step={0.5}
                onValueChange={setHookScoreRange}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>{hookScoreRange[0]}</span>
                <span>{hookScoreRange[1]}</span>
              </div>
            </div>
          </div>

          {/* Duration Range */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Duration (Days)</label>
            <div className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md">
              <Slider 
                value={durationRange} 
                min={1} 
                max={365} 
                step={1}
                onValueChange={setDurationRange}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>{durationRange[0]}d</span>
                <span>{durationRange[1]}d</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Actions</label>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReset}
                className="h-9 px-3 text-sm border-slate-300 dark:border-slate-600"
              >
                <X className="h-3 w-3" />
              </Button>
              <Button 
                onClick={handleApplyFilters}
                size="sm"
                className="h-9 px-4 text-sm bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Check className="h-3 w-3 mr-1" />
                Apply
              </Button>
            </div>
          </div>
        </div>

        {/* Row 2: Advanced Filters (Collapsible) */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="h-8 px-3 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          >
            {showAdvanced ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
          </Button>
          
          {showAdvanced && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div className="space-y-2 min-w-0">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <CalendarRange className="h-3 w-3" />
                  <span className="truncate">Date From</span>
                </label>
                <DatePicker
                  value={filters.date_from || ''}
                  onChange={(e) => setFilters(p => ({ ...p, date_from: e.target.value }))}
                  className="h-9 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 min-w-0 w-full"
                />
              </div>
              
              <div className="space-y-2 min-w-0">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Date To</label>
                <DatePicker
                  value={filters.date_to || ''}
                  onChange={(e) => setFilters(p => ({ ...p, date_to: e.target.value }))}
                  className="h-9 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 min-w-0 w-full"
                />
              </div>

              {/* Sort By */}
              <div className="space-y-2 min-w-0">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Sort By</label>
                <Select 
                  value={filters.sort_by || 'created_at'} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, sort_by: value }))}
                >
                  <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 min-w-0">
                    <SelectValue placeholder="Created At" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Created At</SelectItem>
                    <SelectItem value="date_found">Date Found</SelectItem>
                    <SelectItem value="duration_days">Duration (Days)</SelectItem>
                    <SelectItem value="overall_score">Overall Score</SelectItem>
                    <SelectItem value="hook_score">Hook Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order */}
              <div className="space-y-2 min-w-0">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Order</label>
                <Select 
                  value={filters.sort_order || 'desc'} 
                  onValueChange={(value: 'asc' | 'desc') => setFilters(prev => ({ ...prev, sort_order: value }))}
                >
                  <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 min-w-0">
                    <SelectValue placeholder="Desc" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Button variant="outline" disabled={disabled} onClick={() => setOpen(!open)}>
          <Filter className="mr-2 h-4 w-4" />
        {open ? 'Hide Filters' : 'Show Filters'}
        </Button>

      {open && (
        <div className="mt-4 rounded-lg border border-border bg-card p-4 max-h-[80vh] overflow-y-auto w-full sm:w-96 space-y-6">
          <div className="pb-2 border-b mb-2">
            <h3 className="font-mono text-photon-300 text-lg">Ad Filters</h3>
            <p className="text-sm text-muted-foreground">Filter ads based on performance, content, and metadata</p>
          </div>

          {/* Legacy form content for non-inline mode */}
          <div className="space-y-6">
            {/* Competitor Dropdown */}
          <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Competitor</label>
              <Select
                value={filters.competitor_id ? String(filters.competitor_id) : 'all'}
                onValueChange={(value) => {
                  setFilters(prev => ({ ...prev, competitor_id: value === 'all' ? undefined : Number(value) }))
                }}
                disabled={loadingCompetitors}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loadingCompetitors ? "Loading competitors..." : "All Competitors"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Competitors</SelectItem>
                  {competitors.length > 0 ? competitors.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  )) : (
                    <SelectItem value="no-data" disabled>
                      {loadingCompetitors ? 'Loading...' : 'No competitors found'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
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
          
            {/* Score sliders */}
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
                  <SelectItem value="date_found">Date Found</SelectItem>
                  <SelectItem value="duration_days">Duration (Days)</SelectItem>
                  <SelectItem value="overall_score">Overall Score</SelectItem>
                  <SelectItem value="hook_score">Hook Score</SelectItem>
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

            {/* Apply/Reset */}
            <div className="flex-col sm:flex-row gap-2 flex">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdFilters; 