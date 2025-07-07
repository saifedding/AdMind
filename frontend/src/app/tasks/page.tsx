'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  AlertCircle,
  BarChart3,
  Eye,
  Trash2,
  Download,
  Calendar,
  Target,
  Database,
  TrendingUp,
  FileText,
  Settings,
  Globe,
  Timer
} from 'lucide-react';
import { getScrapingStatus } from '@/lib/api';

interface TaskResult {
  success: boolean;
  competitor_page_id: string;
  total_ads_scraped: number;
  database_stats: {
    total_processed: number;
    created: number;
    updated: number;
    errors: number;
    competitors_created: number;
    competitors_updated: number;
  };
  completion_time: string;
  task_id: string;
}

interface TaskStatus {
  task_id: string;
  state: 'PENDING' | 'SUCCESS' | 'FAILURE' | 'PROGRESS';
  status: string;
  result?: TaskResult;
  error?: string;
  info?: any;
  started_at?: string;
  completed_at?: string;
}

interface TaskItem {
  id: string;
  competitor_name: string;
  competitor_page_id: string;
  status: TaskStatus;
  created_at: string;
  config: {
    countries: string[];
    max_pages: number;
    delay_between_requests: number;
  };
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);

  // Load tasks from localStorage and check their status
  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadTasks = async () => {
    try {
      setRefreshing(true);
      
      // Get tasks from localStorage
      const storedTasks = localStorage.getItem('scrapingTasks');
      if (!storedTasks) {
        setTasks([]);
        setLoading(false);
        return;
      }

      const taskItems: TaskItem[] = JSON.parse(storedTasks);
      
      // Update status for each task
      const updatedTasks = await Promise.all(
        taskItems.map(async (task) => {
          try {
            const statusResponse = await getScrapingStatus(task.id);
            return {
              ...task,
              status: statusResponse
            };
          } catch (err) {
            return {
              ...task,
              status: {
                ...task.status,
                state: 'FAILURE' as const,
                error: 'Failed to fetch status'
              }
            };
          }
        })
      );

      setTasks(updatedTasks);
      
      // Update localStorage with latest status
      localStorage.setItem('scrapingTasks', JSON.stringify(updatedTasks));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'SUCCESS': return 'bg-green-500/20 text-green-400';
      case 'FAILURE': return 'bg-red-500/20 text-red-400';
      case 'PROGRESS': return 'bg-yellow-500/20 text-yellow-400';
      case 'PENDING': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'SUCCESS': return <CheckCircle className="h-4 w-4" />;
      case 'FAILURE': return <XCircle className="h-4 w-4" />;
      case 'PROGRESS': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'PENDING': return <Clock className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = end.getTime() - start.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const clearTask = (taskId: string) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    setTasks(updatedTasks);
    localStorage.setItem('scrapingTasks', JSON.stringify(updatedTasks));
  };

  const clearAllTasks = () => {
    if (confirm('Are you sure you want to clear all tasks?')) {
      setTasks([]);
      localStorage.removeItem('scrapingTasks');
    }
  };

  const getTaskStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status.state === 'SUCCESS').length;
    const failed = tasks.filter(t => t.status.state === 'FAILURE').length;
    const running = tasks.filter(t => ['PENDING', 'PROGRESS'].includes(t.status.state)).length;
    
    return { total, completed, failed, running };
  };

  const openTaskDetails = (task: TaskItem) => {
    setSelectedTask(task);
    setShowTaskDetails(true);
  };

  const stats = getTaskStats();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-photon-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Activity className="h-8 w-8 text-photon-400" />
              Scraping Tasks
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor and manage your competitor data scraping tasks
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={loadTasks}
              disabled={refreshing}
              className="border-border"
            >
              {refreshing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            
            {tasks.length > 0 && (
              <Button 
                variant="outline" 
                onClick={clearAllTasks}
                className="border-border text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">Successfully finished</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Running</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-photon-400">{stats.running}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
              <p className="text-xs text-muted-foreground">Errors occurred</p>
            </CardContent>
          </Card>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="bg-red-900/20 border-red-500">
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-red-300">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tasks Content */}
        <div className="space-y-6">
          {tasks.length === 0 ? (
            <Card className="p-12 text-center">
              <CardContent>
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Tasks Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start scraping competitor ads to see tasks here.
                </p>
                <Button 
                  onClick={() => window.location.href = '/competitors'}
                  className="bg-photon-500 text-photon-950 hover:bg-photon-400"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Go to Competitors
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <Card 
                  key={task.id} 
                  className="bg-card border-border hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => openTaskDetails(task)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status.state)}
                          <Badge className={getStatusColor(task.status.state)}>
                            {task.status.state}
                          </Badge>
                        </div>
                        <div>
                          <CardTitle className="text-lg">{task.competitor_name}</CardTitle>
                          <CardDescription>
                            Page ID: {task.competitor_page_id} • Task ID: {task.id}
                          </CardDescription>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTaskDetails(task);
                          }}
                          className="border-border bg-photon-500/10 text-photon-400 hover:bg-photon-500/20"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearTask(task.id);
                          }}
                          className="border-border text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      {/* Task Configuration */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Started: {formatDate(task.created_at)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          Countries: {task.config.countries.join(', ')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          Max Pages: {task.config.max_pages}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Duration: {formatDuration(task.created_at, task.status.result?.completion_time)}
                        </div>
                      </div>
                      
                      {/* Quick Results Summary */}
                      {task.status.state === 'SUCCESS' && task.status.result && (
                        <div className="flex gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Download className="h-3 w-3 text-green-400" />
                            <span className="text-green-400">{task.status.result.total_ads_scraped} ads</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-yellow-400" />
                            <span className="text-yellow-400">{task.status.result.database_stats.updated} updated</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-blue-400" />
                            <span className="text-blue-400">{task.status.result.database_stats.created} created</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Task Details Modal */}
        <Dialog open={showTaskDetails} onOpenChange={setShowTaskDetails}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-photon-400" />
                Task Details - {selectedTask?.competitor_name}
              </DialogTitle>
              <DialogDescription>
                Complete information and results for task {selectedTask?.id}
              </DialogDescription>
            </DialogHeader>
            
            {selectedTask && (
              <div className="space-y-6">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="configuration">Configuration</TabsTrigger>
                    <TabsTrigger value="results">Results</TabsTrigger>
                    <TabsTrigger value="raw">Raw Data</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Task Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Task ID:</span>
                            <span className="font-mono text-xs">{selectedTask.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge className={getStatusColor(selectedTask.status.state)}>
                              {selectedTask.status.state}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Started:</span>
                            <span>{formatDate(selectedTask.created_at)}</span>
                          </div>
                          {selectedTask.status.result?.completion_time && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Completed:</span>
                              <span>{formatDate(selectedTask.status.result.completion_time)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Duration:</span>
                            <span>{formatDuration(selectedTask.created_at, selectedTask.status.result?.completion_time)}</span>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Competitor Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Name:</span>
                            <span className="font-medium">{selectedTask.competitor_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Page ID:</span>
                            <span className="font-mono text-xs">{selectedTask.competitor_page_id}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="bg-iridium-900/50 rounded-lg p-4">
                      <h4 className="font-medium mb-2">Current Status</h4>
                      <p className="text-sm text-muted-foreground">{selectedTask.status.status}</p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="configuration" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Scraping Configuration
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Target Countries</label>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {selectedTask.config.countries.map((country) => (
                                <Badge key={country} variant="outline" className="text-xs">
                                  {country}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Max Pages</label>
                            <p className="text-lg font-bold">{selectedTask.config.max_pages}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Delay Between Requests</label>
                            <p className="text-lg font-bold">{selectedTask.config.delay_between_requests}s</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Estimated Ads</label>
                            <p className="text-lg font-bold">~{selectedTask.config.max_pages * 30}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="results" className="space-y-4">
                    {selectedTask.status.state === 'SUCCESS' && selectedTask.status.result ? (
                      <div className="space-y-4">
                        <Card className="bg-green-900/20 border-green-500/20">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-green-400">
                              <CheckCircle className="h-5 w-5" />
                              Task Completed Successfully
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                                <div className="text-2xl font-bold text-green-400">
                                  {selectedTask.status.result.total_ads_scraped}
                                </div>
                                <div className="text-sm text-muted-foreground">Total Ads Scraped</div>
                              </div>
                              <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                                <div className="text-2xl font-bold text-blue-400">
                                  {selectedTask.status.result.database_stats.created}
                                </div>
                                <div className="text-sm text-muted-foreground">New Ads Created</div>
                              </div>
                              <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                                <div className="text-2xl font-bold text-yellow-400">
                                  {selectedTask.status.result.database_stats.updated}
                                </div>
                                <div className="text-sm text-muted-foreground">Ads Updated</div>
                              </div>
                              <div className="text-center p-4 bg-red-500/10 rounded-lg">
                                <div className="text-2xl font-bold text-red-400">
                                  {selectedTask.status.result.database_stats.errors}
                                </div>
                                <div className="text-sm text-muted-foreground">Errors</div>
                              </div>
                            </div>
                            
                            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Processed:</span>
                                <span className="font-bold">{selectedTask.status.result.database_stats.total_processed}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Competitors Updated:</span>
                                <span className="font-bold">{selectedTask.status.result.database_stats.competitors_updated}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Success Rate:</span>
                                <span className="font-bold text-green-400">
                                  {selectedTask.status.result.database_stats.total_processed > 0 
                                    ? Math.round(((selectedTask.status.result.database_stats.total_processed - selectedTask.status.result.database_stats.errors) / selectedTask.status.result.database_stats.total_processed) * 100)
                                    : 0}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Completion Time:</span>
                                <span className="font-bold">{formatDate(selectedTask.status.result.completion_time)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ) : selectedTask.status.state === 'FAILURE' ? (
                      <Card className="bg-red-900/20 border-red-500/20">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-red-400">
                            <XCircle className="h-5 w-5" />
                            Task Failed
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-red-300">{selectedTask.status.error || 'Unknown error occurred'}</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="p-6 text-center">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            {getStatusIcon(selectedTask.status.state)}
                            <span className="text-muted-foreground">
                              Task is {selectedTask.status.state.toLowerCase()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{selectedTask.status.status}</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="raw" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          Raw Task Data
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="bg-iridium-900 rounded-lg p-4 text-xs overflow-x-auto">
                          {JSON.stringify(selectedTask, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 