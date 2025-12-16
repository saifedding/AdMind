'use client';

import { useState } from 'react';
import { Search, Loader2, Lightbulb } from 'lucide-react';

interface SearchFormProps {
  searchType: 'keyword' | 'page';
  keywordQuery: string;
  pageId: string;
  isSearching: boolean;
  onSearchTypeChange: (type: 'keyword' | 'page') => void;
  onKeywordQueryChange: (query: string) => void;
  onPageIdChange: (pageId: string) => void;
  onSearch: () => void;
}

export function SearchForm({
  searchType,
  keywordQuery,
  pageId,
  isSearching,
  onSearchTypeChange,
  onKeywordQueryChange,
  onPageIdChange,
  onSearch
}: SearchFormProps) {
  return (
    <section className="@container w-full flex flex-col gap-6">
      <div className="flex items-center gap-2 text-xs text-iridium-300 bg-iridium-900 px-4 py-2 rounded-full border border-border">
        <Lightbulb className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="hidden sm:inline">Tip: Use comma-separated values for multiple Page IDs.</span>
        <span className="sm:hidden">Tip: Separate multiple IDs with commas</span>
      </div>

      {/* Search Input */}
      <div className="w-full bg-iridium-900 p-1 rounded-lg border border-border shadow-lg">
        {/* Mobile Layout */}
        <div className="flex flex-col gap-3 p-3 sm:hidden">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-iridium-300">
              <Search className="h-5 w-5" />
            </div>
            <input 
              className="w-full h-12 pl-10 pr-4 rounded-lg bg-iridium-800 border border-border text-foreground placeholder:text-iridium-400 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder={searchType === 'keyword' ? "Enter keywords..." : "Enter Facebook Page ID..."}
              value={searchType === 'keyword' ? keywordQuery : pageId}
              onChange={(e) => searchType === 'keyword' ? onKeywordQueryChange(e.target.value) : onPageIdChange(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={searchType}
              onChange={(e) => onSearchTypeChange(e.target.value as 'keyword' | 'page')}
              className="flex-1 h-10 px-3 rounded-md bg-iridium-800 border border-border text-foreground text-sm"
            >
              <option value="keyword">Keywords</option>
              <option value="page">Page ID</option>
            </select>
            <button 
              onClick={onSearch}
              disabled={isSearching}
              className="flex-1 h-10 flex items-center justify-center rounded-md bg-primary hover:bg-photon-400 transition-colors text-iridium-950 text-sm font-bold"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </button>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex w-full items-stretch rounded-lg h-16 bg-iridium-900">
          <div className="flex items-center pl-4 text-iridium-300">
            <Search className="h-5 w-5" />
          </div>
          <input 
            className="flex w-full min-w-0 flex-1 bg-transparent text-foreground focus:outline-none border-none h-full placeholder:text-iridium-400 px-4 text-base"
            placeholder={searchType === 'keyword' ? "Enter keywords (e.g., 'SaaS', 'Fitness')..." : "Enter Facebook Page ID..."}
            value={searchType === 'keyword' ? keywordQuery : pageId}
            onChange={(e) => searchType === 'keyword' ? onKeywordQueryChange(e.target.value) : onPageIdChange(e.target.value)}
          />
          <div className="flex items-center p-2 gap-2">
            <select 
              value={searchType}
              onChange={(e) => onSearchTypeChange(e.target.value as 'keyword' | 'page')}
              className="h-12 px-3 rounded-md bg-iridium-800 border border-border text-foreground text-sm"
            >
              <option value="keyword">Keywords</option>
              <option value="page">Page ID</option>
            </select>
            <button 
              onClick={onSearch}
              disabled={isSearching}
              className="flex min-w-[120px] items-center justify-center rounded-md h-12 px-6 bg-primary hover:bg-photon-400 transition-colors text-iridium-950 text-base font-bold tracking-[0.015em] shadow-[0_0_15px_rgba(0,188,212,0.3)]"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}