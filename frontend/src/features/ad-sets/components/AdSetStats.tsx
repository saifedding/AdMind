'use client';

import { Badge } from '@/components/ui/badge';
import { Layers } from 'lucide-react';

interface AdSetStatsProps {
  totalItems: number;
}

export function AdSetStats({ totalItems }: AdSetStatsProps) {
  if (totalItems === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <Badge variant="outline" className="bg-muted/50 text-foreground flex items-center gap-1 px-3 py-1.5">
        <Layers className="h-4 w-4" />
        <span>{totalItems} Ad Sets</span>
      </Badge>
    </div>
  );
}