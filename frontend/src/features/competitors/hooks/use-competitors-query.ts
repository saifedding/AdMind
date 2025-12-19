import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getCompetitors, 
  getCompetitor,
  getCompetitorStats,
  createCompetitor,
  updateCompetitor,
  deleteCompetitor,
  bulkDeleteCompetitors,
  scrapeCompetitorAds,
  getCompetitorAds,
  clearCompetitorAds,
  getScrapingStatus,
  bulkScrapeCompetitors,
  getBulkScrapingStatus,
  type PaginatedCompetitors,
  type CompetitorStats,
  type CompetitorDetail,
  type CompetitorCreate,
  type CompetitorUpdate,
  type CompetitorScrapeRequest,
  type BulkScrapeRequest,
  type TaskResponse,
  type BulkTaskResponse,
  type BulkScrapingStatus,
} from '@/lib/api';
import { adsApi } from '@/lib/api';
import { toast } from 'sonner';

// Query keys
export const competitorsKeys = {
  all: ['competitors'] as const,
  lists: () => [...competitorsKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...competitorsKeys.lists(), filters] as const,
  details: () => [...competitorsKeys.all, 'detail'] as const,
  detail: (id: number) => [...competitorsKeys.details(), id] as const,
  stats: () => [...competitorsKeys.all, 'stats'] as const,
  ads: (id: number) => [...competitorsKeys.detail(id), 'ads'] as const,
  adsList: (id: number, filters: Record<string, any>) => [...competitorsKeys.ads(id), filters] as const,
  tasks: () => [...competitorsKeys.all, 'tasks'] as const,
  task: (taskId: string) => [...competitorsKeys.tasks(), taskId] as const,
  bulkTasks: (taskIds: string[]) => [...competitorsKeys.tasks(), 'bulk', taskIds] as const,
};

// Competitors list query
export function useCompetitorsQuery(params: {
  page?: number;
  page_size?: number;
  is_active?: boolean;
  category_id?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}) {
  return useQuery({
    queryKey: competitorsKeys.list(params),
    queryFn: () => getCompetitors(params),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Competitor stats query
export function useCompetitorStatsQuery() {
  return useQuery({
    queryKey: competitorsKeys.stats(),
    queryFn: getCompetitorStats,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Single competitor query
export function useCompetitorQuery(id: number) {
  return useQuery({
    queryKey: competitorsKeys.detail(id),
    queryFn: () => getCompetitor(id),
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Competitor ads query
export function useCompetitorAdsQuery(
  competitorId: number,
  params: {
    page?: number;
    page_size?: number;
    is_active?: boolean;
    min_duration_days?: number;
  }
) {
  return useQuery({
    queryKey: competitorsKeys.adsList(competitorId, params),
    queryFn: () => getCompetitorAds(competitorId, params),
    enabled: !!competitorId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Task status query
export function useTaskStatusQuery(taskId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: competitorsKeys.task(taskId || ''),
    queryFn: () => getScrapingStatus(taskId!),
    enabled: !!taskId && enabled,
    staleTime: 0, // Always fresh for task status
    gcTime: 60 * 1000, // 1 minute
  });
}

// Bulk task status query - FIXED VERSION
export function useBulkTaskStatusQuery(taskIds: string[], enabled: boolean = true) {
  return useQuery({
    queryKey: competitorsKeys.bulkTasks(taskIds),
    queryFn: () => getBulkScrapingStatus(taskIds),
    enabled: false, // Temporarily disabled to fix error
    staleTime: 0,
    gcTime: 60 * 1000,
  });
}

// Create competitor mutation
export function useCreateCompetitorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CompetitorCreate) => createCompetitor(data),
    onSuccess: () => {
      // Invalidate and refetch competitors list and stats
      queryClient.invalidateQueries({ queryKey: competitorsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: competitorsKeys.stats() });
      toast.success('Competitor created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create competitor: ${error.message}`);
    },
  });
}

// Update competitor mutation
export function useUpdateCompetitorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CompetitorUpdate }) => 
      updateCompetitor(id, data),
    onSuccess: (data, variables) => {
      // Update the specific competitor in cache
      queryClient.setQueryData(competitorsKeys.detail(variables.id), data);
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: competitorsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: competitorsKeys.stats() });
      toast.success('Competitor updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update competitor: ${error.message}`);
    },
  });
}

// Delete competitor mutation
export function useDeleteCompetitorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteCompetitor(id),
    onSuccess: () => {
      // Invalidate and refetch competitors list and stats
      queryClient.invalidateQueries({ queryKey: competitorsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: competitorsKeys.stats() });
      toast.success('Competitor deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete competitor: ${error.message}`);
    },
  });
}

// Bulk delete competitors mutation
export function useBulkDeleteCompetitorsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => bulkDeleteCompetitors(ids),
    onSuccess: (result) => {
      // Invalidate and refetch competitors list and stats
      queryClient.invalidateQueries({ queryKey: competitorsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: competitorsKeys.stats() });
      toast.success(`${result.message} Soft-deleted: ${result.soft_deleted_count}, Hard-deleted: ${result.hard_deleted_count}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete competitors: ${error.message}`);
    },
  });
}

// Bulk update category mutation
export function useBulkUpdateCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ competitorIds, categoryId }: { competitorIds: number[]; categoryId: number | null }) => 
      adsApi.bulkUpdateCompetitorCategory(competitorIds, categoryId),
    onSuccess: (result: { message: string; updated_count: number; category_id: number | null; category_name: string }) => {
      // Invalidate and refetch competitors list and stats
      queryClient.invalidateQueries({ queryKey: competitorsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: competitorsKeys.stats() });
      toast.success(result.message);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });
}

// Scrape competitor ads mutation
export function useScrapeCompetitorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, config }: { id: number; config: CompetitorScrapeRequest }) => 
      scrapeCompetitorAds(id, config),
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: competitorsKeys.detail(id) });
    },
    onSuccess: (result, variables) => {
      // Store task in localStorage for tracking
      const taskItem = {
        id: result.task_id,
        competitor_id: variables.id,
        status: {
          task_id: result.task_id,
          state: 'PENDING' as const,
          status: result.status,
        },
        created_at: new Date().toISOString(),
        config: variables.config,
      };
      
      const existingTasks = localStorage.getItem('scrapingTasks');
      const tasks = existingTasks ? JSON.parse(existingTasks) : [];
      tasks.unshift(taskItem);
      
      if (tasks.length > 50) {
        tasks.splice(50);
      }
      
      localStorage.setItem('scrapingTasks', JSON.stringify(tasks));
      
      // Don't invalidate immediately - let the task polling handle it when task completes
      
      toast.success('Scraping task started successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to start scraping: ${error.message}`);
    },
  });
}

// Bulk scrape competitors mutation
export function useBulkScrapeCompetitorsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: BulkScrapeRequest) => bulkScrapeCompetitors(config),
    onSuccess: (result, variables) => {
      // Store bulk task in localStorage for tracking
      const bulkTaskItem = {
        id: `bulk_${Date.now()}`,
        task_ids: result.task_ids,
        competitor_ids: variables.competitor_ids,
        status: {
          successful_starts: result.successful_starts,
          failed_starts: result.failed_starts,
          message: result.message,
          details: result.details
        },
        created_at: new Date().toISOString(),
        config: variables,
      };
      
      const existingBulkTasks = localStorage.getItem('bulkScrapingTasks');
      const bulkTasks = existingBulkTasks ? JSON.parse(existingBulkTasks) : [];
      bulkTasks.unshift(bulkTaskItem);
      
      if (bulkTasks.length > 20) {
        bulkTasks.splice(20);
      }
      
      localStorage.setItem('bulkScrapingTasks', JSON.stringify(bulkTasks));
      
      // Invalidate data immediately
      queryClient.invalidateQueries({ queryKey: competitorsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: competitorsKeys.stats() });
      
      toast.success(`Bulk scraping started: ${result.successful_starts} tasks started, ${result.failed_starts} failed`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to start bulk scraping: ${error.message}`);
    },
  });
}

// Clear competitor ads mutation
export function useClearCompetitorAdsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => clearCompetitorAds(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: competitorsKeys.detail(id) });
      
      // Optimistically update competitor data
      queryClient.setQueryData(competitorsKeys.detail(id), (old: any) => {
        if (old) {
          return {
            ...old,
            ads_count: 0,
            active_ads_count: 0,
            analyzed_ads_count: 0,
          };
        }
        return old;
      });
    },
    onSuccess: (result, variables) => {
      // Invalidate competitor data immediately
      queryClient.invalidateQueries({ queryKey: competitorsKeys.detail(variables) });
      queryClient.invalidateQueries({ queryKey: competitorsKeys.ads(variables) });
      queryClient.invalidateQueries({ queryKey: competitorsKeys.stats() });
      queryClient.invalidateQueries({ queryKey: competitorsKeys.lists() });
      toast.success(result.message);
    },
    onError: (error: Error, variables) => {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: competitorsKeys.detail(variables) });
      toast.error(`Failed to clear ads: ${error.message}`);
    },
  });
}

// Clear all ads mutation
export function useClearAllAdsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => adsApi.deleteAllAds(),
    onSuccess: (result) => {
      // Invalidate all competitor data
      queryClient.invalidateQueries({ queryKey: competitorsKeys.all });
      toast.success(`${result.message}\nDeleted: ${result.deleted_count}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to clear all ads: ${error.message}`);
    },
  });
}