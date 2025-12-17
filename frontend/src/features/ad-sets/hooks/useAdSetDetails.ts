'use client';

import { useState, useEffect, useCallback } from 'react';
import { adsApi, ApiError } from '@/lib/api';
import { AdWithAnalysis } from '@/types/ad';
import { transformAdsWithAnalysis } from '@/lib/transformers';
import { AdSetDetails } from '../types';

interface UseAdSetDetailsReturn {
  adVariants: AdWithAnalysis[];
  adSetDetails: AdSetDetails | null;
  loading: boolean;
  error: string | null;
  page: number;
  totalItems: number;
  totalPages: number;
  bestAdId: number | null;
  isRefreshing: boolean;
  setPage: (page: number) => void;
  refetch: () => Promise<void>;
  refreshAdSetMedia: () => Promise<void>;
}

export function useAdSetDetails(adSetId: number, pageSize: number = 24): UseAdSetDetailsReturn {
  const [adVariants, setAdVariants] = useState<AdWithAnalysis[]>([]);
  const [adSetDetails, setAdSetDetails] = useState<AdSetDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [bestAdId, setBestAdId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const findBestVariant = useCallback((ads: AdWithAnalysis[]): AdWithAnalysis => {
    let longestRunningAd = ads[0];
    let maxDuration = 0;
    
    ads.forEach(ad => {
      const startDate = ad.start_date ? new Date(ad.start_date) : null;
      const endDate = ad.end_date ? new Date(ad.end_date) : new Date();
      
      if (startDate) {
        const duration = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (duration > maxDuration || (duration === maxDuration && ad.is_active && !longestRunningAd.is_active)) {
          maxDuration = duration;
          longestRunningAd = ad;
        }
      }
    });
    
    return longestRunningAd;
  }, []);

  const fetchAdVariants = useCallback(async () => {
    if (isNaN(adSetId)) {
      setError('Invalid Ad Set ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await adsApi.getAdsInSet(adSetId, page, pageSize);
      
      setTotalItems(response.pagination.total_items);
      setTotalPages(response.pagination.total_pages);
      
      const transformedAds = transformAdsWithAnalysis(response.data);
      
      if (transformedAds.length > 0 && page === 1) {
        const firstAd = transformedAds[0];
        const bestVariant = findBestVariant(transformedAds);
        
        setBestAdId(bestVariant.id || null);
        
        setAdSetDetails({
          id: adSetId,
          variant_count: response.pagination.total_items,
          first_seen_date: firstAd.ad_set_first_seen_date,
          last_seen_date: firstAd.ad_set_last_seen_date,
          best_ad_id: bestVariant.id
        });
      }
      
      setAdVariants(transformedAds);
      
    } catch (err) {
      console.error('Error fetching ad variants:', err);
      
      if (err instanceof ApiError) {
        setError(`API Error: ${err.message}`);
      } else {
        setError('Failed to fetch ad variants. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, [adSetId, page, pageSize, findBestVariant]);

  const refreshAdSetMedia = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      const result = await adsApi.refreshAdSetMedia(adSetId);
      console.log('Ad set refreshed:', result);
      alert(`✓ Refreshed ${result.successful}/${result.total} ads in set!`);
      window.location.reload();
    } catch (error) {
      console.error('Failed to refresh ad set:', error);
      alert('✗ Failed to refresh ad set');
    } finally {
      setIsRefreshing(false);
    }
  }, [adSetId, isRefreshing]);

  useEffect(() => {
    fetchAdVariants();
  }, [fetchAdVariants]);

  return {
    adVariants,
    adSetDetails,
    loading,
    error,
    page,
    totalItems,
    totalPages,
    bestAdId,
    isRefreshing,
    setPage,
    refetch: fetchAdVariants,
    refreshAdSetMedia,
  };
}