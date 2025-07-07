'use client';

import React, { useState, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdSearchProps {
  onSearch: (query: string) => void;
  disabled?: boolean;
}

export function AdSearch({ onSearch, disabled = false }: AdSearchProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleExpand = () => {
    setExpanded(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };
  
  const handleCollapse = () => {
    setExpanded(false);
    setQuery('');
  };
  
  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      handleCollapse();
    }
  };

  return (
    <div className="relative flex items-center">
      {expanded ? (
        <div className={cn(
          "flex items-center gap-1 bg-background border border-border rounded-md overflow-hidden transition-all duration-200",
          expanded ? "w-72 opacity-100" : "w-0 opacity-0"
        )}>
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search by title, text, or competitor..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 focus-visible:ring-0 bg-transparent"
            disabled={disabled}
          />
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 p-0 hover:bg-transparent" 
            onClick={handleCollapse}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 p-0 mr-1 text-photon-400 hover:text-photon-300" 
            onClick={handleSearch}
            disabled={disabled}
          >
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={handleExpand} disabled={disabled}>
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
      )}
    </div>
  );
}

export default AdSearch; 