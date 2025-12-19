import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { Category } from '@/lib/api';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSubmit: (name: string) => void;
  isLoading: boolean;
}

export function CategoryFormDialog({ 
  open, 
  onOpenChange, 
  category, 
  onSubmit,
  isLoading 
}: CategoryFormDialogProps) {
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    if (category) {
      setCategoryName(category.name);
    } else {
      setCategoryName('');
    }
  }, [category, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (categoryName.trim()) {
      onSubmit(categoryName.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? 'Edit Category' : 'Create New Category'}
          </DialogTitle>
          <DialogDescription>
            {category 
              ? 'Update the category name. All competitors will remain in this category.'
              : 'Create a new category to organize your competitors.'
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Real Estate, E-commerce, Technology"
                maxLength={100}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                {categoryName.length}/100 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!categoryName.trim() || isLoading}
              className="bg-photon-500 text-photon-950 hover:bg-photon-400"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {category ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
