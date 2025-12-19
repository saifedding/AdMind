'use client';

import { useQuery } from '@tanstack/react-query';
import { getCategories } from '@/lib/api';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { FolderOpen, Loader2 } from 'lucide-react';

interface CategorySelectProps {
  value?: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  allowUncategorized?: boolean;
  disabled?: boolean;
  className?: string;
}

export function CategorySelect({ 
  value, 
  onChange, 
  placeholder = "Select category",
  allowUncategorized = true,
  disabled = false,
  className
}: CategorySelectProps) {
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (error) {
    console.error('Failed to load categories:', error);
  }

  const handleValueChange = (v: string) => {
    if (v === 'none') {
      onChange(null);
    } else if (v === 'uncategorized') {
      onChange(-1); // Special value for filtering uncategorized
    } else {
      onChange(Number(v));
    }
  };

  const getCurrentValue = () => {
    if (value === null || value === undefined) return 'none';
    if (value === -1) return 'uncategorized';
    return value?.toString();
  };

  const getDisplayValue = () => {
    if (isLoading) return 'Loading categories...';
    if (value === null || value === undefined) return placeholder;
    if (value === -1) return 'Uncategorized Only';
    
    const category = categories?.find(c => c.id === value);
    return category ? category.name : placeholder;
  };

  return (
    <Select
      value={getCurrentValue()}
      onValueChange={handleValueChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className={className}>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading categories...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <span>{getDisplayValue()}</span>
          </div>
        )}
      </SelectTrigger>
      <SelectContent>
        {/* Always show "All Categories" option for filtering */}
        <SelectItem value="none">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <span>All Categories</span>
          </div>
        </SelectItem>
        
        {allowUncategorized && (
          <SelectItem value="uncategorized">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span>Uncategorized Only</span>
            </div>
          </SelectItem>
        )}
        {categories && categories.length > 0 ? (
          categories.map((category) => (
            <SelectItem key={category.id} value={category.id.toString()}>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-photon-400" />
                <span>{category.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  ({category.competitor_count})
                </span>
              </div>
            </SelectItem>
          ))
        ) : !isLoading ? (
          <SelectItem value="no-categories" disabled>
            <span className="text-muted-foreground text-sm">No categories available</span>
          </SelectItem>
        ) : null}
      </SelectContent>
    </Select>
  );
}
