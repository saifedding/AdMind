import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  bulkScrapeSchema, 
  type BulkScrapeData, 
  defaultBulkScrapeConfig 
} from '../schemas/competitor-schemas';
import { useBulkScrapeCompetitorsMutation } from './use-competitors-query';
import { useCompetitorsStore } from '../stores/competitors-store';

interface UseBulkScrapeFormProps {
  competitorIds: number[];
  onSuccess?: (taskIds: string[]) => void;
}

export function useBulkScrapeForm({ competitorIds, onSuccess }: UseBulkScrapeFormProps) {
  const bulkScrapeMutation = useBulkScrapeCompetitorsMutation();
  const { 
    setBulkScrapeDialogOpen, 
    setActiveBulkTaskIds, 
    setBulkStatusDialogOpen,
    clearSelection 
  } = useCompetitorsStore();
  
  const form = useForm<BulkScrapeData>({
    resolver: zodResolver(bulkScrapeSchema),
    defaultValues: {
      competitor_ids: competitorIds,
      ...defaultBulkScrapeConfig,
    },
  });

  // Update competitor_ids when they change
  React.useEffect(() => {
    form.setValue('competitor_ids', competitorIds);
  }, [competitorIds, form]);

  const onSubmit = async (data: BulkScrapeData) => {
    if (data.competitor_ids.length === 0) return;
    
    try {
      const result = await bulkScrapeMutation.mutateAsync(data);
      
      setActiveBulkTaskIds(result.task_ids);
      setBulkStatusDialogOpen(true);
      setBulkScrapeDialogOpen(false);
      clearSelection();
      
      onSuccess?.(result.task_ids);
    } catch (error) {
      // Error handling is done in the mutation hook via toast
      console.error('Bulk scrape form submission error:', error);
    }
  };

  const handleCancel = () => {
    form.reset({
      competitor_ids: competitorIds,
      ...defaultBulkScrapeConfig,
    });
    setBulkScrapeDialogOpen(false);
  };

  const toggleCountry = (country: string) => {
    const currentCountries = form.getValues('countries');
    let newCountries = [...currentCountries];
    
    if (country === 'ALL') {
      newCountries = newCountries.includes('ALL') ? [] : ['ALL'];
    } else {
      newCountries = newCountries.filter(c => c !== 'ALL');
      if (newCountries.includes(country)) {
        newCountries = newCountries.filter(c => c !== country);
      } else {
        newCountries.push(country);
      }
    }
    
    if (newCountries.length === 0) {
      newCountries = ['ALL'];
    }
    
    form.setValue('countries', newCountries);
  };

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
    handleCancel,
    toggleCountry,
    isLoading: bulkScrapeMutation.isPending,
  };
}