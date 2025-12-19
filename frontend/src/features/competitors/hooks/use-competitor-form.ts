import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { 
  competitorFormSchema, 
  type CompetitorFormData, 
  defaultCompetitorForm 
} from '../schemas/competitor-schemas';
import { useCreateCompetitorMutation, useUpdateCompetitorMutation } from './use-competitors-query';
import { useCompetitorsStore } from '../stores/competitors-store';
import type { Competitor } from '@/lib/api';

interface UseCompetitorFormProps {
  competitor?: Competitor;
  onSuccess?: () => void;
}

export function useCompetitorForm({ competitor, onSuccess }: UseCompetitorFormProps = {}) {
  const isEditing = !!competitor;
  
  const createMutation = useCreateCompetitorMutation();
  const updateMutation = useUpdateCompetitorMutation();
  
  const { setAddDialogOpen, setEditDialogOpen, setSelectedCompetitor } = useCompetitorsStore();
  
  const form = useForm<CompetitorFormData>({
    resolver: zodResolver(competitorFormSchema),
    defaultValues: defaultCompetitorForm,
  });

  // Reset form when competitor changes
  useEffect(() => {
    if (competitor) {
      form.reset({
        name: competitor.name,
        page_id: competitor.page_id,
        is_active: competitor.is_active,
        category_id: competitor.category_id ?? null,
      });
    } else {
      form.reset(defaultCompetitorForm);
    }
  }, [competitor, form]);

  const onSubmit = async (data: CompetitorFormData) => {
    try {
      if (isEditing && competitor) {
        await updateMutation.mutateAsync({
          id: competitor.id,
          data: {
            name: data.name,
            page_id: data.page_id,
            is_active: data.is_active,
            category_id: data.category_id ?? null,
          },
        });
        setEditDialogOpen(false);
        setSelectedCompetitor(null);
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          page_id: data.page_id,
          is_active: data.is_active,
          category_id: data.category_id ?? null,
        });
        setAddDialogOpen(false);
      }
      
      form.reset(defaultCompetitorForm);
      onSuccess?.();
    } catch (error) {
      // Error handling is done in the mutation hooks via toast
      console.error('Form submission error:', error);
    }
  };

  const handleCancel = () => {
    form.reset(defaultCompetitorForm);
    if (isEditing) {
      setEditDialogOpen(false);
      setSelectedCompetitor(null);
    } else {
      setAddDialogOpen(false);
    }
  };

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
    handleCancel,
    isLoading: createMutation.isPending || updateMutation.isPending,
    isEditing,
  };
}