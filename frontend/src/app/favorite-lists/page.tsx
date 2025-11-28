'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { AdCard } from '@/features/dashboard/components/AdCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adsApi, type ApiFavoriteList, type ApiFavoriteListWithItems } from '@/lib/api';
import { transformAdsWithAnalysis } from '@/lib/transformers';
import { FolderHeart, Plus, Trash2, X, ChevronDown, Search, Filter as FilterIcon } from 'lucide-react';
import type { AdWithAnalysis } from '@/types/ad';

const LAST_SELECTED_LIST_KEY = 'favorite-lists-last-selected';

export default function FavoriteListsPage() {
  const [lists, setLists] = useState<ApiFavoriteList[]>([]);
  const [selectedList, setSelectedList] = useState<ApiFavoriteListWithItems | null>(null);
  const [allAds, setAllAds] = useState<AdWithAnalysis[]>([]);
  const [filteredAds, setFilteredAds] = useState<AdWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAds, setLoadingAds] = useState(false);
  const [showNewListDialog, setShowNewListDialog] = useState(false);
  const [showListDropdown, setShowListDropdown] = useState(false);
  
  // Simple filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [mediaFilter, setMediaFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      setLoading(true);
      const response = await adsApi.getFavoriteLists();
      setLists(response.lists);
      
      if (response.lists.length > 0) {
        // Try to load the last selected list from localStorage
        const lastSelectedId = localStorage.getItem(LAST_SELECTED_LIST_KEY);
        let listToSelect: ApiFavoriteList | undefined;
        
        if (lastSelectedId) {
          listToSelect = response.lists.find(l => l.id === parseInt(lastSelectedId));
        }
        
        // Fallback to default list or first list
        if (!listToSelect) {
          const defaultList = response.lists.find(l => l.is_default);
          listToSelect = defaultList || response.lists[0];
        }
        
        await loadListAds(listToSelect.id);
      }
    } catch (error) {
      console.error('Error loading lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadListAds = async (listId: number) => {
    try {
      setLoadingAds(true);
      const listData = await adsApi.getFavoriteList(listId);
      setSelectedList(listData);
      
      const transformedAds = transformAdsWithAnalysis(
        listData.items.map(item => item.ad).filter(ad => ad != null) as any[]
      );
      setAllAds(transformedAds);
      setFilteredAds(transformedAds);
    } catch (error) {
      console.error('Error loading list ads:', error);
    } finally {
      setLoadingAds(false);
    }
  };

  const handleListSelect = async (listId: number) => {
    setShowListDropdown(false);
    // Save the selected list to localStorage
    localStorage.setItem(LAST_SELECTED_LIST_KEY, listId.toString());
    await loadListAds(listId);
  };

  const handleDeleteList = async (listId: number) => {
    if (!confirm('Are you sure you want to delete this list?')) return;

    try {
      await adsApi.deleteFavoriteList(listId);
      // Clear saved list if it was the deleted one
      const lastSelectedId = localStorage.getItem(LAST_SELECTED_LIST_KEY);
      if (lastSelectedId === listId.toString()) {
        localStorage.removeItem(LAST_SELECTED_LIST_KEY);
      }
      await loadLists();
    } catch (error) {
      console.error('Error deleting list:', error);
      alert('Failed to delete list');
    }
  };

  // Apply filters whenever filter states change
  useEffect(() => {
    applyFilters();
  }, [allAds, searchQuery, scoreFilter, mediaFilter, sortBy]);

  const applyFilters = () => {
    let filtered = [...allAds];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ad => 
        ad.main_title?.toLowerCase().includes(query) ||
        ad.main_body_text?.toLowerCase().includes(query) ||
        ad.main_caption?.toLowerCase().includes(query) ||
        ad.ad_copy?.toLowerCase().includes(query) ||
        ad.competitor?.name?.toLowerCase().includes(query)
      );
    }

    // Score filter
    if (scoreFilter !== 'all') {
      if (scoreFilter === 'high') {
        filtered = filtered.filter(ad => ad.analysis?.overall_score && ad.analysis.overall_score >= 8);
      } else if (scoreFilter === 'medium') {
        filtered = filtered.filter(ad => ad.analysis?.overall_score && ad.analysis.overall_score >= 5 && ad.analysis.overall_score < 8);
      } else if (scoreFilter === 'low') {
        filtered = filtered.filter(ad => ad.analysis?.overall_score && ad.analysis.overall_score < 5);
      } else if (scoreFilter === 'no_score') {
        filtered = filtered.filter(ad => !ad.analysis?.overall_score);
      }
    }

    // Media type filter
    if (mediaFilter !== 'all') {
      if (mediaFilter === 'video') {
        filtered = filtered.filter(ad => 
          ad.main_video_urls?.length || ad.media_type === 'video'
        );
      } else if (mediaFilter === 'image') {
        filtered = filtered.filter(ad => 
          (ad.main_image_urls?.length || ad.media_type === 'image') && 
          !ad.main_video_urls?.length
        );
      }
    }

    // Sort
    if (sortBy === 'score_high') {
      filtered.sort((a, b) => (b.analysis?.overall_score || 0) - (a.analysis?.overall_score || 0));
    } else if (sortBy === 'score_low') {
      filtered.sort((a, b) => (a.analysis?.overall_score || 0) - (b.analysis?.overall_score || 0));
    } else if (sortBy === 'date_desc') {
      filtered.sort((a, b) => new Date(b.date_found || 0).getTime() - new Date(a.date_found || 0).getTime());
    } else if (sortBy === 'date_asc') {
      filtered.sort((a, b) => new Date(a.date_found || 0).getTime() - new Date(b.date_found || 0).getTime());
    }

    setFilteredAds(filtered);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <FolderHeart className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Favorite Lists</h1>
              <p className="text-muted-foreground">
                {selectedList ? `${filteredAds.length} of ${allAds.length} ads in ${selectedList.name}` : 'Select a list'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowNewListDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New List
          </Button>
        </div>

        {!loading && lists.length > 0 && (
          <div className="flex flex-col gap-4">
            {/* List Selector */}
            <div className="relative">
            <button
              onClick={() => setShowListDropdown(!showListDropdown)}
              className="w-full sm:w-auto min-w-[300px] flex items-center justify-between gap-3 px-4 py-3 bg-card border border-border rounded-lg hover:bg-accent transition-colors"
            >
              {selectedList ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full bg-${selectedList.color || 'blue'}-500`} />
                    <div className="text-left">
                      <div className="font-medium">{selectedList.name}</div>
                      {selectedList.description && (
                        <div className="text-xs text-muted-foreground">{selectedList.description}</div>
                      )}
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </>
              ) : (
                <>
                  <span className="text-muted-foreground">Select a list</span>
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>

            {showListDropdown && (
              <div className="absolute top-full left-0 right-0 sm:right-auto sm:min-w-[300px] mt-2 bg-card border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                {lists.map((list) => (
                  <div
                    key={list.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleListSelect(list.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleListSelect(list.id);
                      }
                    }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-3 h-3 rounded-full bg-${list.color || 'blue'}-500 flex-shrink-0`} />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{list.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {list.item_count} {list.item_count === 1 ? 'ad' : 'ads'}
                        </div>
                      </div>
                    </div>
                    {selectedList?.id === list.id && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                    {!list.is_default && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteList(list.id);
                        }}
                        className="text-destructive hover:text-destructive/80 p-1 flex-shrink-0"
                        title="Delete list"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            </div>

            {/* Filters Section */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Search */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Search
                    </label>
                    <Input
                      placeholder="Search ads..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {/* Score Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <FilterIcon className="h-4 w-4" />
                      Score
                    </label>
                    <Select value={scoreFilter} onValueChange={setScoreFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Scores</SelectItem>
                        <SelectItem value="high">High (8+)</SelectItem>
                        <SelectItem value="medium">Medium (5-7.9)</SelectItem>
                        <SelectItem value="low">Low (&lt;5)</SelectItem>
                        <SelectItem value="no_score">No Score</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Media Type Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Media Type</label>
                    <Select value={mediaFilter} onValueChange={setMediaFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort By */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sort By</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date_desc">Newest First</SelectItem>
                        <SelectItem value="date_asc">Oldest First</SelectItem>
                        <SelectItem value="score_high">Highest Score</SelectItem>
                        <SelectItem value="score_low">Lowest Score</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Active Filters Indicator */}
                {(searchQuery || scoreFilter !== 'all' || mediaFilter !== 'all' || sortBy !== 'date_desc') && (
                  <div className="mt-4 flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Filters active: {filteredAds.length} of {allAds.length} ads shown
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setScoreFilter('all');
                        setMediaFilter('all');
                        setSortBy('date_desc');
                      }}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Clear Filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-[600px] bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : lists.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <FolderHeart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Lists Yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first list to start organizing your favorite ads
              </p>
              <Button onClick={() => setShowNewListDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First List
              </Button>
            </CardContent>
          </Card>
        ) : loadingAds ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-[600px] bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredAds.length === 0 && allAds.length > 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Filter className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Ads Match Filters</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your filters to see more results
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setScoreFilter('all');
                  setMediaFilter('all');
                  setSortBy('date_desc');
                }}
              >
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
        ) : allAds.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <FolderHeart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Ads in This List</h3>
              <p className="text-muted-foreground mb-6">
                Add ads to this list by clicking the yellow folder button on any ad card
              </p>
              <Button onClick={() => window.location.href = '/ads'}>
                Browse Ads
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAds.map((ad) => (
              <div key={`list-ad-${ad.id ?? 'unknown'}`} className="relative">
                <AdCard 
                  ad={ad} 
                  onFavoriteToggle={() => {
                    if (selectedList) {
                      loadListAds(selectedList.id);
                    }
                  }} 
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewListDialog && (
        <NewListDialog
          onClose={() => setShowNewListDialog(false)}
          onSuccess={() => {
            loadLists();
            setShowNewListDialog(false);
          }}
        />
      )}
    </DashboardLayout>
  );
}

function NewListDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('blue');
  const [submitting, setSubmitting] = useState(false);

  const colors = [
    { name: 'Blue', value: 'blue', class: 'bg-blue-500' },
    { name: 'Green', value: 'green', class: 'bg-green-500' },
    { name: 'Yellow', value: 'yellow', class: 'bg-yellow-500' },
    { name: 'Red', value: 'red', class: 'bg-red-500' },
    { name: 'Purple', value: 'purple', class: 'bg-purple-500' },
    { name: 'Pink', value: 'pink', class: 'bg-pink-500' },
  ];

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('Please enter a list name');
      return;
    }

    try {
      setSubmitting(true);
      await adsApi.createFavoriteList({
        name,
        description: description || undefined,
        color,
        icon: 'star',
        is_default: false,
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating list:', error);
      alert('Failed to create list');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-foreground">Create New List</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">List Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., High Performers"
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Color</label>
            <div className="flex gap-2">
              {colors.map(c => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`w-10 h-10 rounded-full ${c.class} ${
                    color === c.value ? 'ring-2 ring-offset-2 ring-primary' : ''
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-input rounded-md hover:bg-accent text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create List'}
          </button>
        </div>
      </div>
    </div>
  );
}
