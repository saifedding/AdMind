import { z } from 'zod';

// Competitor form validation schema
export const competitorFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  page_id: z.string().min(1, 'Page ID is required').max(50, 'Page ID must be less than 50 characters'),
  is_active: z.boolean().default(true),
  category_id: z.number().nullable().optional(),
});

// Scrape configuration schema
export const scrapeConfigSchema = z.object({
  countries: z.array(z.string()).min(1, 'At least one country is required'),
  max_pages: z.number().min(1).max(100).default(10),
  delay_between_requests: z.number().min(1).max(10).default(2),
  active_status: z.enum(['active', 'inactive', 'all']).default('all'),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  min_duration_days: z.number().min(1).optional(),
});

// Bulk scrape request schema
export const bulkScrapeSchema = z.object({
  competitor_ids: z.array(z.number()).min(1, 'At least one competitor is required'),
  countries: z.array(z.string()).min(1, 'At least one country is required'),
  max_pages: z.number().min(1).max(100).default(10),
  delay_between_requests: z.number().min(1).max(10).default(2),
  active_status: z.enum(['active', 'inactive', 'all']).default('all'),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  min_duration_days: z.number().min(1).optional(),
});

// Type exports
export type CompetitorFormData = z.infer<typeof competitorFormSchema>;
export type ScrapeConfigData = z.infer<typeof scrapeConfigSchema>;
export type BulkScrapeData = z.infer<typeof bulkScrapeSchema>;

// Default values
export const defaultCompetitorForm: CompetitorFormData = {
  name: '',
  page_id: '',
  is_active: true,
  category_id: null,
};

export const defaultScrapeConfig: ScrapeConfigData = {
  countries: ['AE', 'US', 'GB'],
  max_pages: 10,
  delay_between_requests: 2,
  active_status: 'all',
};

export const defaultBulkScrapeConfig: Omit<BulkScrapeData, 'competitor_ids'> = {
  countries: ['AE', 'US', 'GB'],
  max_pages: 10,
  delay_between_requests: 2,
  active_status: 'all',
};
