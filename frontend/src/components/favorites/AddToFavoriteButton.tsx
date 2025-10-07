'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { AddToFavoriteDialog } from './AddToFavoriteDialog';

interface AddToFavoriteButtonProps {
  adId: number;
  className?: string;
  onSuccess?: () => void;
}

export function AddToFavoriteButton({ adId, className = '', onSuccess }: AddToFavoriteButtonProps) {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className={`flex items-center gap-2 px-3 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors ${className}`}
        title="Add to favorites"
      >
        <Star className="w-4 h-4" />
        <span>Add to Favorites</span>
      </button>

      {showDialog && (
        <AddToFavoriteDialog
          adId={adId}
          onClose={() => setShowDialog(false)}
          onSuccess={() => {
            onSuccess?.();
            setShowDialog(false);
          }}
        />
      )}
    </>
  );
}
