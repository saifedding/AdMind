import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Download, CheckCircle, XCircle, Clock, TrendingUp, Database, Plus, Edit, Filter } from 'lucide-react';

interface RealTimeProgressProps {
  taskStatus: any;
  isVisible: boolean;
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export function RealTimeProgress({ taskStatus, isVisible }: RealTimeProgressProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');

  // Simulate real-time logs based on task status changes
  useEffect(() => {
    if (!taskStatus) return;

    const now = new Date().toLocaleTimeString();
    const newLogs: LogEntry[] = [];

    // Add logs based on task state changes
    if (taskStatus.state === 'PROGRESS') {
      const info = taskStatus.info || {};
      const currentStep = info.current_step;
      const message = info.message;
      const progress = info.progress;

      // Only add new logs if something changed
      if (message && message !== lastUpdateTime) {
        newLogs.push({
          id: `${Date.now()}-progress`,
          timestamp: now,
          type: 'info',
          message: message,
          details: { step: currentStep, progress }
        });
        setLastUpdateTime(message);
      }

      // Simulate detailed scraping logs based on progress
      if (currentStep === 'Scraping ads' && progress > 20) {
        const adsFound = info.ads_found || 0;
        if (adsFound > 0) {
          newLogs.push({
            id: `${Date.now()}-ads-found`,
            timestamp: now,
            type: 'success',
            message: `Found ${adsFound} ads so far...`,
            details: { adsFound }
          });
        }
      }
    }

    if (taskStatus.state === 'SUCCESS' && taskStatus.result) {
      const result = taskStatus.result;
      const dbStats = result.database_stats || {};
      
      newLogs.push({
        id: `${Date.now()}-complete`,
        timestamp: now,
        type: 'success',
        message: `✅ Scraping completed successfully!`,
        details: result
      });

      if (dbStats.created > 0) {
        newLogs.push({
          id: `${Date.now()}-new-ads`,
          timestamp: now,
          type: 'success',
          message: `📝 Created ${dbStats.created} new ads in database`,
          details: { created: dbStats.created }
        });
      }

      if (dbStats.updated > 0) {
        newLogs.push({
          id: `${Date.now()}-updated-ads`,
          timestamp: now,
          type: 'info',
          message: `🔄 Updated ${dbStats.updated} existing ads`,
          details: { updated: dbStats.updated }
        });
      }
    }

    if (newLogs.length > 0) {
      setLogs(prev => [...prev, ...newLogs].slice(-50)); // Keep last 50 logs
    }
  }, [taskStatus, lastUpdateTime]);

  // Clear logs when task starts
  useEffect(() => {
    if (taskStatus?.state === 'PROGRESS' && taskStatus?.info?.progress === 0) {
      setLogs([]);
    }
  }, [taskStatus?.state]);
  if (!isVisible || !taskStatus) return null;

  const isRunning = taskStatus.state === 'PROGRESS' || taskStatus.state === 'PENDING';
  const isCompleted = taskStatus.state === 'SUCCESS';
  const isFailed = taskStatus.state === 'FAILURE';

  // Extract progress data from task status
  const info = taskStatus.info || {}; // PROGRESS state data
  const result = taskStatus.result || {}; // SUCCESS state data
  
  // Get current step and progress
  const currentStep = info.current_step || 'Processing';
  const progressPercent = info.progress || 0;
  const statusMessage = info.message || taskStatus.status || '';
  
  // Real-time data from backend (NEW!)
  const currentPage = info.current_page || 0;
  const adsFound = info.ads_found || 0;
  const newAdsLive = info.new_ads || 0;
  const updatedAdsLive = info.updated_ads || 0;
  const filteredAdsLive = info.filtered_ads || 0;
  
  // Final result data (when complete)
  const totalScraped = result.total_ads_scraped || result.ads_collected || 0;
  const dbStats = result.database_stats || {};
  const newAdsFinal = dbStats.created || 0;
  const updatedAdsFinal = dbStats.updated || 0;
  const filteredAdsFinal = dbStats.ads_filtered_by_duration || 0;
  
  // Use live data during progress, final data when complete
  const displayTotalAds = isCompleted ? totalScraped : adsFound;
  const displayNewAds = isCompleted ? newAdsFinal : newAdsLive;
  const displayUpdatedAds = isCompleted ? updatedAdsFinal : updatedAdsLive;
  const displayFilteredAds = isCompleted ? filteredAdsFinal : filteredAdsLive;

  return (
    <Card className="border-photon-500/20 bg-photon-950/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {isRunning && <RefreshCw className="h-5 w-5 animate-spin text-photon-400" />}
          {isCompleted && <CheckCircle className="h-5 w-5 text-green-400" />}
          {isFailed && <XCircle className="h-5 w-5 text-red-400" />}
          Real-Time Scraping Progress
          <Badge variant={isCompleted ? "default" : isRunning ? "secondary" : "destructive"}>
            {taskStatus.state}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {(isRunning && progressPercent > 0) && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{currentStep} {currentPage > 0 && `(Page ${currentPage})`}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {/* Status Message */}
        {statusMessage && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
            <Clock className="h-4 w-4 inline mr-2" />
            {statusMessage}
          </div>
        )}

        {/* Real-time Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-400">{displayTotalAds}</div>
            <div className="text-xs text-muted-foreground">
              {isRunning ? 'Ads Found' : 'Total Scraped'}
            </div>
          </div>
          
          <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-400">{displayNewAds}</div>
            <div className="text-xs text-muted-foreground">New Ads</div>
          </div>
          
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-400">{displayUpdatedAds}</div>
            <div className="text-xs text-muted-foreground">Updated</div>
          </div>
          
          <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-400">{currentPage || displayFilteredAds}</div>
            <div className="text-xs text-muted-foreground">
              {isRunning && currentPage > 0 ? 'Current Page' : 'Filtered'}
            </div>
          </div>
        </div>

        {/* Additional Details */}
        {(isCompleted && dbStats.total_processed) && (
          <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 p-3 rounded">
            <div className="font-semibold mb-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Final Statistics
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>Total Processed: {dbStats.total_processed}</div>
              <div>New Ads Created: {dbStats.created}</div>
              <div>Existing Updated: {dbStats.updated}</div>
              <div>Success Rate: {dbStats.total_processed > 0 ? Math.round((dbStats.created + dbStats.updated) / dbStats.total_processed * 100) : 0}%</div>
            </div>
          </div>
        )}
        
        {/* Current Step Info */}
        {isRunning && (
          <div className="text-xs text-muted-foreground bg-blue-500/10 p-3 rounded">
            <div className="font-semibold mb-1 flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Current Status
            </div>
            <div>Step: {currentStep}</div>
            {progressPercent > 0 && <div>Progress: {Math.round(progressPercent)}%</div>}
            {currentPage > 0 && <div>Page: {currentPage}</div>}
          </div>
        )}

        {/* Real-Time Activity Log */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-photon-400" />
            <span className="font-semibold">Live Activity Log</span>
            {logs.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {logs.length} events
              </Badge>
            )}
          </div>
          
          <ScrollArea className="h-32 w-full border rounded-md bg-muted/20">
            <div className="p-3 space-y-2">
              {logs.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">
                  Waiting for activity...
                </div>
              ) : (
                logs.slice(-10).map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-xs">
                    <span className="text-muted-foreground font-mono">
                      {log.timestamp}
                    </span>
                    <div className="flex items-center gap-1">
                      {log.type === 'success' && <CheckCircle className="h-3 w-3 text-green-400" />}
                      {log.type === 'info' && <Clock className="h-3 w-3 text-blue-400" />}
                      {log.type === 'warning' && <XCircle className="h-3 w-3 text-yellow-400" />}
                      {log.type === 'error' && <XCircle className="h-3 w-3 text-red-400" />}
                      <span className={
                        log.type === 'success' ? 'text-green-400' :
                        log.type === 'info' ? 'text-blue-400' :
                        log.type === 'warning' ? 'text-yellow-400' :
                        'text-red-400'
                      }>
                        {log.message}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Detailed Progress Breakdown */}
        {isRunning && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded">
              <div className="flex items-center gap-1 mb-1">
                <Download className="h-3 w-3" />
                <span className="font-semibold">Scraping</span>
              </div>
              <div>Status: {currentStep}</div>
              <div>Progress: {progressPercent}%</div>
            </div>
            
            <div className="bg-green-500/10 border border-green-500/20 p-2 rounded">
              <div className="flex items-center gap-1 mb-1">
                <Plus className="h-3 w-3" />
                <span className="font-semibold">Database</span>
              </div>
              <div>Ads Found: {displayTotalAds}</div>
              <div>Processing: Live</div>
            </div>
            
            <div className="bg-purple-500/10 border border-purple-500/20 p-2 rounded">
              <div className="flex items-center gap-1 mb-1">
                <Filter className="h-3 w-3" />
                <span className="font-semibold">Filtering</span>
              </div>
              <div>Page: {currentPage || 'N/A'}</div>
              <div>Active: {isRunning ? 'Yes' : 'No'}</div>
            </div>
          </div>
        )}

        {/* Task ID */}
        <div className="text-xs text-muted-foreground">
          Task ID: <code className="bg-muted px-1 rounded">{taskStatus.task_id}</code>
        </div>
      </CardContent>
    </Card>
  );
}