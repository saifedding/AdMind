import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CategorySelect } from '@/components/CategorySelect';
import { useCompetitorsStore } from '../stores/competitors-store';
import { useBulkUpdateCategoryMutation } from '../hooks/use-competitors-query';

export function BulkCategoryDialog() {
  const { bulkCategoryDialogOpen, setBulkCategoryDialogOpen, selectedIds, clearSelection } = useCompetitorsStore();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const bulkUpdateMutation = useBulkUpdateCategoryMutation();

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;

    try {
      await bulkUpdateMutation.mutateAsync({
        competitorIds: selectedIds,
        categoryId: selectedCategory,
      });
      setBulkCategoryDialogOpen(false);
      clearSelection();
      setSelectedCategory(null);
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Bulk category update error:', error);
    }
  };

  const handleCancel = () => {
    setBulkCategoryDialogOpen(false);
    setSelectedCategory(null);
  };

  return (
    <Dialog open={bulkCategoryDialogOpen} onOpenChange={setBulkCategoryDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Category to Competitors</DialogTitle>
          <DialogDescription>
            Update the category for {selectedIds.length} selected competitor(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Category</label>
            <CategorySelect
              value={selectedCategory}
              onChange={setSelectedCategory}
              placeholder="Select a category"
              allowUncategorized={true}
              className="bg-card border-border"
            />
            <p className="text-xs text-muted-foreground">
              Select "Uncategorized" to remove category assignment
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={bulkUpdateMutation.isPending}
            className="border-border"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={bulkUpdateMutation.isPending || selectedIds.length === 0}
            className="bg-photon-500 text-photon-950 hover:bg-photon-400"
          >
            {bulkUpdateMutation.isPending ? 'Updating...' : 'Update Category'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
