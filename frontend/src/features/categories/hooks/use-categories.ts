'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getCategoryStats,
  createCategory, 
  updateCategory, 
  deleteCategory,
  type CategoryCreate,
  type CategoryUpdate
} from '@/lib/api';
import { toast } from 'sonner';

export function useCategories() {
  const queryClient = useQueryClient();

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['categories', 'stats'],
    queryFn: getCategoryStats,
  });

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create category');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryUpdate }) => 
      updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update category');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete category');
    }
  });

  return {
    categories,
    isLoading,
    error,
    createCategory: createMutation.mutate,
    updateCategory: updateMutation.mutate,
    deleteCategory: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
