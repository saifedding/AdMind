'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, X } from 'lucide-react';

interface CountrySelectorProps {
  selectedCountries: string[];
  onCountryToggle: (countryCode: string) => void;
  countriesData: Record<string, string>;
  popularCountries: string[];
}

export function CountrySelector({
  selectedCountries,
  onCountryToggle,
  countriesData,
  popularCountries
}: CountrySelectorProps) {
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
        setCountrySearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter countries based on search query
  const filteredCountries = Object.entries(countriesData).filter(([code, name]) => {
    if (!countrySearchQuery) return true;
    const query = countrySearchQuery.toLowerCase();
    return code.toLowerCase().includes(query) || name.toLowerCase().includes(query);
  });

  // Get countries to display (popular first, then filtered)
  const getDisplayCountries = () => {
    if (countrySearchQuery) {
      return filteredCountries; // Show all search results
    }
    // Show popular countries first, then all others
    const popular = popularCountries.map(code => [code, countriesData[code]]);
    const others = Object.entries(countriesData)
      .filter(([code]) => !popularCountries.includes(code));
    return [...popular, ...others];
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center flex-wrap">
      <span className="text-sm text-iridium-300 whitespace-nowrap">Countries:</span>
    
      {/* Selected Countries */}
      {selectedCountries.length === 0 ? (
        <div className="flex h-9 items-center gap-x-2 rounded-md bg-green-500/20 border border-green-500/40 pl-3 pr-3 text-green-400">
          <span className="text-xs font-bold uppercase tracking-wider">ALL COUNTRIES</span>
        </div>
      ) : (
        selectedCountries.map((countryCode) => (
          <button
            key={countryCode}
            onClick={() => onCountryToggle(countryCode)}
            className="flex h-9 items-center gap-x-2 rounded-md bg-primary/20 border border-primary/40 pl-3 pr-2 text-primary hover:bg-primary/30 transition-colors"
          >
            <span className="text-xs font-bold uppercase tracking-wider">{countryCode}</span>
            <X className="h-3 w-3" />
          </button>
        ))
      )}

      {/* Add Country Dropdown */}
      <div className="relative" ref={countryDropdownRef}>
        <button
          onClick={() => setShowCountryDropdown(!showCountryDropdown)}
          className="flex h-9 items-center gap-x-2 rounded-md bg-iridium-900 border border-border hover:border-primary/50 transition-colors pl-3 pr-2 text-foreground"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm">Add Country</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
        </button>

        {/* Country Dropdown */}
        {showCountryDropdown && (
          <div className="absolute top-full left-0 mt-2 w-80 sm:w-96 bg-iridium-900 border border-border rounded-lg shadow-xl z-50 max-h-[500px] overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-border">
              <input
                type="text"
                placeholder="Search countries..."
                value={countrySearchQuery}
                onChange={(e) => setCountrySearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-iridium-800 border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            
            {/* Countries List */}
            <div className="max-h-[420px] overflow-y-auto">
              {!countrySearchQuery && (
                <div className="p-2">
                  {/* All Countries Option */}
                  <button
                    onClick={() => {
                      onCountryToggle('all');
                      setShowCountryDropdown(false);
                      setCountrySearchQuery('');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-iridium-800 transition-colors text-sm cursor-pointer mb-2 bg-primary/10 border border-primary/20 rounded-md"
                  >
                    <span className="font-medium text-primary">ALL</span>
                    <span className="text-primary">Select All Countries</span>
                  </button>
                  
                  <div className="text-xs font-medium text-iridium-400 px-3 py-2 uppercase tracking-wider">Popular Countries</div>
                  {popularCountries.map((countryCode) => (
                    <button
                      key={countryCode}
                      onClick={() => {
                        onCountryToggle(countryCode);
                        setShowCountryDropdown(false);
                        setCountrySearchQuery('');
                      }}
                      disabled={selectedCountries.includes(countryCode)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-iridium-800 transition-colors text-sm ${
                        selectedCountries.includes(countryCode) 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'cursor-pointer'
                      }`}
                    >
                      <span className="font-medium text-foreground">{countryCode}</span>
                      <span className="text-iridium-300">{countriesData[countryCode]}</span>
                    </button>
                  ))}
                  <div className="border-t border-border mt-2 pt-2">
                    <div className="text-xs font-medium text-iridium-400 px-3 py-2 uppercase tracking-wider">All Countries</div>
                  </div>
                </div>
              )}
              
              {getDisplayCountries().map(([countryCode, countryName]) => {
                if (!countrySearchQuery && popularCountries.includes(countryCode)) return null;
                return (
                  <button
                    key={countryCode}
                    onClick={() => {
                      onCountryToggle(countryCode);
                      setShowCountryDropdown(false);
                      setCountrySearchQuery('');
                    }}
                    disabled={selectedCountries.includes(countryCode)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-iridium-800 transition-colors text-sm ${
                      selectedCountries.includes(countryCode) 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'cursor-pointer'
                    }`}
                  >
                    <span className="font-medium text-foreground">{countryCode}</span>
                    <span className="text-iridium-300">{countryName}</span>
                  </button>
                );
              })}
              
              {filteredCountries.length === 0 && countrySearchQuery && (
                <div className="px-3 py-4 text-center text-iridium-400 text-sm">
                  No countries found matching "{countrySearchQuery}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}