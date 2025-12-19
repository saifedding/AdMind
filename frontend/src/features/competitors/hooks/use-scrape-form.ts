import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  scrapeConfigSchema, 
  type ScrapeConfigData, 
  defaultScrapeConfig 
} from '../schemas/competitor-schemas';
import { useScrapeCompetitorMutation } from './use-competitors-query';
import { useCompetitorsStore } from '../stores/competitors-store';
import type { Competitor } from '@/lib/api';

interface UseScrapeFormProps {
  competitor: Competitor | null;
  onSuccess?: (taskId: string) => void;
}

export function useScrapeForm({ competitor, onSuccess }: UseScrapeFormProps) {
  const scrapeMutation = useScrapeCompetitorMutation();
  const { setScrapeDialogOpen, setScrapingCompetitor, setActiveTaskId, setStatusDialogOpen } = useCompetitorsStore();
  
  const form = useForm<ScrapeConfigData>({
    resolver: zodResolver(scrapeConfigSchema),
    defaultValues: defaultScrapeConfig,
  });
  
  // Reset form when competitor changes
  React.useEffect(() => {
    if (competitor) {
      form.reset(defaultScrapeConfig);
    }
  }, [competitor, form]);

  const onSubmit = async (data: ScrapeConfigData) => {
    if (!competitor) return;
    
    try {
      const config = {
        countries: data.countries,
        max_pages: data.max_pages,
        delay_between_requests: data.delay_between_requests,
        active_status: data.active_status,
        date_from: data.date_from || undefined,
        date_to: data.date_to || undefined,
        min_duration_days: data.min_duration_days,
      };
      
      console.log('NEW VERSION - Scraping competitor:', competitor.name, 'with config:', config);
      
      const result = await scrapeMutation.mutateAsync({
        id: competitor.id,
        config,
      });
      
      setActiveTaskId(result.task_id);
      setStatusDialogOpen(true);
      setScrapeDialogOpen(false);
      setScrapingCompetitor(null);
      
      onSuccess?.(result.task_id);
    } catch (error) {
      // Error handling is done in the mutation hook via toast
      console.error('Scrape form submission error:', error);
    }
  };

  const handleCancel = () => {
    form.reset(defaultScrapeConfig);
    setScrapeDialogOpen(false);
    setScrapingCompetitor(null);
  };

  const toggleCountry = (country: string) => {
    const currentCountries = form.getValues('countries');
    let newCountries = [...currentCountries];
    
    if (country === 'ALL') {
      // If selecting ALL, replace any existing selection with just 'ALL'
      newCountries = newCountries.includes('ALL') ? [] : ['ALL'];
    } else {
      // Selecting specific country while ALL is selected should clear ALL
      newCountries = newCountries.filter(c => c !== 'ALL');
      if (newCountries.includes(country)) {
        newCountries = newCountries.filter(c => c !== country);
      } else {
        newCountries.push(country);
      }
    }
    
    // Ensure at least one country is selected; default to ALL if none
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
    isLoading: scrapeMutation.isPending,
  };
}