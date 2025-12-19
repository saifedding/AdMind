'use client';

import { Badge } from '@/components/ui/badge';
import { FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  categoryName: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
  className?: string;
  showIcon?: boolean;
}

export function CategoryBadge({ 
  categoryName, 
  size = 'md',
  variant = 'default',
  className,
  showIcon = true
}: CategoryBadgeProps) {
  return (
    <Badge 
      variant={variant}
      className={cn(
        "flex items-center gap-1 font-medium",
        size === 'sm' && "text-[10px] px-1.5 py-0.5",
        size === 'md' && "text-xs px-2 py-1",
        size === 'lg' && "text-sm px-3 py-1.5",
        variant === 'default' && "bg-photon-500/20 text-photon-400 border-photon-500/30",
        className
      )}
    >
      {showIcon && (
        <FolderOpen className={cn(
          size === 'sm' && "h-2.5 w-2.5",
          size === 'md' && "h-3 w-3",
          size === 'lg' && "h-4 w-4"
        )} />
      )}
      <span className="truncate max-w-[150px]">{categoryName}</span>
    </Badge>
  );
}
