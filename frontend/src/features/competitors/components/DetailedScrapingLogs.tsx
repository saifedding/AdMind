import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Terminal, 
  Play, 
  Pause, 
  RotateCcw, 
  Database, 
  Globe, 
  CheckCircle, 
  XCircle, 
  Clock,
  Plus,
  Edit,
  Filter,
  Search
} from 'lucide-react';

interface DetailedScrapingLogsProps {
  taskStatus: any;
  isVisible: boolean;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'DEBUG';
  category: 'SCRAPER' | 'DATABASE' | 'FILTER' | 'API' | 'TASK';
  message: string;
  details?: any;
}

export function DetailedScrapingLogs({ taskStatus, isVisible }: DetailedScrapingLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track previous values to detect changes
  const prevAdsFound = useRef(0);
  const prevNewAds = useRef(0);
  const prevUpdatedAds = useRef(0);
  const prevPage = useRef(0);
  const prevMessage = useRef('');

  // Process real backend logs from task status
  useEffect(() => {
    if (!taskStatus || !isVisible || isPaused) return;

    const addLog = (level: LogEntry['level'], category: LogEntry['category'], message: string, details?: any) => {
      const newLog: LogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          fractionalSecondDigits: 3
        }),
        level,
        category,
        message,
        details
      };
      
      setLogs(prev => [...prev, newLog].slice(-100)); // Keep last 100 logs
    };

    // Get current values from backend
    const info = taskStatus.info || {};
    const currentPage = info.current_page || 0;
    const adsFound = info.ads_found || 0;
    const newAds = info.new_ads || 0;
    const updatedAds = info.updated_ads || 0;
    const filteredAds = info.filtered_ads || 0;
    const message = info.message || '';

    // Clear logs when task starts
    if (taskStatus.state === 'PROGRESS' && info.progress === 0) {
      setLogs([]);
      addLog('INFO', 'TASK', `🚀 Starting scraping task: ${taskStatus.task_id}`);
      addLog('INFO', 'TASK', `📋 Competitor: ${info.competitor_page_id}`);
      if (info.config) {
        addLog('DEBUG', 'SCRAPER', `Countries: ${JSON.stringify(info.config.countries || [])}`);
        addLog('DEBUG', 'SCRAPER', `Max pages: ${info.config.max_pages || 'N/A'}`);
        addLog('DEBUG', 'SCRAPER', `Active status: ${info.config.active_status || 'all'}`);
      }
    }

    // Process real-time updates from backend
    if (taskStatus.state === 'PROGRESS') {
      // Log message changes (real backend messages)
      if (message && message !== prevMessage.current) {
        const level = message.includes('❌') ? 'ERROR' : 
                     message.includes('⚠️') ? 'WARNING' :
                     message.includes('✅') ? 'SUCCESS' : 'INFO';
        
        const category = message.includes('API') ? 'API' :
                        message.includes('database') || message.includes('Database') ? 'DATABASE' :
                        message.includes('page') || message.includes('Page') ? 'SCRAPER' :
                        message.includes('filter') || message.includes('Filter') ? 'FILTER' : 'TASK';
        
        addLog(level, category, message);
        prevMessage.current = message;
      }

      // Log page changes
      if (currentPage > prevPage.current && currentPage > 0) {
        addLog('INFO', 'SCRAPER', `📄 Now scraping page ${currentPage}`);
        prevPage.current = currentPage;
      }

      // Log ads found changes
      if (adsFound > prevAdsFound.current) {
        const newlyFound = adsFound - prevAdsFound.current;
        addLog('SUCCESS', 'API', `🔍 Found ${newlyFound} more ads (total: ${adsFound})`);
        prevAdsFound.current = adsFound;
      }

      // Log new ads created
      if (newAds > prevNewAds.current) {
        const newlyCreated = newAds - prevNewAds.current;
        addLog('SUCCESS', 'DATABASE', `➕ Created ${newlyCreated} new ads in database`);
        prevNewAds.current = newAds;
      }

      // Log ads updated
      if (updatedAds > prevUpdatedAds.current) {
        const newlyUpdated = updatedAds - prevUpdatedAds.current;
        addLog('INFO', 'DATABASE', `🔄 Updated ${newlyUpdated} existing ads`);
        prevUpdatedAds.current = updatedAds;
      }

      // Log filtered ads
      if (filteredAds > 0) {
        addLog('WARNING', 'FILTER', `⚠️ ${filteredAds} ads filtered by duration requirements`);
      }
    }

    // Handle completion
    if (taskStatus.state === 'SUCCESS' && taskStatus.result) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      const result = taskStatus.result;
      const dbStats = result.database_stats || {};
      
      addLog('SUCCESS', 'TASK', '🎉 Scraping completed successfully!');
      addLog('INFO', 'DATABASE', `📈 Final stats: ${dbStats.total_processed || 0} processed`);
      addLog('SUCCESS', 'DATABASE', `➕ New ads created: ${dbStats.created || 0}`);
      addLog('INFO', 'DATABASE', `🔄 Existing ads updated: ${dbStats.updated || 0}`);
      
      if (dbStats.ads_filtered_by_duration > 0) {
        addLog('WARNING', 'FILTER', `⚠️ Ads filtered by duration: ${dbStats.ads_filtered_by_duration}`);
      }
      
      addLog('INFO', 'TASK', `⏱️ Completed at: ${result.completion_time}`);
    }

    // Handle failure
    if (taskStatus.state === 'FAILURE') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      addLog('ERROR', 'TASK', '❌ Scraping task failed');
      addLog('ERROR', 'TASK', taskStatus.error || 'Unknown error occurred');
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [taskStatus, isVisible, isPaused]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isAutoScroll]);

  const clearLogs = () => {
    setLogs([]);
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'SUCCESS': return <CheckCircle className="h-3 w-3 text-green-400" />;
      case 'ERROR': return <XCircle className="h-3 w-3 text-red-400" />;
      case 'WARNING': return <XCircle className="h-3 w-3 text-yellow-400" />;
      case 'DEBUG': return <Search className="h-3 w-3 text-gray-400" />;
      default: return <Clock className="h-3 w-3 text-blue-400" />;
    }
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'SUCCESS': return 'text-green-400';
      case 'ERROR': return 'text-red-400';
      case 'WARNING': return 'text-yellow-400';
      case 'DEBUG': return 'text-gray-400';
      default: return 'text-blue-400';
    }
  };

  const getCategoryIcon = (category: LogEntry['category']) => {
    switch (category) {
      case 'DATABASE': return <Database className="h-3 w-3" />;
      case 'API': return <Globe className="h-3 w-3" />;
      case 'FILTER': return <Filter className="h-3 w-3" />;
      case 'SCRAPER': return <Search className="h-3 w-3" />;
      default: return <Terminal className="h-3 w-3" />;
    }
  };

  if (!isVisible) return null;

  return (
    <Card className="border-green-500/20 bg-green-950/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Terminal className="h-5 w-5 text-green-400" />
            Live Scraping Logs
            <Badge variant="secondary" className="text-xs">
              {logs.length} entries
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="h-7 px-2"
            >
              {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
              className="h-7 px-2"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-64 w-full border rounded-md bg-black/20" ref={scrollRef}>
          <div className="p-3 font-mono text-xs space-y-1">
            {logs.length === 0 ? (
              <div className="text-muted-foreground italic">
                Waiting for scraping to start...
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 hover:bg-muted/20 px-1 rounded">
                  <span className="text-muted-foreground shrink-0 w-12">
                    {log.timestamp}
                  </span>
                  <div className="flex items-center gap-1 shrink-0 w-16">
                    {getLevelIcon(log.level)}
                    <span className={`text-xs font-semibold ${getLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 w-20">
                    {getCategoryIcon(log.category)}
                    <span className="text-xs text-muted-foreground">
                      {log.category}
                    </span>
                  </div>
                  <span className="text-xs">
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Auto-scroll: {isAutoScroll ? 'ON' : 'OFF'}</span>
            <span>Status: {isPaused ? 'PAUSED' : 'LIVE'}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAutoScroll(!isAutoScroll)}
            className="h-6 px-2 text-xs"
          >
            {isAutoScroll ? 'Disable Auto-scroll' : 'Enable Auto-scroll'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}