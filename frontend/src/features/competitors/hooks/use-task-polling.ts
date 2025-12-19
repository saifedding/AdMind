import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { competitorsKeys } from './use-competitors-query';

// Hook to watch for task completion and invalidate cache
export function useTaskCompletionWatcher(taskStatus: any) {
  const queryClient = useQueryClient();
  const previousStateRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (taskStatus?.state && previousStateRef.current !== taskStatus.state) {
      if (taskStatus.state === 'SUCCESS' && previousStateRef.current === 'PROGRESS') {
        // Task just completed successfully, invalidate all competitor data
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: competitorsKeys.all });
        }, 1000);
      }
      previousStateRef.current = taskStatus.state;
    }

    // During active scraping, refresh competitor data more frequently
    if (taskStatus?.state === 'PROGRESS') {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          queryClient.invalidateQueries({ queryKey: competitorsKeys.stats() });
        }, 5000); // Refresh stats every 5 seconds during scraping
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [taskStatus?.state, queryClient]);
}

// Custom hook to manage task polling with proper cleanup
export function useTaskPolling(taskId: string | null, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!taskId || !enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start polling
    intervalRef.current = setInterval(async () => {
      try {
        const query = queryClient.getQueryCache().find({
          queryKey: competitorsKeys.task(taskId)
        });
        
        const data = query?.state.data as any;
        
        // Stop polling if task is completed
        if (data?.state === 'SUCCESS' || data?.state === 'FAILURE') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          
          // Invalidate competitor data when task completes
          if (data?.state === 'SUCCESS') {
            // Add a small delay to ensure backend has updated the data
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['competitors'] });
            }, 2000);
          }
          return;
        }

        // Refetch the query
        await queryClient.invalidateQueries({
          queryKey: competitorsKeys.task(taskId)
        });
      } catch (error) {
        console.error('Task polling error:', error);
      }
    }, 1000); // Poll every 1 second for real-time updates

    // Cleanup on unmount or dependency change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [taskId, enabled, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}

// Custom hook to manage bulk task polling with proper cleanup
export function useBulkTaskPolling(taskIds: string[], enabled: boolean = true) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (taskIds.length === 0 || !enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start polling
    intervalRef.current = setInterval(async () => {
      try {
        const query = queryClient.getQueryCache().find({
          queryKey: competitorsKeys.bulkTasks(taskIds)
        });
        
        const data = query?.state.data as any;
        
        // Stop polling if all tasks are completed
        if (data?.summary?.overall_status === 'completed' || data?.summary?.overall_status === 'failed') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }

        // Refetch the query
        await queryClient.invalidateQueries({
          queryKey: competitorsKeys.bulkTasks(taskIds)
        });
      } catch (error) {
        console.error('Bulk task polling error:', error);
      }
    }, 3000);

    // Cleanup on unmount or dependency change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [taskIds, enabled, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}