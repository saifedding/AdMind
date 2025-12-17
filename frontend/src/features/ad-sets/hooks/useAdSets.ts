'use client';

import { useState, useEffect, useCallback } from 'react';
import { adsApi, ApiError } from '@/lib/api';
import { AdWithAnalysis } from '@/types/ad';
import { transformAdsWithAnalysis } from '@/lib/transformers';
import { AdSetSortOptions } from '../types';

interface UseAdSetsReturn {
  adSets: AdWithAnalysis[];
  loading: boolean;
  error: string | null;
  page: number;
  totalItems: number;
  totalPages: number;
  sortBy: string;
  sortOrder: string;
  setPage: (page: number) => void;
  setSortBy: (sortBy: string) => void;
  setSortOrder: (order: string) => void;
  toggleSortOrder: () => void;
  refetch: () => Promise<void>;
}

export function useAdSets(pageSize: number = 24): UseAdSetsReturn {
  const [adSets, setAdSets] = useState<AdWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchAdSets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adsApi.getAllAdSets(page, pageSize, sortBy, sortOrder);
      
      setTotalItems(response.pagination.total_items);
      setTotalPages(response.pagination.total_pages);
      
      const transformedAds = transformAdsWithAnalysis(response.data);
      setAdSets(transformedAds);
      
    } catch (err) {
      console.error('Error fetching ad sets:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to fetch ad sets');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder]);

  useEffect(() => {
    fetchAdSets();
  }, [fetchAdSets]);

  const handleSortByChange = useCallback((newSortBy: string) => {
    setSortBy(newSortBy);
    setPage(1);
  }, []);

  const handleSortOrderChange = useCallback((newSortOrder: string) => {
    setSortOrder(newSortOrder);
    setPage(1);
  }, []);

  const toggleSortOrder = useCallback(() => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    handleSortOrderChange(newOrder);
  }, [sortOrder, handleSortOrderChange]);

  return {
    adSets,
    loading,
    error,
    page,
    totalItems,
    totalPages,
    sortBy,
    sortOrder,
    setPage,
    setSortBy: handleSortByChange,
    setSortOrder: handleSortOrderChange,
    toggleSortOrder,
    refetch: fetchAdSets,
  };
}