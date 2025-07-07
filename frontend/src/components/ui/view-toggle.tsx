'use client';

import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ViewToggleProps {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  disabled?: boolean;
}

export function ViewToggle({ view, onViewChange, disabled = false }: ViewToggleProps) {
  return (
    <div className="flex items-center rounded-lg border p-1">
      <Button
        variant={view === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('grid')}
        disabled={disabled}
        className="px-3 py-1.5"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={view === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('list')}
        disabled={disabled}
        className="px-3 py-1.5"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
} 