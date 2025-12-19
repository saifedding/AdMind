import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Settings, Globe, Clock, Eye, Download, RefreshCw } from 'lucide-react';
import { useScrapeForm } from '../hooks/use-scrape-form';
import { useCompetitorsStore } from '../stores/competitors-store';

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

interface ScrapeDialogProps {
  onSuccess?: (taskId: string) => void;
}

export function ScrapeDialog({ onSuccess }: ScrapeDialogProps) {
  const { scrapeDialogOpen, scrapingCompetitor, setScrapeDialogOpen } = useCompetitorsStore();
  const { form, onSubmit, handleCancel, toggleCountry, isLoading } = useScrapeForm({ 
    competitor: scrapingCompetitor, 
    onSuccess 
  });

  const watchedValues = form.watch();

  return (
    <Dialog open={scrapeDialogOpen} onOpenChange={setScrapeDialogOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-photon-400" />
            Scraping Configuration
          </DialogTitle>
          <DialogDescription>
            Configure the parameters for scraping Facebook ads for {scrapingCompetitor?.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Countries */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-photon-400" />
              <h3 className="text-lg font-semibold">Target Countries</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {COUNTRY_OPTIONS.map((country) => (
                <div key={country.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={country.value}
                    checked={watchedValues.countries?.includes(country.value) || false}
                    onCheckedChange={() => toggleCountry(country.value)}
                  />
                  <Label htmlFor={country.value} className="text-sm">
                    {country.label}
                  </Label>
                </div>
              ))}
            </div>
            {form.formState.errors.countries && (
              <p className="text-sm text-red-400">{form.formState.errors.countries.message}</p>
            )}
          </div>

          <Separator />

          {/* Scraping Parameters */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-photon-400" />
              <h3 className="text-lg font-semibold">Scraping Parameters</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_pages">Max Pages</Label>
                <Input
                  id="max_pages"
                  type="number"
                  min="1"
                  max="100"
                  {...form.register('max_pages', { valueAsNumber: true })}
                  className="bg-card border-border"
                />
                <p className="text-xs text-muted-foreground">Number of pages to scrape (1-100)</p>
                {form.formState.errors.max_pages && (
                  <p className="text-sm text-red-400">{form.formState.errors.max_pages.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="delay_between_requests">Delay (seconds)</Label>
                <Input
                  id="delay_between_requests"
                  type="number"
                  min="1"
                  max="10"
                  {...form.register('delay_between_requests', { valueAsNumber: true })}
                  className="bg-card border-border"
                />
                <p className="text-xs text-muted-foreground">Delay between requests (1-10 seconds)</p>
                {form.formState.errors.delay_between_requests && (
                  <p className="text-sm text-red-400">{form.formState.errors.delay_between_requests.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Active Status & Date Range */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-photon-400" />
              <h3 className="text-lg font-semibold">Ad Status & Date Range</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="active_status">Active Ads Only</Label>
                <Select
                  value={watchedValues.active_status}
                  onValueChange={(value) => form.setValue('active_status', value as 'active' | 'inactive' | 'all')}
                >
                  <SelectTrigger id="active_status" className="bg-card border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Choose which ads to scrape.</p>
              </div>
              
              <div className="space-y-2">
                <Label>Date Range</Label>
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
                <p className="text-xs text-muted-foreground">Leave blank for no date filtering.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_duration_days">Minimum Days Running</Label>
              <Input
                id="min_duration_days"
                type="number"
                min="1"
                {...form.register('min_duration_days', { valueAsNumber: true })}
                className="bg-card border-border"
                placeholder="e.g., 15 (optional)"
              />
              <p className="text-xs text-muted-foreground">Show ads that ran at least this many days.</p>
              {form.formState.errors.min_duration_days && (
                <p className="text-sm text-red-400">{form.formState.errors.min_duration_days.message}</p>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h4 className="font-semibold mb-2">Scraping Summary</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Target: {scrapingCompetitor?.name} ({scrapingCompetitor?.page_id})</p>
              <p>• Countries: {watchedValues.countries?.join(', ') || 'None selected'}</p>
              <p>• Max pages: {watchedValues.max_pages} pages</p>
              <p>• Active status: {watchedValues.active_status}</p>
              <p>• Date range: {watchedValues.date_from || 'Any'} to {watchedValues.date_to || 'Any'}</p>
              <p>• Estimated ads: ~{(watchedValues.max_pages || 0) * 30} ads</p>
              <p>• Estimated time: ~{Math.ceil(((watchedValues.max_pages || 0) * (watchedValues.delay_between_requests || 0)) / 60)} minutes</p>
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
              disabled={isLoading || !watchedValues.countries?.length}
              className="bg-photon-500 text-photon-950 hover:bg-photon-400"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Starting Scrape...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Start Scraping
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}