import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCompetitorsStore } from '../stores/competitors-store';
import { useTaskStatusQuery, useBulkTaskStatusQuery } from '../hooks/use-competitors-query';

export function TaskStatusDialog() {
  const { 
    statusDialogOpen, 
    activeTaskId, 
    setStatusDialogOpen 
  } = useCompetitorsStore();

  const { data: taskStatus } = useTaskStatusQuery(activeTaskId, statusDialogOpen);

  return (
    <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scrape Task Progress</DialogTitle>
          <DialogDescription>Task ID: {activeTaskId}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{taskStatus?.state || 'PENDING'}</Badge>
            <span className="text-sm text-muted-foreground">{taskStatus?.status || ''}</span>
          </div>
          {taskStatus?.result && (
            <div className="text-sm">
              <div>Total ads scraped: {taskStatus.result.total_ads_scraped ?? taskStatus.result?.database_stats?.total_processed ?? 0}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BulkTaskStatusDialog() {
  const { 
    bulkStatusDialogOpen, 
    activeBulkTaskIds, 
    setBulkStatusDialogOpen 
  } = useCompetitorsStore();

  const { data: bulkTaskStatus } = useBulkTaskStatusQuery(activeBulkTaskIds, bulkStatusDialogOpen);

  return (
    <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Bulk Scraping Progress</DialogTitle>
          <DialogDescription>
            {activeBulkTaskIds.length} tasks running
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {bulkTaskStatus && (
            <>
              <div className="grid grid-cols-5 gap-4 text-center">
                <div className="bg-muted p-3 rounded">
                  <div className="text-2xl font-bold">{bulkTaskStatus.summary.total_tasks}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="bg-blue-500/20 p-3 rounded">
                  <div className="text-2xl font-bold text-blue-400">{bulkTaskStatus.summary.pending}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
                <div className="bg-yellow-500/20 p-3 rounded">
                  <div className="text-2xl font-bold text-yellow-400">{bulkTaskStatus.summary.progress}</div>
                  <div className="text-xs text-muted-foreground">In Progress</div>
                </div>
                <div className="bg-green-500/20 p-3 rounded">
                  <div className="text-2xl font-bold text-green-400">{bulkTaskStatus.summary.success}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="bg-red-500/20 p-3 rounded">
                  <div className="text-2xl font-bold text-red-400">{bulkTaskStatus.summary.failure}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Task ID</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkTaskStatus.tasks.map((task) => (
                      <tr key={task.task_id} className="border-b">
                        <td className="p-2 font-mono text-xs">{task.task_id.substring(0, 8)}...</td>
                        <td className="p-2">
                          <Badge variant={
                            task.state === 'SUCCESS' ? 'default' : 
                            task.state === 'FAILURE' ? 'destructive' : 
                            'secondary'
                          }>
                            {task.state}
                          </Badge>
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">{task.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}