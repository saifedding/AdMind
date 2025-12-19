'use client';

import { Trash2 } from 'lucide-react';
import { CountrySelector } from './CountrySelector';

interface SearchFiltersProps {
  selectedCountries: string[];
  activeStatus: string;
  mediaType: string;
  maxPages: number;
  minDurationDays: number | undefined;
  onCountryToggle: (countryCode: string) => void;
  onActiveStatusChange: (status: string) => void;
  onMediaTypeChange: (type: string) => void;
  onMaxPagesChange: (pages: number) => void;
  onMinDurationDaysChange: (days: number | undefined) => void;
  onClearFilters: () => void;
  countriesData: Record<string, string>;
  popularCountries: string[];
}

const MEDIA_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'video', label: 'Video' },
  { value: 'image', label: 'Image' },
  { value: 'carousel', label: 'Carousel' },
];

const AD_STATUS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export function SearchFilters({
  selectedCountries,
  activeStatus,
  mediaType,
  maxPages,
  minDurationDays,
  onCountryToggle,
  onActiveStatusChange,
  onMediaTypeChange,
  onMaxPagesChange,
  onMinDurationDaysChange,
  onClearFilters,
  countriesData,
  popularCountries
}: SearchFiltersProps) {
  const handleCountryToggle = (countryCode: string) => {
    if (countryCode === 'all') {
      // Clear all selected countries to select all
      selectedCountries.forEach(code => onCountryToggle(code));
    } else {
      onCountryToggle(countryCode);
    }
  };

  // Count active filters
  const activeFiltersCount = [
    selectedCountries.length > 0 ? 1 : 0,
    activeStatus !== 'all' ? 1 : 0,
    mediaType !== 'all' ? 1 : 0,
    maxPages !== 3 ? 1 : 0,
    minDurationDays ? 1 : 0,
  ].reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-4 lg:space-y-0">
      {/* Filter Status Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Search Filters</h3>
          {activeFiltersCount > 0 && (
            <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full font-medium">
              {activeFiltersCount} active
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {selectedCountries.length === 0 ? 'All countries' : `${selectedCountries.length} countries`} • 
          {activeStatus === 'all' ? ' All statuses' : ` ${activeStatus} ads`} • 
          {mediaType === 'all' ? ' All media' : ` ${mediaType} only`} • 
          {maxPages} pages • 
          {minDurationDays ? `Running ${minDurationDays}+ days` : 'Any duration'}
        </div>
      </div>

      {/* Mobile: Stack filters vertically, Desktop: Horizontal layout */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-3 lg:flex-wrap lg:items-center">
        {/* Country Filter */}
        <CountrySelector
          selectedCountries={selectedCountries}
          onCountryToggle={handleCountryToggle}
          countriesData={countriesData}
          popularCountries={popularCountries}
        />
        
        {/* Separator - Hidden on mobile */}
        <div className="hidden lg:block w-px h-9 bg-border"></div>
        
        {/* Media Type Filter */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center flex-wrap">
          <span className="text-sm text-iridium-300 whitespace-nowrap">Media:</span>
          <div className="flex gap-2 flex-wrap">
            {MEDIA_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => onMediaTypeChange(type.value)}
                className={`flex h-9 items-center px-3 rounded-md border text-sm font-medium transition-colors ${
                  mediaType === type.value
                    ? 'bg-primary/20 border-primary/40 text-primary'
                    : 'bg-iridium-900 border-border text-foreground hover:border-primary/50'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Separator - Hidden on mobile */}
        <div className="hidden lg:block w-px h-9 bg-border"></div>

        {/* Status Filter */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center flex-wrap">
          <span className="text-sm text-iridium-300 whitespace-nowrap">Status:</span>
          <div className="flex gap-2 flex-wrap">
            {AD_STATUS.map((status) => (
              <button
                key={status.value}
                onClick={() => onActiveStatusChange(status.value)}
                className={`flex h-9 items-center px-3 rounded-md border text-sm font-medium transition-colors ${
                  activeStatus === status.value
                    ? 'bg-primary/20 border-primary/40 text-primary'
                    : 'bg-iridium-900 border-border text-foreground hover:border-primary/50'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {/* Separator - Hidden on mobile */}
        <div className="hidden lg:block w-px h-9 bg-border"></div>

        {/* Advanced Controls */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center flex-wrap">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-iridium-300 whitespace-nowrap">Pages:</span>
            <input
              type="number"
              value={maxPages}
              onChange={(e) => onMaxPagesChange(Number(e.target.value) || 1)}
              min="1"
              max="50"
              placeholder="3"
              className="h-9 w-20 px-3 rounded-md bg-iridium-900 border border-border text-foreground text-sm"
            />
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-sm text-iridium-300 whitespace-nowrap" title="Minimum number of days the ad has been running">
              Min Running Days:
            </span>
            <input
              type="number"
              value={minDurationDays || ''}
              onChange={(e) => onMinDurationDaysChange(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Any"
              min="0"
              title="Filter ads by how many days they've been running (leave empty for all ads)"
              className="h-9 w-20 px-3 rounded-md bg-iridium-900 border border-border text-foreground text-sm"
            />
          </div>
          
          <div className="flex gap-2 items-center">
            <span className="text-sm text-iridium-300 whitespace-nowrap" title="Filter ads by when they started">
              Started Before:
            </span>
            <input
              type="date"
              placeholder="Any"
              title="Show only ads that started before this date (leave empty for all ads)"
              className="h-9 px-3 rounded-md bg-iridium-900 border border-border text-foreground text-sm"
            />
          </div>
        </div>

        {/* Clear All Button */}
        <div className="flex justify-start lg:justify-end lg:ml-auto">
          <button 
            onClick={onClearFilters}
            className="flex h-9 items-center gap-x-2 rounded-md text-iridium-300 hover:text-foreground transition-colors text-sm font-medium"
          >
            <Trash2 className="h-4 w-4" />
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}