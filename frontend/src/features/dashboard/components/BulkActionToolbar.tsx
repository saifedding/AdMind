'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, X } from 'lucide-react';
import { useState } from 'react';

export interface BulkActionToolbarProps {
  selectedCount: number;
  onDelete: () => void;
  onClear: () => void;
  isDeleting?: boolean;
  disabled?: boolean;
}

export function BulkActionToolbar({ 
  selectedCount, 
  onDelete, 
  onClear, 
  isDeleting = false,
  disabled = false
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <Card className="border-dashed border-orange-500/50 bg-orange-500/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="bg-orange-500/20 text-orange-300">
              {selectedCount} selected
            </Badge>
            <span className="text-sm text-muted-foreground">
              {selectedCount === 1 ? '1 ad selected' : `${selectedCount} ads selected`}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting || disabled}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete Selected'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              disabled={isDeleting || disabled}
            >
              <X className="h-4 w-4 mr-2" />
              Clear Selection
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 