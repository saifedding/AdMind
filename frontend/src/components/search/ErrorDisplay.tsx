'use client';

import { AlertCircle } from 'lucide-react';

interface ErrorDisplayProps {
  error: string | null;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4">
      <div className="bg-error/10 border border-error/20 rounded-lg p-4">
        <div className="flex items-center gap-2 text-error">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Search Error</span>
        </div>
        <p className="text-error/80 mt-2 text-sm">{error}</p>
      </div>
    </div>
  );
}