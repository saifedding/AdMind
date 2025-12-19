'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

interface HistoryEntry {
  id: string;
  searchType: 'keyword' | 'page';
  query: string;
  countries: string[];
  activeStatus: string;
  mediaType: string;
  totalAds: number;
  timestamp: string;
  preview: Array<{
    ad_archive_id: string;
    advertiser: string;
    media_type: string;
  }>;
}

export function SearchHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadHistory();
    
    // Reload history every 5 seconds when component is mounted
    const interval = setInterval(loadHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  // Reload history when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    try {
      const { searchStorage } = await import('@/lib/search-storage');
      const stored = await searchStorage.getHistory();
      setHistory(stored.map(entry => ({
        ...entry,
        timestamp: new Date(entry.timestamp).toISOString(),
        preview: [] // Not needed for display
      })));
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  };

  const clearHistory = async () => {
    if (confirm('Clear all search history and cached results? This will also clear localStorage and sessionStorage.')) {
      try {
        const { searchStorage } = await import('@/lib/search-storage');
        await searchStorage.clearAllStorage();
        setHistory([]);
        
        // Show success message
        alert('All search history and cached data cleared successfully!');
      } catch (e) {
        console.error('Failed to clear history:', e);
        alert('Failed to clear history. Please try again.');
      }
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { searchStorage } = await import('@/lib/search-storage');
      await searchStorage.deleteHistoryEntry(id);
      setHistory(prev => prev.filter(entry => entry.id !== id));
    } catch (e) {
      console.error('Failed to delete entry:', e);
    }
  };

  const repeatSearch = async (entry: HistoryEntry) => {
    try {
      // Try to load the cached result first
      const { searchStorage } = await import('@/lib/search-storage');
      const cachedResult = await searchStorage.getSearchResult(entry.id);
      
      if (cachedResult) {
        // Store in sessionStorage for immediate display (without auto-search)
        sessionStorage.setItem('restoredSearch', JSON.stringify({
          searchType: entry.searchType,
          query: entry.query,
          countries: entry.countries,
          activeStatus: entry.activeStatus,
          mediaType: entry.mediaType,
          result: cachedResult.result
        }));
      }
    } catch (e) {
      console.warn('Failed to load cached result:', e);
    }
    
    // Navigate with parameters but WITHOUT auto=true (no automatic search)
    const params = new URLSearchParams({
      type: entry.searchType,
      q: entry.query,
    });
    
    // Add additional parameters
    if (entry.countries && entry.countries.length > 0) {
      params.set('countries', entry.countries.join(','));
    }
    if (entry.activeStatus) {
      params.set('status', entry.activeStatus);
    }
    if (entry.mediaType) {
      params.set('media', entry.mediaType);
    }
    
    router.push(`/search?${params.toString()}`);
    setIsOpen(false);
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Clock className="h-4 w-4" />
        History ({history.length})
      </Button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <Card className="absolute right-0 top-12 z-50 w-96 max-h-[600px] overflow-auto shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Search History
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="h-8 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="group relative border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => repeatSearch(entry)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Search className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {entry.query}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="bg-muted px-2 py-0.5 rounded">
                          {entry.searchType === 'page' ? 'Page' : 'Keyword'}
                        </span>
                        <span className="bg-muted px-2 py-0.5 rounded">
                          {entry.totalAds} ads
                        </span>
                        {entry.countries.length > 0 && (
                          <span className="bg-muted px-2 py-0.5 rounded">
                            {entry.countries.join(', ')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteEntry(entry.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
