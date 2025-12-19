import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CategorySelect } from '@/components/CategorySelect';
import { useCompetitorForm } from '../hooks/use-competitor-form';
import { useCompetitorsStore } from '../stores/competitors-store';
import type { Competitor } from '@/lib/api';

interface CompetitorFormProps {
  competitor?: Competitor;
  onSuccess?: () => void;
}

export function CompetitorForm({ competitor, onSuccess }: CompetitorFormProps) {
  const { addDialogOpen, editDialogOpen, setAddDialogOpen, setEditDialogOpen } = useCompetitorsStore();
  const { form, onSubmit, handleCancel, isLoading, isEditing } = useCompetitorForm({ 
    competitor, 
    onSuccess 
  });

  const isOpen = isEditing ? editDialogOpen : addDialogOpen;
  const setIsOpen = isEditing ? setEditDialogOpen : setAddDialogOpen;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Competitor' : 'Add New Competitor'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Competitor Name</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="Enter competitor name"
              className="bg-card border-border"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-400">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="page_id">Facebook Page ID</Label>
            <Input
              id="page_id"
              {...form.register('page_id')}
              placeholder="Enter Facebook page ID"
              className="bg-card border-border"
            />
            {form.formState.errors.page_id && (
              <p className="text-sm text-red-400">{form.formState.errors.page_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_id">Category</Label>
            <CategorySelect
              value={form.watch('category_id')}
              onChange={(value) => form.setValue('category_id', value)}
              placeholder="Select a category (optional)"
              allowUncategorized={false}
              className="bg-card border-border"
            />
            <p className="text-xs text-muted-foreground">
              Organize competitors by category for easier management
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={form.watch('is_active')}
              onCheckedChange={(checked) => form.setValue('is_active', Boolean(checked))}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              disabled={isLoading}
              className="border-border"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-photon-500 text-photon-950 hover:bg-photon-400"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}