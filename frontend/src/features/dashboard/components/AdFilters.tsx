'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/datepicker';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Filter, 
  X, 
  Check,
  ChevronDown,
  ChevronUp,
  CalendarRange,
  Target,
  Star,
  Activity,
  Heart,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  Sliders,
  RotateCcw,
  Search,
  TrendingUp,
  Clock,
  Image,
  Video,
  Grid3X3,
  Play,
  Pause,
  Building2,
  Sparkles,
  FolderOpen
} from 'lucide-react';
import { AdFilterParams, getCompetitors, getCategories, type Competitor, type Category } from '@/lib/api';
import { CategorySelect } from '@/components/CategorySelect';

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
  currentFilters?: AdFilterParams;
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
  const [minDuration, setMinDuration] = useState<number>(
    currentFilters.min_duration_days || 1
  );

  // Competitors
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loadingCompetitors, setLoadingCompetitors] = useState(false);
  
  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

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
    setMinDuration(currentFilters.min_duration_days || 1);
  }, [currentFilters]);

  useEffect(() => {
    // Load categories
    (async () => {
      setLoadingCategories(true);
      try {
        const data = await getCategories();
        console.log('Setting categories in component:', data);
        setCategories(data);
      } catch (e) {
        console.error('Failed to load categories in component', e);
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    })();
  }, []);

  // Load competitors when category changes
  useEffect(() => {
    (async () => {
      setLoadingCompetitors(true);
      try {
        const response = await getCompetitors({ 
          page: 1, 
          page_size: 100,
          category_id: filters.category_id 
        });
        console.log('Setting competitors in component:', response.data);
        setCompetitors(response.data);
      } catch (e) {
        console.error('Failed to load competitors in component', e);
        setCompetitors([]);
      } finally {
        setLoadingCompetitors(false);
      }
    })();
  }, [filters.category_id]);

  // Handle form submission
  const handleApplyFilters = () => {
    const appliedFilters: AdFilterParams = {
      ...filters,
      min_overall_score: overallScoreRange[0] !== 0 ? overallScoreRange[0] : undefined,
      max_overall_score: overallScoreRange[1] !== 10 ? overallScoreRange[1] : undefined,
      min_hook_score: hookScoreRange[0] !== 0 ? hookScoreRange[0] : undefined,
      max_hook_score: hookScoreRange[1] !== 10 ? hookScoreRange[1] : undefined,
      min_duration_days: minDuration !== 1 ? minDuration : undefined
    };
    
    onApplyFilters(appliedFilters);
    setOpen(false);
  };

  const handleReset = () => {
    setFilters({});
    setOverallScoreRange([0, 10]);
    setHookScoreRange([0, 10]);
    setMinDuration(1);
    onResetFilters();
    setOpen(false);
  };

  if (inline) {
    return (
      <div className="space-y-8">
        {/* Modern Filter Interface */}
        <div className="bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm rounded-2xl border border-border/50 shadow-2xl shadow-black/10 overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-photon-500/10 via-photon-400/5 to-transparent p-6 border-b border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-photon-500/20 rounded-lg">
                  <Filter className="h-5 w-5 text-photon-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Advanced Filters</h3>
                  <p className="text-sm text-muted-foreground">Refine your ad discovery with precision controls</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs font-mono">
                {Object.keys(filters).filter(k => !['page','page_size','sort_by','sort_order'].includes(k)).length} active
              </Badge>
            </div>
          </div>

          {/* Filter Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              
              {/* Competitor Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-photon-400" />
                  <label className="text-sm font-medium text-foreground">Competitor</label>
                </div>
                <Select 
                  value={filters.competitor_id ? String(filters.competitor_id) : 'all'} 
                  onValueChange={(v) => {
                    const newFilters = { ...filters, competitor_id: v === 'all' ? undefined : Number(v) };
                    setFilters(newFilters);
                    onApplyFilters(newFilters);
                  }}
                  disabled={loadingCompetitors}
                >
                  <SelectTrigger className="bg-background/50 border-border/50 hover:border-photon-400/50 transition-colors">
                    <SelectValue placeholder={loadingCompetitors ? "Loading..." : "All Competitors"} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover/95 backdrop-blur-sm border-border/50">
                    <SelectItem value="all">All Competitors</SelectItem>
                    {competitors.length > 0 ? competitors.map(c => (
                      <SelectItem key={c.id} value={String(c.id)} title={c.name}>
                        <span className="truncate max-w-[200px] block">{c.name}</span>
                      </SelectItem>
                    )) : (
                      <SelectItem value="no-data" disabled>
                        {loadingCompetitors ? 'Loading...' : 'No competitors found'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-photon-400" />
                  <label className="text-sm font-medium text-foreground">Category</label>
                </div>
                <CategorySelect
                  value={filters.category_id}
                  onChange={(v) => {
                    // Clear competitor selection when category changes
                    const newFilters = { 
                      ...filters, 
                      category_id: v === null ? undefined : v,
                      competitor_id: undefined 
                    };
                    setFilters(newFilters);
                    onApplyFilters(newFilters);
                  }}
                  placeholder="All Categories"
                  allowUncategorized={false}
                  className="bg-background/50 border-border/50 hover:border-photon-400/50 transition-colors"
                />
              </div>

              {/* Media Type */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4 text-photon-400" />
                  <label className="text-sm font-medium text-foreground">Media Type</label>
                </div>
                <Select 
                  value={filters.media_type || 'all'} 
                  onValueChange={(v) => {
                    const newFilters = { ...filters, media_type: v === 'all' ? undefined : v };
                    setFilters(newFilters);
                    onApplyFilters(newFilters);
                  }}
                >
                  <SelectTrigger className="bg-background/50 border-border/50 hover:border-photon-400/50 transition-colors">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover/95 backdrop-blur-sm border-border/50">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="image">
                      <div className="flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Image
                      </div>
                    </SelectItem>
                    <SelectItem value="video">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Video
                      </div>
                    </SelectItem>
                    <SelectItem value="carousel">
                      <div className="flex items-center gap-2">
                        <Grid3X3 className="h-4 w-4" />
                        Carousel
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-photon-400" />
                  <label className="text-sm font-medium text-foreground">Status</label>
                </div>
                <Select 
                  value={filters.is_active !== undefined ? String(filters.is_active) : 'all'} 
                  onValueChange={(v) => {
                    const newFilters = { ...filters, is_active: v === 'all' ? undefined : v === 'true' };
                    setFilters(newFilters);
                    onApplyFilters(newFilters);
                  }}
                >
                  <SelectTrigger className="bg-background/50 border-border/50 hover:border-photon-400/50 transition-colors">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover/95 backdrop-blur-sm border-border/50">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="true">
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-green-400" />
                        Active
                      </div>
                    </SelectItem>
                    <SelectItem value="false">
                      <div className="flex items-center gap-2">
                        <Pause className="h-4 w-4 text-red-400" />
                        Ended
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Favorites */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-photon-400" />
                  <label className="text-sm font-medium text-foreground">Favorites</label>
                </div>
                <Select 
                  value={filters.is_favorite !== undefined ? String(filters.is_favorite) : 'all'} 
                  onValueChange={(v) => {
                    const newFilters = { ...filters, is_favorite: v === 'all' ? undefined : v === 'true' };
                    setFilters(newFilters);
                    onApplyFilters(newFilters);
                  }}
                >
                  <SelectTrigger className="bg-background/50 border-border/50 hover:border-photon-400/50 transition-colors">
                    <SelectValue placeholder="All Ads" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover/95 backdrop-blur-sm border-border/50">
                    <SelectItem value="all">All Ads</SelectItem>
                    <SelectItem value="true">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-400 fill-current" />
                        Favorites Only
                      </div>
                    </SelectItem>
                    <SelectItem value="false">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-muted-foreground" />
                        Not Favorites
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sorting Section */}
            <div className="mt-8 pt-6 border-t border-border/30">
              <div className="flex items-center gap-2 mb-4">
                <ArrowUpDown className="h-4 w-4 text-photon-400" />
                <h4 className="text-sm font-medium text-foreground">Sort & Order</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">Sort By</label>
                  <Select 
                    value={filters.sort_by || 'created_at'} 
                    onValueChange={(value) => {
                      const newFilters = { ...filters, sort_by: value };
                      setFilters(newFilters);
                      onApplyFilters(newFilters);
                    }}
                  >
                    <SelectTrigger className="bg-background/50 border-border/50 hover:border-photon-400/50 transition-colors">
                      <SelectValue placeholder="Created At" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover/95 backdrop-blur-sm border-border/50">
                      <SelectItem value="created_at">
                        <div className="flex items-center gap-2">
                          <CalendarRange className="h-4 w-4" />
                          Created At
                        </div>
                      </SelectItem>
                      <SelectItem value="date_found">
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4" />
                          Date Found
                        </div>
                      </SelectItem>
                      <SelectItem value="updated_at">
                        <div className="flex items-center gap-2">
                          <RotateCcw className="h-4 w-4" />
                          Updated At
                        </div>
                      </SelectItem>
                      <SelectItem value="duration_days">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Duration
                        </div>
                      </SelectItem>
                      <SelectItem value="variant_count">
                        <div className="flex items-center gap-2">
                          <Grid3X3 className="h-4 w-4" />
                          Variant Count
                        </div>
                      </SelectItem>
                      <SelectItem value="overall_score">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4" />
                          Overall Score
                        </div>
                      </SelectItem>
                      <SelectItem value="hook_score">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Hook Score
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">Order</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={filters.sort_order === 'desc' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const newFilters = { ...filters, sort_order: 'desc' as const };
                        setFilters(newFilters);
                        onApplyFilters(newFilters);
                      }}
                      className="justify-start bg-background/50 hover:bg-photon-500/10 border-border/50"
                    >
                      <SortDesc className="h-4 w-4 mr-2" />
                      {(() => {
                        const sortBy = filters.sort_by || 'created_at';
                        if (sortBy.includes('score')) return 'High to Low';
                        if (sortBy === 'variant_count') return 'Most First';
                        if (sortBy === 'duration_days') return 'Longest';
                        return 'Newest';
                      })()}
                    </Button>
                    <Button
                      variant={filters.sort_order === 'asc' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const newFilters = { ...filters, sort_order: 'asc' as const };
                        setFilters(newFilters);
                        onApplyFilters(newFilters);
                      }}
                      className="justify-start bg-background/50 hover:bg-photon-500/10 border-border/50"
                    >
                      <SortAsc className="h-4 w-4 mr-2" />
                      {(() => {
                        const sortBy = filters.sort_by || 'created_at';
                        if (sortBy.includes('score')) return 'Low to High';
                        if (sortBy === 'variant_count') return 'Least First';
                        if (sortBy === 'duration_days') return 'Shortest';
                        return 'Oldest';
                      })()}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Ranges Section */}
            <div className="mt-8 pt-6 border-t border-border/30">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="h-4 w-4 text-photon-400" />
                <h4 className="text-sm font-medium text-foreground">Performance Filters</h4>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Overall Score */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-400" />
                      <label className="text-sm font-medium text-foreground">Overall Score</label>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono bg-background/50">
                      {overallScoreRange[0]} - {overallScoreRange[1]}
                    </Badge>
                  </div>
                  <div className="p-4 bg-background/30 rounded-lg border border-border/30">
                    <Slider 
                      value={overallScoreRange} 
                      min={0} 
                      max={10} 
                      step={0.5}
                      onValueChange={setOverallScoreRange}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-3">
                      <span>0</span>
                      <span>5</span>
                      <span>10</span>
                    </div>
                  </div>
                </div>

                {/* Hook Score */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-400" />
                      <label className="text-sm font-medium text-foreground">Hook Score</label>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono bg-background/50">
                      {hookScoreRange[0]} - {hookScoreRange[1]}
                    </Badge>
                  </div>
                  <div className="p-4 bg-background/30 rounded-lg border border-border/30">
                    <Slider 
                      value={hookScoreRange} 
                      min={0} 
                      max={10} 
                      step={0.5}
                      onValueChange={setHookScoreRange}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-3">
                      <span>0</span>
                      <span>5</span>
                      <span>10</span>
                    </div>
                  </div>
                </div>

                {/* Minimum Duration */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-green-400" />
                      <label className="text-sm font-medium text-foreground">Min Duration</label>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono bg-background/50">
                      {minDuration}+ days
                    </Badge>
                  </div>
                  <div className="p-4 bg-background/30 rounded-lg border border-border/30">
                    <Slider 
                      value={[minDuration]} 
                      min={1} 
                      max={365} 
                      step={1}
                      onValueChange={(value) => {
                        const newMinDuration = value[0];
                        setMinDuration(newMinDuration);
                        const newFilters = { ...filters, min_duration_days: newMinDuration !== 1 ? newMinDuration : undefined };
                        setFilters(newFilters);
                        onApplyFilters(newFilters);
                      }}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-3">
                      <span>1d</span>
                      <span>6m</span>
                      <span>1y</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Filters Toggle */}
            {showAdvanced && (
              <div className="mt-8 pt-6 border-t border-border/30 space-y-6">
                {/* Search Filter */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Search className="h-4 w-4 text-photon-400" />
                    <h4 className="text-sm font-medium text-foreground">Text Search</h4>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-muted-foreground">Search in ad content</label>
                    <Input
                      type="text"
                      value={filters.search || ''}
                      onChange={(e) => {
                        const newFilters = { ...filters, search: e.target.value || undefined };
                        setFilters(newFilters);
                        // Apply search with debounce
                        setTimeout(() => onApplyFilters(newFilters), 500);
                      }}
                      placeholder="Search ads by title, description, or content..."
                      className="w-full bg-background/50 border-border/50 hover:border-photon-400/50 focus:border-photon-400 transition-colors"
                    />
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <CalendarRange className="h-4 w-4 text-photon-400" />
                    <h4 className="text-sm font-medium text-foreground">Date Range</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-muted-foreground">From Date</label>
                      <DatePicker
                        value={filters.date_from || ''}
                        onChange={(e) => setFilters(p => ({ ...p, date_from: e.target.value }))}
                        className="w-full bg-background/50 border-border/50 hover:border-photon-400/50 transition-colors"
                        placeholder="Select start date"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-muted-foreground">To Date</label>
                      <DatePicker
                        value={filters.date_to || ''}
                        onChange={(e) => setFilters(p => ({ ...p, date_to: e.target.value }))}
                        className="w-full bg-background/50 border-border/50 hover:border-photon-400/50 transition-colors"
                        placeholder="Select end date"
                      />
                    </div>
                  </div>
                </div>

                {/* Duration Range */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-photon-400" />
                    <h4 className="text-sm font-medium text-foreground">Duration Range</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-muted-foreground">Max Duration (Days)</label>
                        <Badge variant="outline" className="text-xs font-mono bg-background/50">
                          {filters.max_duration_days || 'No limit'}
                        </Badge>
                      </div>
                      <div className="p-4 bg-background/30 rounded-lg border border-border/30">
                        <Slider 
                          value={[filters.max_duration_days || 365]} 
                          min={1} 
                          max={365} 
                          step={1}
                          onValueChange={(value) => {
                            const maxDuration = value[0] === 365 ? undefined : value[0];
                            const newFilters = { ...filters, max_duration_days: maxDuration };
                            setFilters(newFilters);
                            onApplyFilters(newFilters);
                          }}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-3">
                          <span>1d</span>
                          <span>6m</span>
                          <span>1y</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="bg-gradient-to-r from-background/50 to-background/30 backdrop-blur-sm p-6 border-t border-border/30">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAdvanced ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                {showAdvanced ? 'Hide' : 'Show'} Advanced Options
              </Button>
              
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleReset}
                  className="bg-background/50 border-border/50 hover:border-red-400/50 hover:text-red-400 transition-colors"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset All
                </Button>
                <Button 
                  onClick={handleApplyFilters}
                  size="sm"
                  className="bg-gradient-to-r from-photon-500 to-photon-600 hover:from-photon-600 hover:to-photon-700 text-white shadow-lg shadow-photon-500/25 transition-all duration-200"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Button 
        variant="outline" 
        disabled={disabled} 
        onClick={() => setOpen(!open)}
        className="bg-background/50 border-border/50 hover:bg-background/80 hover:border-photon-400/50 transition-all duration-200"
      >
        <Filter className="mr-2 h-4 w-4" />
        {open ? 'Hide Filters' : 'Show Filters'}
      </Button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-96 max-w-[90vw] bg-popover/95 backdrop-blur-sm rounded-xl border border-border/50 shadow-2xl shadow-black/20 z-50 max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-border/30 bg-gradient-to-r from-photon-500/10 via-photon-400/5 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <div className="p-1.5 bg-photon-500/20 rounded-lg">
                    <Filter className="h-4 w-4 text-photon-400" />
                  </div>
                  Ad Filters
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Filter ads based on performance and metadata
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Quick Filters */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-photon-400" />
                Quick Filters
              </h4>
              
              {/* Competitor */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Competitor
                </label>
                <Select
                  value={filters.competitor_id ? String(filters.competitor_id) : 'all'}
                  onValueChange={(value) => {
                    setFilters(prev => ({ ...prev, competitor_id: value === 'all' ? undefined : Number(value) }))
                  }}
                  disabled={loadingCompetitors}
                >
                  <SelectTrigger className="w-full bg-background/50 border-border/50 hover:border-photon-400/50 transition-colors">
                    <SelectValue placeholder={loadingCompetitors ? "Loading competitors..." : "All Competitors"} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover/95 backdrop-blur-sm border-border/50">
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

              {/* Media Type & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Media Type
                  </label>
                  <Select 
                    value={filters.media_type || 'all'} 
                    onValueChange={(value) => setFilters(prev => ({ 
                      ...prev, 
                      media_type: value === 'all' ? undefined : value 
                    }))}
                  >
                    <SelectTrigger className="w-full bg-background/50 border-border/50 hover:border-photon-400/50 transition-colors">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover/95 backdrop-blur-sm border-border/50">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="image">
                        <div className="flex items-center gap-2">
                          <Image className="h-4 w-4" />
                          Image
                        </div>
                      </SelectItem>
                      <SelectItem value="video">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          Video
                        </div>
                      </SelectItem>
                      <SelectItem value="carousel">
                        <div className="flex items-center gap-2">
                          <Grid3X3 className="h-4 w-4" />
                          Carousel
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Status
                  </label>
                  <Select 
                    value={filters.is_active !== undefined ? String(filters.is_active) : 'all'}
                    onValueChange={(value) => {
                      const isActive = value === 'all' ? undefined : value === 'true';
                      setFilters(prev => ({ ...prev, is_active: isActive }));
                    }}
                  >
                    <SelectTrigger className="w-full bg-background/50 border-border/50 hover:border-photon-400/50 transition-colors">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover/95 backdrop-blur-sm border-border/50">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="true">
                        <div className="flex items-center gap-2">
                          <Play className="h-4 w-4 text-green-400" />
                          Active
                        </div>
                      </SelectItem>
                      <SelectItem value="false">
                        <div className="flex items-center gap-2">
                          <Pause className="h-4 w-4 text-red-400" />
                          Ended
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Favorites */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  <Heart className="inline h-4 w-4 mr-1" />
                  Favorites
                </label>
                <Select 
                  value={filters.is_favorite !== undefined ? String(filters.is_favorite) : 'all'}
                  onValueChange={(value) => {
                    const isFavorite = value === 'all' ? undefined : value === 'true';
                    setFilters(prev => ({ ...prev, is_favorite: isFavorite }));
                  }}
                >
                  <SelectTrigger className="w-full bg-background/50 border-border/50 hover:border-photon-400/50 transition-colors">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover/95 backdrop-blur-sm border-border/50">
                    <SelectItem value="all">All Ads</SelectItem>
                    <SelectItem value="true">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-400 fill-current" />
                        Favorites Only
                      </div>
                    </SelectItem>
                    <SelectItem value="false">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-muted-foreground" />
                        Not Favorites
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sorting */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-photon-400" />
                Sorting
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Sort By
                    rt By
                  </label>
                  <Select 
                    value={filters.sort_by || 'created_at'} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, sort_by: value }))}
                  >
                    <SelectTrigger className="bg-background/50 border-border/50 hover:border-photon-400/50 transition-colors">
                      <SelectValue placeholder="Created At" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover/95 backdrop-blur-sm border-border/50">
                      <SelectItem value="created_at">
                        <div className="flex items-center gap-2">
                          <CalendarRange className="h-4 w-4" />
                          Created At
                        </div>
                      </SelectItem>
                      <SelectItem value="date_found">
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4" />
                          Date Found
                        </div>
                      </SelectItem>
                      <SelectItem value="updated_at">
                        <div className="flex items-center gap-2">
                          <RotateCcw className="h-4 w-4" />
                          Updated At
                        </div>
                      </SelectItem>
                      <SelectItem value="duration_days">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Duration
                        </div>
                      </SelectItem>
                      <SelectItem value="variant_count">
                        <div className="flex items-center gap-2">
                          <Grid3X3 className="h-4 w-4" />
                          Variants
                        </div>
                      </SelectItem>
                      <SelectItem value="overall_score">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4" />
                          Overall Score
                        </div>
                      </SelectItem>
                      <SelectItem value="hook_score">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Hook Score
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Order
                  </label>
                  <Select 
                    value={filters.sort_order || 'desc'} 
                    onValueChange={(value: 'asc' | 'desc') => setFilters(prev => ({ ...prev, sort_order: value }))}
                  >
                    <SelectTrigger className="bg-background/50 border-border/50 hover:border-photon-400/50 transition-colors">
                      <SelectValue placeholder="Descending" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover/95 backdrop-blur-sm border-border/50">
                      {(() => {
                        const sortBy = filters.sort_by || 'created_at';
                        if (sortBy.includes('score')) {
                          return (
                            <>
                              <SelectItem value="desc">High to Low</SelectItem>
                              <SelectItem value="asc">Low to High</SelectItem>
                            </>
                          );
                        } else if (sortBy === 'variant_count') {
                          return (
                            <>
                              <SelectItem value="desc">Most First</SelectItem>
                              <SelectItem value="asc">Least First</SelectItem>
                            </>
                          );
                        } else if (sortBy === 'duration_days') {
                          return (
                            <>
                              <SelectItem value="desc">Longest</SelectItem>
                              <SelectItem value="asc">Shortest</SelectItem>
                            </>
                          );
                        } else {
                          return (
                            <>
                              <SelectItem value="desc">Newest First</SelectItem>
                              <SelectItem value="asc">Oldest First</SelectItem>
                            </>
                          );
                        }
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Score Ranges */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-photon-400" />
                Score Ranges
              </h4>
              
              {/* Overall Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400" />
                    Overall Score
                  </label>
                  <Badge variant="outline" className="text-xs font-mono bg-background/50">
                    {overallScoreRange[0]} - {overallScoreRange[1]}
                  </Badge>
                </div>
                <div className="px-3 py-3 bg-background/30 rounded-lg border border-border/30">
                  <Slider 
                    value={overallScoreRange} 
                    min={0} 
                    max={10} 
                    step={0.5}
                    onValueChange={setOverallScoreRange}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Hook Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Target className="h-4 w-4 text-blue-400" />
                    Hook Score
                  </label>
                  <Badge variant="outline" className="text-xs font-mono bg-background/50">
                    {hookScoreRange[0]} - {hookScoreRange[1]}
                  </Badge>
                </div>
                <div className="px-3 py-3 bg-background/30 rounded-lg border border-border/30">
                  <Slider 
                    value={hookScoreRange} 
                    min={0} 
                    max={10} 
                    step={0.5}
                    onValueChange={setHookScoreRange}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Minimum Duration */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4 text-green-400" />
                    Min Duration (Days)
                  </label>
                  <Badge variant="outline" className="text-xs font-mono bg-background/50">
                    {minDuration}+ days
                  </Badge>
                </div>
                <div className="px-3 py-3 bg-background/30 rounded-lg border border-border/30">
                  <Slider 
                    value={[minDuration]} 
                    min={1} 
                    max={365} 
                    step={1}
                    onValueChange={(value) => setMinDuration(value[0])}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-photon-400" />
                Date Range
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    From
                  </label>
                  <DatePicker
                    value={filters.date_from || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
                    className="w-full bg-background/50 border-border/50 hover:border-photon-400/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    To
                  </label>
                  <DatePicker
                    value={filters.date_to || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
                    className="w-full bg-background/50 border-border/50 hover:border-photon-400/50 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border/30 bg-gradient-to-r from-background/50 to-background/30 backdrop-blur-sm rounded-b-xl">
            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={handleReset}
                className="flex-1 bg-background/50 border-border/50 hover:border-red-400/50 hover:text-red-400 transition-colors"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button 
                onClick={handleApplyFilters}
                className="flex-1 bg-gradient-to-r from-photon-500 to-photon-600 hover:from-photon-600 hover:to-photon-700 text-white shadow-lg shadow-photon-500/25 transition-all duration-200"
              >
                <Check className="mr-2 h-4 w-4" />
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdFilters;