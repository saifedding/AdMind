import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useCompetitorsStore } from '../stores/competitors-store';
import { 
  useDeleteCompetitorMutation, 
  useBulkDeleteCompetitorsMutation,
  useClearCompetitorAdsMutation,
  useClearAllAdsMutation 
} from '../hooks/use-competitors-query';

export function DeleteConfirmDialog() {
  const { 
    confirmDeleteDialogOpen, 
    selectedCompetitor,
    selectedIds,
    setConfirmDeleteDialogOpen,
    setSelectedCompetitor,
    clearSelection,
    setCurrentPage,
    pageSize
  } = useCompetitorsStore();

  const deleteMutation = useDeleteCompetitorMutation();
  const bulkDeleteMutation = useBulkDeleteCompetitorsMutation();

  const isBulkDelete = selectedIds.length > 1 || (selectedIds.length === 1 && !selectedCompetitor);
  const deleteCount = isBulkDelete ? selectedIds.length : 1;

  const handleConfirm = async () => {
    try {
      if (isBulkDelete) {
        await bulkDeleteMutation.mutateAsync(selectedIds);
        clearSelection();
      } else if (selectedCompetitor) {
        await deleteMutation.mutateAsync(selectedCompetitor.id);
        setSelectedCompetitor(null);
      }
      setConfirmDeleteDialogOpen(false);
    } catch (error) {
      // Error handling is done in the mutation hooks
      console.error('Delete error:', error);
    }
  };

  return (
    <Dialog open={confirmDeleteDialogOpen} onOpenChange={setConfirmDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action will delete {deleteCount} competitor(s). This may be a soft or hard delete depending on whether they have associated ads. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setConfirmDeleteDialogOpen(false)}
            disabled={deleteMutation.isPending || bulkDeleteMutation.isPending}
            className="border-border"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={deleteMutation.isPending || bulkDeleteMutation.isPending}
          >
            {(deleteMutation.isPending || bulkDeleteMutation.isPending) ? 'Deleting...' : 'Yes, delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ClearAdsDialog() {
  const { 
    clearDialogOpen, 
    clearingCompetitor, 
    setClearDialogOpen,
    setClearingCompetitor 
  } = useCompetitorsStore();

  const clearMutation = useClearCompetitorAdsMutation();

  const handleConfirm = async () => {
    if (!clearingCompetitor) return;
    
    try {
      await clearMutation.mutateAsync(clearingCompetitor.id);
      setClearDialogOpen(false);
      setClearingCompetitor(null);
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error('Clear ads error:', error);
    }
  };

  return (
    <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear ads for {clearingCompetitor?.name}</DialogTitle>
          <DialogDescription>
            This will permanently delete all ads associated with this competitor.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setClearDialogOpen(false)}
            disabled={clearMutation.isPending}
            className="border-border"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={clearMutation.isPending}
          >
            {clearMutation.isPending ? 'Clearing...' : 'Clear Ads'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ClearAllAdsDialog() {
  const { 
    clearAllDialogOpen, 
    setClearAllDialogOpen 
  } = useCompetitorsStore();

  const clearAllMutation = useClearAllAdsMutation();

  const handleConfirm = async () => {
    try {
      await clearAllMutation.mutateAsync();
      setClearAllDialogOpen(false);
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error('Clear all ads error:', error);
    }
  };

  return (
    <Dialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear ALL ads for ALL competitors</DialogTitle>
          <DialogDescription>
            This will permanently delete every ad in the database across all competitors. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setClearAllDialogOpen(false)}
            disabled={clearAllMutation.isPending}
            className="border-border"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={clearAllMutation.isPending}
          >
            {clearAllMutation.isPending ? 'Clearing...' : 'Clear ALL Ads'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}