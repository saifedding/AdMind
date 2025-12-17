'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AdWithAnalysis } from '@/types/ad';

interface CreativeCardProps {
  creative: AdWithAnalysis['creatives'][0];
  index: number;
}

export function CreativeCard({ creative, index }: CreativeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const body = creative.body || '';
  const canTruncate = body.length > 150;

  return (
    <div key={creative.id || index} className="border border-border/30 rounded-lg p-4 space-y-2">
      <h4 className="font-semibold text-sm">Creative {index + 1}</h4>
      {creative.media && creative.media.length > 0 && (
        <div className="rounded-md overflow-hidden">
          {creative.media[0].type === 'Video' ? (
            <video src={creative.media[0].url} controls className="w-full h-auto" />
          ) : (
            <img src={creative.media[0].url} alt={creative.title || ''} className="w-full h-auto" />
          )}
        </div>
      )}
      {creative.title && (
        <p className="text-xs"><strong>Title:</strong> {creative.title}</p>
      )}
      {body && (
        <p className="text-xs">
          <strong>Body:</strong>{' '}
          {canTruncate && !isExpanded ? `${body.substring(0, 150)}...` : body}
          {canTruncate && (
            <Button variant="link" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="p-0 h-auto ml-1 text-xs">
              {isExpanded ? 'Show less' : 'Show more'}
            </Button>
          )}
        </p>
      )}
      {creative.cta?.text && (
        <p className="text-xs"><strong>CTA:</strong> {creative.cta.text}</p>
      )}
    </div>
  );
}