'use client';

import { useState, useEffect, useCallback } from 'react';
import { adsApi, ApiError, AnalyzeVideoResponse } from '@/lib/api';
import { AdWithAnalysis } from '@/types/ad';
import { transformAdsWithAnalysis } from '@/lib/transformers';
import { differenceInDays, format, parseISO } from 'date-fns';
import { AdDuration } from '../types';

interface UseAdDetailReturn {
  ad: AdWithAnalysis | null;
  loading: boolean;
  error: string | null;
  currentCreativeIndex: number;
  isRefreshing: boolean;
  analysis: AnalyzeVideoResponse | null;
  analyzing: boolean;
  isAnalyzingSet: boolean;
  hookScore: number;
  isFavorite: boolean;
  showShareMenu: boolean;
  setCurrentCreativeIndex: (index: number) => void;
  setShowShareMenu: (show: boolean) => void;
  handleRefresh: () => Promise<void>;
  handleToggleFavorite: () => Promise<void>;
  handleShare: (type: 'copy' | 'download') => Promise<void>;
  analyzeCurrentAd: () => Promise<void>;
  analyzeAdSetBestVariant: () => Promise<void>;
  formatAdDuration: (startDateStr?: string, endDateStr?: string, isActive?: boolean) => AdDuration;
}

export function useAdDetail(id: string): UseAdDetailReturn {
  const [ad, setAd] = useState<AdWithAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCreativeIndex, setCurrentCreativeIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeVideoResponse | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [isAnalyzingSet, setIsAnalyzingSet] = useState<boolean>(false);
  const [hookScore, setHookScore] = useState<number>(0);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [showShareMenu, setShowShareMenu] = useState<boolean>(false);

  const fetchAd = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adsApi.getAdById(Number(id));
      const transformed = transformAdsWithAnalysis([response]);
      setAd(transformed[0]);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load ad');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchAd();
    }
  }, [id, fetchAd]);

  // Initialize state from ad data
  useEffect(() => {
    if (ad?.analysis?.hook_score !== undefined && ad?.analysis?.hook_score !== null) {
      setHookScore(ad.analysis.hook_score as number);
    } else {
      setHookScore(0);
    }
    if (ad?.is_favorite !== undefined) {
      setIsFavorite(ad.is_favorite);
    }
    if (ad?.ad_set_id) {
      try {
        const cached = localStorage.getItem(`adSetAnalysis:${ad.ad_set_id}`);
        if (cached) {
          const parsed: AnalyzeVideoResponse = JSON.parse(cached);
          setAnalysis(parsed);
        }
      } catch {}
    }
  }, [ad?.id, ad?.analysis?.hook_score, ad?.ad_set_id, ad?.is_favorite]);

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showShareMenu) {
        setShowShareMenu(false);
      }
    };

    if (showShareMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showShareMenu]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || !ad) return;
    
    setIsRefreshing(true);
    try {
      if (ad.ad_set_id && ad.variant_count && ad.variant_count > 1) {
        const result = await adsApi.refreshAdSetMedia(ad.ad_set_id);
        console.log('Ad set refreshed:', result);
        alert(`✓ Refreshed ${result.successful}/${result.total} ads in set!`);
      } else {
        const result = await adsApi.refreshMediaFromFacebook(ad.id);
        console.log('Ad refreshed:', result);
        alert('✓ Media refreshed successfully!');
      }
      window.location.reload();
    } catch (error) {
      console.error('Failed to refresh:', error);
      alert('✗ Failed to refresh media');
    } finally {
      setIsRefreshing(false);
    }
  }, [ad, isRefreshing]);

  const handleToggleFavorite = useCallback(async () => {
    if (!ad) return;
    try {
      const result = await adsApi.toggleFavorite(ad.id);
      setIsFavorite(result.is_favorite);
      setAd(prev => prev ? { ...prev, is_favorite: result.is_favorite } : prev);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      alert('✗ Failed to update favorite status');
    }
  }, [ad]);

  const handleShare = useCallback(async (type: 'copy' | 'download') => {
    if (!ad) return;
    
    if (type === 'copy') {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('✓ Link copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy link:', error);
        alert('✗ Failed to copy link');
      }
    } else if (type === 'download') {
      const summary = {
        ad_id: ad.id,
        ad_archive_id: ad.ad_archive_id,
        competitor: ad.competitor?.name || ad.page_name,
        title: ad.main_title,
        body: ad.main_body_text,
        cta: ad.cta_text,
        analysis: ad.analysis ? {
          summary: ad.analysis.summary,
          hook_score: ad.analysis.hook_score,
          overall_score: ad.analysis.overall_score,
          target_audience: ad.analysis.target_audience,
          content_themes: ad.analysis.content_themes
        } : null,
        url: window.location.href,
        exported_at: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ad-${ad.id}-summary.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setShowShareMenu(false);
  }, [ad]);

  const analyzeCurrentAd = useCallback(async () => {
    if (!ad) return;
    try {
      setAnalyzing(true);
      const currentCreative = ad?.creatives?.[currentCreativeIndex];
      const media = currentCreative?.media?.[0];
      
      const body: any = {};
      if (media?.type === 'Video' && media?.url) {
        body.video_url = media.url;
      }
      
      const res = await fetch(`/api/v1/ads/${ad.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, async: false, use_task: false })
      });
      
      if (!res.ok) throw new Error('Analyze failed');
      const data: AnalyzeVideoResponse = await res.json();

      if (data.source === 'celery-task' && data.raw?.task_id) {
        const taskId = data.raw.task_id;
        const pollInterval = setInterval(async () => {
          try {
            const status = await adsApi.getAdAnalysisTaskStatus(taskId);
            if (status.state === 'SUCCESS' && status.result) {
              clearInterval(pollInterval);
              const finalData = status.result;
              setAnalysis(finalData);
              if (ad?.ad_set_id) {
                try { localStorage.setItem(`adSetAnalysis:${ad.ad_set_id}`, JSON.stringify(finalData)); } catch {}
              }
              setAnalyzing(false);
            } else if (status.state === 'FAILURE') {
              clearInterval(pollInterval);
              alert(`Analysis failed: ${status.error}`);
              setAnalyzing(false);
            }
          } catch (e) {
            console.error(e);
          }
        }, 2000);
        
        setTimeout(() => {
            clearInterval(pollInterval);
            if (analyzing) setAnalyzing(false);
        }, 300000);
        return;
      }

      setAnalysis(data);
      if (ad?.ad_set_id) {
        try { localStorage.setItem(`adSetAnalysis:${ad.ad_set_id}`, JSON.stringify(data)); } catch {}
      }
      setAnalyzing(false);
    } catch (e) {
      console.error(e);
      alert('Failed to analyze ad');
      setAnalyzing(false);
    }
  }, [ad, currentCreativeIndex, analyzing]);

  const analyzeAdSetBestVariant = useCallback(async () => {
    if (!ad?.ad_set_id) return;
    try {
      setIsAnalyzingSet(true);
      const variantsResp = await adsApi.getAdsInSet(ad.ad_set_id, 1, 50);
      const variants = variantsResp.data || [];
      if (variants.length === 0) throw new Error('No variants in set');
      
      const transformed = transformAdsWithAnalysis(variants);
      const pickBest = (adsArr: AdWithAnalysis[]) => {
        let best = adsArr[0];
        const days = (a: AdWithAnalysis) => {
          try {
            const start = a.start_date ? parseISO(a.start_date) : null;
            const end = a.end_date ? parseISO(a.end_date) : new Date();
            if (!start) return 0;
            return Math.max(1, differenceInDays(end, start));
          } catch { return 0; }
        };
        for (const item of adsArr) {
          if (days(item) > days(best)) best = item;
        }
        return best;
      };
      
      const bestVariant = pickBest(transformed);
      const res = await fetch(`/api/v1/ads/${bestVariant.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ async: false, use_task: false })
      });
      
      if (!res.ok) throw new Error('Analyze set failed');
      const data: AnalyzeVideoResponse = await res.json();

      if (data.source === 'celery-task' && data.raw?.task_id) {
        const taskId = data.raw.task_id;
        const pollInterval = setInterval(async () => {
          try {
            const status = await adsApi.getAdAnalysisTaskStatus(taskId);
            if (status.state === 'SUCCESS' && status.result) {
              clearInterval(pollInterval);
              const finalData = status.result;
              setAnalysis(finalData);
              if (ad?.ad_set_id) {
                try { localStorage.setItem(`adSetAnalysis:${ad.ad_set_id}`, JSON.stringify(finalData)); } catch {}
              }
              alert(`Analyzed best variant (ID: ${bestVariant.id})`);
              setIsAnalyzingSet(false);
            } else if (status.state === 'FAILURE') {
              clearInterval(pollInterval);
              alert(`Analysis set failed: ${status.error}`);
              setIsAnalyzingSet(false);
            }
          } catch (e) {
            console.error(e);
          }
        }, 2000);

        setTimeout(() => {
            clearInterval(pollInterval);
            if (isAnalyzingSet) setIsAnalyzingSet(false);
        }, 300000);
        return;
      }

      setAnalysis(data);
      if (ad?.ad_set_id) {
        try { localStorage.setItem(`adSetAnalysis:${ad.ad_set_id}`, JSON.stringify(data)); } catch {}
      }
      alert(`Analyzed best variant (ID: ${bestVariant.id})`);
      setIsAnalyzingSet(false);
    } catch (e) {
      console.error(e);
      alert('Failed to analyze ad set');
      setIsAnalyzingSet(false);
    }
  }, [ad?.ad_set_id, isAnalyzingSet]);

  const formatAdDuration = useCallback((startDateStr?: string, endDateStr?: string, isActive?: boolean): AdDuration => {
    if (!startDateStr) return { formattedDate: null, duration: null, isActive: false };
    try {
      const startDate = parseISO(startDateStr);
      const endDate = endDateStr ? parseISO(endDateStr) : new Date();
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return { formattedDate: null, duration: null, isActive: false };
      
      let duration = differenceInDays(endDate, startDate);
      duration = Math.max(duration, 1);
  
      const formattedStartDate = format(startDate, 'MMM d, yyyy');
      const formattedEndDate = endDateStr ? format(parseISO(endDateStr), 'MMM d, yyyy') : 'Present';
  
      if (isActive) {
        return { 
          formattedDate: `Running since ${formattedStartDate}`, 
          duration, 
          isActive: true 
        };
      }
  
      return { 
        formattedDate: `${formattedStartDate} - ${formattedEndDate}`, 
        duration, 
        isActive: false 
      };
    } catch (error) {
      console.error("Error formatting ad duration:", error);
      return { formattedDate: null, duration: null, isActive: false };
    }
  }, []);

  return {
    ad,
    loading,
    error,
    currentCreativeIndex,
    isRefreshing,
    analysis,
    analyzing,
    isAnalyzingSet,
    hookScore,
    isFavorite,
    showShareMenu,
    setCurrentCreativeIndex,
    setShowShareMenu,
    handleRefresh,
    handleToggleFavorite,
    handleShare,
    analyzeCurrentAd,
    analyzeAdSetBestVariant,
    formatAdDuration,
  };
}