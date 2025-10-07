'use client';

import { useState, useEffect } from 'react';
import { adsApi, ApiFavoriteList } from '@/lib/api';
import { Star, Plus, Check, X, Loader2 } from 'lucide-react';

interface AddToFavoriteDialogProps {
  adId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddToFavoriteDialog({ adId, onClose, onSuccess }: AddToFavoriteDialogProps) {
  const [lists, setLists] = useState<ApiFavoriteList[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newListColor, setNewListColor] = useState('blue');

  const colors = [
    { name: 'Blue', value: 'blue', class: 'bg-blue-500' },
    { name: 'Green', value: 'green', class: 'bg-green-500' },
    { name: 'Yellow', value: 'yellow', class: 'bg-yellow-500' },
    { name: 'Red', value: 'red', class: 'bg-red-500' },
    { name: 'Purple', value: 'purple', class: 'bg-purple-500' },
    { name: 'Pink', value: 'pink', class: 'bg-pink-500' },
  ];

  useEffect(() => {
    loadLists();
  }, [adId]);

  const loadLists = async () => {
    try {
      setLoading(true);
      const [listsResponse, adListsResponse] = await Promise.all([
        adsApi.getFavoriteLists(),
        adsApi.getAdFavoriteLists(adId),
      ]);
      
      setLists(listsResponse.lists);
      setSelectedListIds(adListsResponse.list_ids);
    } catch (error) {
      console.error('Error loading lists:', error);
      alert('Failed to load favorite lists');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleList = (listId: number) => {
    setSelectedListIds(prev => 
      prev.includes(listId) 
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      alert('Please enter a list name');
      return;
    }

    try {
      setSubmitting(true);
      const newList = await adsApi.createFavoriteList({
        name: newListName,
        description: newListDescription || undefined,
        color: newListColor,
        icon: 'star',
        is_default: false,
      });

      setLists(prev => [newList, ...prev]);
      setSelectedListIds(prev => [...prev, newList.id]);
      setNewListName('');
      setNewListDescription('');
      setNewListColor('blue');
      setShowNewList(false);
    } catch (error) {
      console.error('Error creating list:', error);
      alert('Failed to create list');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      
      // Get current lists the ad is in
      const currentResponse = await adsApi.getAdFavoriteLists(adId);
      const currentListIds = currentResponse.list_ids;

      // Determine which lists to add to and remove from
      const toAdd = selectedListIds.filter(id => !currentListIds.includes(id));
      const toRemove = currentListIds.filter(id => !selectedListIds.includes(id));

      // Execute additions and removals
      await Promise.all([
        ...toAdd.map(listId => adsApi.addAdToFavoriteList(listId, adId)),
        ...toRemove.map(listId => adsApi.removeAdFromFavoriteList(listId, adId)),
      ]);

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving favorites:', error);
      alert('Failed to save favorites');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <h2 className="text-xl font-semibold dark:text-white">Add to Favorites</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* Lists */}
              <div className="space-y-2">
                {lists.map(list => (
                  <button
                    key={list.id}
                    onClick={() => handleToggleList(list.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                      selectedListIds.includes(list.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-${list.color || 'blue'}-500`} />
                    <div className="flex-1 text-left">
                      <div className="font-medium dark:text-white">{list.name}</div>
                      {list.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {list.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {list.item_count} {list.item_count === 1 ? 'ad' : 'ads'}
                      </div>
                    </div>
                    {selectedListIds.includes(list.id) && (
                      <Check className="w-5 h-5 text-blue-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* Create New List */}
              {!showNewList ? (
                <button
                  onClick={() => setShowNewList(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium dark:text-white">Create New List</span>
                </button>
              ) : (
                <div className="p-4 border-2 border-blue-500 rounded-lg space-y-3 bg-blue-50 dark:bg-blue-900/20">
                  <input
                    type="text"
                    placeholder="List name"
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white"
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={newListDescription}
                    onChange={e => setNewListDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white"
                  />
                  
                  {/* Color Picker */}
                  <div className="flex gap-2">
                    {colors.map(color => (
                      <button
                        key={color.value}
                        onClick={() => setNewListColor(color.value)}
                        className={`w-8 h-8 rounded-full ${color.class} ${
                          newListColor === color.value ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                        }`}
                        title={color.name}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateList}
                      disabled={submitting || !newListName.trim()}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      onClick={() => {
                        setShowNewList(false);
                        setNewListName('');
                        setNewListDescription('');
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting || loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
