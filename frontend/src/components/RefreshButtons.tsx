'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { adsApi } from '@/lib/api';

// ============================================
// Single Ad Refresh Button
// ============================================

interface RefreshAdButtonProps {
  adId: number;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button';
  className?: string;
}

export function RefreshAdButton({
  adId,
  onSuccess,
  onError,
  size = 'md',
  variant = 'icon',
  className = '',
}: RefreshAdButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click events
    setIsRefreshing(true);

    try {
      const result = await adsApi.refreshMediaFromFacebook(adId);
      console.log('Refresh result:', result);
      
      // Show success notification
      if (window.alert) {
        alert(`✓ Media refreshed successfully!`);
      }
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Failed to refresh ad:', error);
      
      // Extract error message from response
      let errorMessage = 'Failed to refresh media';
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Show error notification
      if (window.alert) {
        alert(`✗ ${errorMessage}`);
      }
      
      // Call error callback
      if (onError) {
        onError(error);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Icon size classes
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  // Button size classes
  const buttonSizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        title="Refresh media from Facebook"
        className={`
          p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200
          ${className}
        `}
      >
        <RefreshCw
          className={`${iconSizes[size]} ${isRefreshing ? 'animate-spin' : ''} text-blue-600`}
        />
      </button>
    );
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`
        flex items-center gap-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
        disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200
        ${buttonSizes[size]}
        ${className}
      `}
    >
      <RefreshCw className={`${iconSizes[size]} ${isRefreshing ? 'animate-spin' : ''}`} />
      <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
    </button>
  );
}

// ============================================
// Ad Set Refresh Button
// ============================================

interface RefreshAdSetButtonProps {
  adSetId: number;
  variantCount?: number;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button';
  className?: string;
}

export function RefreshAdSetButton({
  adSetId,
  variantCount,
  onSuccess,
  onError,
  size = 'md',
  variant = 'button',
  className = '',
}: RefreshAdSetButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click events
    setIsRefreshing(true);

    try {
      const result = await adsApi.refreshAdSetMedia(adSetId);
      console.log('Ad Set refresh result:', result);
      
      // Show success notification
      if (window.alert) {
        alert(`✓ ${result.message}\n\nSuccessful: ${result.successful}/${result.total}`);
      }
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to refresh ad set:', error);
      
      // Show error notification
      if (window.alert) {
        alert('✗ Failed to refresh ad set');
      }
      
      // Call error callback
      if (onError) {
        onError(error);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Icon size classes
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  // Button size classes
  const buttonSizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        title={`Refresh all ${variantCount || ''} ads in this set`}
        className={`
          p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200
          ${className}
        `}
      >
        <RefreshCw
          className={`${iconSizes[size]} ${isRefreshing ? 'animate-spin' : ''} text-blue-600`}
        />
      </button>
    );
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`
        flex items-center gap-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
        disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200
        ${buttonSizes[size]}
        ${className}
      `}
    >
      <RefreshCw className={`${iconSizes[size]} ${isRefreshing ? 'animate-spin' : ''}`} />
      <span>
        {isRefreshing 
          ? 'Refreshing...' 
          : `Refresh All${variantCount ? ` (${variantCount})` : ''}`
        }
      </span>
    </button>
  );
}

// ============================================
// Refresh All Favorites Button
// ============================================

interface RefreshAllFavoritesButtonProps {
  onSuccess?: () => void;
  onError?: (error: any) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RefreshAllFavoritesButton({
  onSuccess,
  onError,
  size = 'md',
  className = '',
}: RefreshAllFavoritesButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      const result = await adsApi.refreshAllFavorites();
      console.log('Favorites refresh result:', result);
      
      // Show success notification
      if (window.alert) {
        alert(`✓ ${result.message}\n\nTotal: ${result.total}\nSuccessful: ${result.successful}\nFailed: ${result.failed}`);
      }
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to refresh favorites:', error);
      
      // Show error notification
      if (window.alert) {
        alert('✗ Failed to refresh favorites');
      }
      
      // Call error callback
      if (onError) {
        onError(error);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Icon size classes
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  // Button size classes
  const buttonSizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`
        flex items-center gap-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
        disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200
        ${buttonSizes[size]}
        ${className}
      `}
    >
      <RefreshCw className={`${iconSizes[size]} ${isRefreshing ? 'animate-spin' : ''}`} />
      <span>{isRefreshing ? 'Refreshing...' : 'Refresh All Favorites'}</span>
    </button>
  );
}
