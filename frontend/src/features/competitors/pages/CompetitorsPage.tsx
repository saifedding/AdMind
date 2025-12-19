import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Activity, Trash, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { 
  CompetitorStats,
  CompetitorFilters,
  CompetitorTable,
  CompetitorPagination,
  CompetitorForm,
  ScrapeDialog,
  BulkScrapeDialog,
  BulkCategoryDialog,
  TaskStatusDialog,
  BulkTaskStatusDialog,
  DeleteConfirmDialog,
  ClearAdsDialog,
  ClearAllAdsDialog,
} from '../components';
import { RealTimeProgress } from '../components/RealTimeProgress';
import { DetailedScrapingLogs } from '../components/DetailedScrapingLogs';
import { useCompetitorsStore } from '../stores/competitors-store';
import { useTaskStatusQuery, useBulkTaskStatusQuery } from '../hooks/use-competitors-query';
import { useTaskPolling, useBulkTaskPolling, useTaskCompletionWatcher } from '../hooks/use-task-polling';

export function CompetitorsPage() {
  const router = useRouter();
  const {
    selectedIds,
    selectedCompetitor,
    activeTaskId,
    activeBulkTaskIds,
    setAddDialogOpen,
    setBulkScrapeDialogOpen,
    setBulkCategoryDialogOpen,
    setClearAllDialogOpen,
    setStatusDialogOpen,
    setBulkStatusDialogOpen,
  } = useCompetitorsStore();

  // Task status queries for active task banners
  const { data: taskStatus } = useTaskStatusQuery(activeTaskId, !!activeTaskId);
  const { data: bulkTaskStatus } = useBulkTaskStatusQuery(activeBulkTaskIds, activeBulkTaskIds.length > 0);
  
  // Custom polling hooks for better control
  useTaskPolling(activeTaskId, !!activeTaskId);
  useBulkTaskPolling(activeBulkTaskIds, activeBulkTaskIds.length > 0);
  
  // Watch for task completion and invalidate cache
  useTaskCompletionWatcher(taskStatus);

  const handleBulkScrape = () => {
    if (selectedIds.length === 0) {
      alert('Please select competitors to scrape');
      return;
    }
    setBulkScrapeDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8 text-photon-400" />
              Competitors
            </h1>
            <p className="text-muted-foreground">
              Manage your competitors and track their advertising performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => router.push('/tasks')}
              variant="outline"
              className="border-border bg-photon-500/10 text-photon-400 hover:bg-photon-500/20"
            >
              <Activity className="h-4 w-4 mr-2" />
              View Tasks
            </Button>
            <Button 
              onClick={() => setClearAllDialogOpen(true)}
              variant="destructive"
            >
              <Trash className="h-4 w-4 mr-2" />
              Clear ALL Ads
            </Button>
            
            <Button 
              onClick={() => setAddDialogOpen(true)} 
              className="bg-photon-500 text-photon-950 hover:bg-photon-400"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Competitor
            </Button>
          </div>
        </div>

        {/* Real-Time Progress */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RealTimeProgress 
            taskStatus={taskStatus} 
            isVisible={!!activeTaskId} 
          />
          <DetailedScrapingLogs 
            taskStatus={taskStatus} 
            isVisible={!!activeTaskId} 
          />
        </div>

        {/* Bulk Task Banner */}
        {activeBulkTaskIds.length > 0 && (
          <Card className="border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <div>
                  <div className="text-sm font-semibold">Bulk scraping ({activeBulkTaskIds.length} tasks)</div>
                  <div className="text-xs text-muted-foreground">
                    Tasks in progress...
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  className="border-border" 
                  onClick={() => setBulkStatusDialogOpen(true)}
                >
                  View Progress
                </Button>
                <Badge variant="secondary">In Progress</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics Cards */}
        <CompetitorStats />

        {/* Filters and Search */}
        <CompetitorFilters />

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-muted p-2 rounded-md mb-4 flex justify-between items-center">
            <span className="text-sm font-medium">{selectedIds.length} competitor(s) selected</span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setBulkCategoryDialogOpen(true)} 
                className="border-border"
              >
                <Users className="mr-2 h-4 w-4" />
                Assign Category
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBulkScrape} 
                className="border-photon-500 text-photon-400 hover:bg-photon-500/20"
              >
                <Download className="mr-2 h-4 w-4" />
                Scrape Selected ({selectedIds.length})
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => useCompetitorsStore.getState().setConfirmDeleteDialogOpen(true)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        {/* Competitors Table */}
        <div className="grid gap-4">
          <CompetitorTable />
        </div>

        {/* Pagination */}
        <CompetitorPagination />

        {/* All Dialogs */}
        <CompetitorForm competitor={selectedCompetitor || undefined} />
        <ScrapeDialog />
        <BulkScrapeDialog />
        <BulkCategoryDialog />
        <TaskStatusDialog />
        <BulkTaskStatusDialog />
        <DeleteConfirmDialog />
        <ClearAdsDialog />
        <ClearAllAdsDialog />
      </div>
    </DashboardLayout>
  );
}