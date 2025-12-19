import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Download, RefreshCw } from 'lucide-react';
import { useBulkScrapeForm } from '../hooks/use-bulk-scrape-form';
import { useCompetitorsStore } from '../stores/competitors-store';
import { useCompetitorsQuery } from '../hooks/use-competitors-query';

const COUNTRY_OPTIONS = [
  { value: 'ALL', label: 'All Countries' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'BR', label: 'Brazil' },
  { value: 'IN', label: 'India' },
  { value: 'SG', label: 'Singapore' },
  { value: 'HK', label: 'Hong Kong' },
  { value: 'JP', label: 'Japan' },
  { value: 'KR', label: 'South Korea' },
];

interface BulkScrapeDialogProps {
  onSuccess?: (taskIds: string[]) => void;
}

export function BulkScrapeDialog({ onSuccess }: BulkScrapeDialogProps) {
  const { 
    bulkScrapeDialogOpen, 
    selectedIds, 
    setBulkScrapeDialogOpen,
    searchTerm,
    statusFilter,
    sortBy,
    sortOrder,
    currentPage,
    pageSize
  } = useCompetitorsStore();
  
  const { data: competitorsData } = useCompetitorsQuery({
    page: currentPage,
    page_size: pageSize,
    is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
    search: searchTerm || undefined,
    sort_by: sortBy,
    sort_order: sortOrder
  });

  const { form, onSubmit, handleCancel, toggleCountry, isLoading } = useBulkScrapeForm({ 
    competitorIds: selectedIds, 
    onSuccess 
  });

  const watchedValues = form.watch();
  const selectedCompetitors = competitorsData?.data.filter(c => selectedIds.includes(c.id)) || [];

  return (
    <Dialog open={bulkScrapeDialogOpen} onOpenChange={setBulkScrapeDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Scrape Competitors ({selectedIds.length} selected)</DialogTitle>
          <DialogDescription>
            Configure scraping parameters for all selected competitors. Each competitor will be scraped with the same settings.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Countries</Label>
            <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
              {COUNTRY_OPTIONS.map(country => (
                <div key={country.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`bulk-country-${country.value}`}
                    checked={watchedValues.countries?.includes(country.value) || false}
                    onCheckedChange={() => toggleCountry(country.value)}
                  />
                  <Label htmlFor={`bulk-country-${country.value}`} className="text-sm">
                    {country.label}
                  </Label>
                </div>
              ))}
            </div>
            {form.formState.errors.countries && (
              <p className="text-sm text-red-400">{form.formState.errors.countries.message}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bulk_max_pages">Max Pages per Competitor</Label>
              <Input 
                id="bulk_max_pages" 
                type="number" 
                min="1"
                max="100"
                {...form.register('max_pages', { valueAsNumber: true })}
                className="bg-card border-border"
              />
              {form.formState.errors.max_pages && (
                <p className="text-sm text-red-400">{form.formState.errors.max_pages.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk_delay">Delay Between Requests (seconds)</Label>
              <Input 
                id="bulk_delay" 
                type="number" 
                min="1"
                max="10"
                {...form.register('delay_between_requests', { valueAsNumber: true })}
                className="bg-card border-border"
              />
              {form.formState.errors.delay_between_requests && (
                <p className="text-sm text-red-400">{form.formState.errors.delay_between_requests.message}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bulk_status">Ad Status</Label>
            <Select 
              value={watchedValues.active_status} 
              onValueChange={(v) => form.setValue('active_status', v as 'active' | 'inactive' | 'all')}
            >
              <SelectTrigger id="bulk_status" className="bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bulk_min_days">Minimum Days Running</Label>
            <Input 
              id="bulk_min_days" 
              type="number" 
              min="1"
              placeholder="e.g., 15 (optional)"
              {...form.register('min_duration_days', { valueAsNumber: true })}
              className="bg-card border-border"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Only scrape ads that have been running for at least this many days. Leave empty to include all ads.
            </p>
            {form.formState.errors.min_duration_days && (
              <p className="text-sm text-red-400">{form.formState.errors.min_duration_days.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Date Range (Optional)</Label>
            <div className="flex gap-2">
              <Input 
                type="date" 
                {...form.register('date_from')}
                className="bg-card border-border flex-1" 
              />
              <span className="self-center">-</span>
              <Input 
                type="date" 
                {...form.register('date_to')}
                className="bg-card border-border flex-1" 
              />
            </div>
          </div>
          
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium mb-2">Selected Competitors:</p>
            <div className="text-xs text-muted-foreground">
              {selectedCompetitors.map(c => c.name).join(', ')}
            </div>
          </div>
          
          <DialogFooter>
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
              disabled={isLoading || selectedIds.length === 0}
              className="bg-photon-500 text-photon-950 hover:bg-photon-400"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Start Bulk Scraping ({selectedIds.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}