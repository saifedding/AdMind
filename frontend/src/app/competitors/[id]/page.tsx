'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Users, 
  Activity, 
  Eye, 
  Download,
  Trash2,
  RefreshCw,
  Target,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import { 
  useCompetitorQuery,
  useCompetitorAdsQuery,
  useTaskStatusQuery,
  useDeleteCompetitorMutation,
} from '@/features/competitors/hooks/use-competitors-query';
import { useTaskPolling, useTaskCompletionWatcher } from '@/features/competitors/hooks/use-task-polling';
import { useCompetitorsStore } from '@/features/competitors/stores/competitors-store';
import { ScrapeDialog } from '@/features/competitors/components/ScrapeDialog';
import { TaskStatusDialog } from '@/features/competitors/components/TaskStatusDialog';
import { RealTimeProgress } from '@/features/competitors/components/RealTimeProgress';
import { DetailedScrapingLogs } from '@/features/competitors/components/DetailedScrapingLogs';
import { AdCard } from '@/features/dashboard/components/AdCard';
import { type AdWithAnalysis } from '@/types/ad';

export default function NewCompetitorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const competitorId = parseInt(params.id as string);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [adsStatus, setAdsStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [minDurationDays, setMinDurationDays] = useState<number | undefined>(undefined);

  const { 
    activeTaskId,
    setScrapingCompetitor,
    setScrapeDialogOpen,
    setStatusDialogOpen 
  } = useCompetitorsStore();

  // Queries
  const { data: competitor, isLoading, error } = useCompetitorQuery(competitorId);
  const { data: adsData, isLoading: adsLoading, refetch: refetchAds } = useCompetitorAdsQuery(
    competitorId,
    {
      page: currentPage,
      page_size: 12,
      is_active: adsStatus === 'all' ? undefined : adsStatus === 'active',
      min_duration_days: minDurationDays
    }
  );

  // Mutations
  const deleteMutation = useDeleteCompetitorMutation();

  // Task status polling
  const { data: taskStatus } = useTaskStatusQuery(activeTaskId, !!activeTaskId);
  useTaskPolling(activeTaskId, !!activeTaskId);
  useTaskCompletionWatcher(taskStatus);

  const handleScrape = (competitor: any) => {
    setScrapingCompetitor(competitor);
    setScrapeDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!competitor) return;
    
    if (confirm(`Are you sure you want to delete ${competitor.name}?`)) {
      try {
        await deleteMutation.mutateAsync(competitorId);
        router.push('/competitors');
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleApplyFilters = () => {
    refetchAds();
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-photon-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !competitor) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          
          <Card className="bg-red-900/20 border-red-500">
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-red-300">{error?.message || 'Competitor not found'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.back()} className="border-border">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Competitors
            </Button>
            
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Target className="h-8 w-8 text-photon-400" />
                {competitor.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                Competitor Analysis & Performance Insights (New Architecture)
              </p>
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
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={competitor.is_active ? "default" : "secondary"}
              className={competitor.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}
            >
              {competitor.is_active ? 'Active' : 'Inactive'}
            </Badge>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/tasks')}
              className="border-border bg-photon-500/10 text-photon-400 hover:bg-photon-500/20"
            >
              <Activity className="h-4 w-4 mr-2" />
              View Tasks
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleScrape(competitor)}
              className="border-border bg-photon-500/10 text-photon-400 hover:bg-photon-500/20"
            >
              <Download className="h-4 w-4 mr-2" />
              Configure Scrape
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDelete}
              className="border-border text-red-400 hover:text-red-300"
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Ads</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{competitor.ads_count}</div>
              <p className="text-xs text-photon-400">Collected</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Ads</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{competitor.active_ads_count}</div>
              <p className="text-xs text-muted-foreground">Currently Running</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Analyzed</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-photon-400">{competitor.analyzed_ads_count}</div>
              <p className="text-xs text-muted-foreground">With AI Analysis</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Page ID</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{competitor.page_id}</div>
              <p className="text-xs text-muted-foreground">Facebook Page</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="ads" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ads">Ads Gallery</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ads" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Ad Gallery (New Architecture)</h2>
              <div className="flex items-center gap-2">
                <Select value={adsStatus} onValueChange={(v) => setAdsStatus(v as 'all'|'active'|'inactive')}>
                  <SelectTrigger className="w-40 bg-card border-border">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Label htmlFor="min_days" className="text-sm">Min days</Label>
                  <Input 
                    id="min_days" 
                    type="number" 
                    min={1} 
                    value={minDurationDays ?? ''} 
                    onChange={(e) => setMinDurationDays(e.target.value ? parseInt(e.target.value) : undefined)} 
                    className="w-24 bg-card border-border" 
                  />
                </div>
                <Button variant="outline" onClick={handleApplyFilters} disabled={adsLoading} className="border-border">
                  <RefreshCw className={`h-4 w-4 mr-2 ${adsLoading ? 'animate-spin' : ''}`} />
                  Apply
                </Button>
              </div>
            </div>
            
            {adsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-card rounded-xl border animate-pulse h-96">
                    <div className="p-6">
                      <div className="h-4 bg-iridium-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-iridium-700 rounded w-1/2 mb-4"></div>
                      <div className="h-32 bg-iridium-700 rounded-lg mb-4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-iridium-700 rounded w-full"></div>
                        <div className="h-3 bg-iridium-700 rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : adsData?.ads.data.length === 0 ? (
              <Card className="p-12 text-center">
                <CardContent>
                  <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Ads Found</h3>
                  <p className="text-muted-foreground mb-4">
                    This competitor doesn't have any ads yet.
                  </p>
                  <Button onClick={() => handleScrape(competitor)} className="bg-photon-500 text-photon-950 hover:bg-photon-400">
                    <Download className="h-4 w-4 mr-2" />
                    Configure Scraping
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {adsData?.ads.data.map((ad: any) => {
                  const transformedAd = {
                    ...ad,
                    competitor: ad.competitor || competitor,
                    page_name: ad.page_name || competitor?.name,
                    is_analyzed: ad.is_analyzed || !!ad.analysis
                  } as AdWithAnalysis;
                  
                  return (
                    <AdCard 
                      key={ad.id} 
                      ad={transformedAd}
                      disableSetNavigation={true}
                    />
                  );
                })}
              </div>
            )}
            
            {/* Pagination */}
            {adsData && adsData.ads.total_pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <Button
                  variant="outline"
                  disabled={!adsData.ads.has_previous}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="border-border"
                >
                  Previous
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  Page {adsData.ads.page} of {adsData.ads.total_pages}
                </span>
                
                <Button
                  variant="outline"
                  disabled={!adsData.ads.has_next}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="border-border"
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-2xl font-bold">Performance Analytics</h2>
            
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Ad Performance Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Ads</span>
                      <span className="font-bold">{competitor.ads_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Active Ads</span>
                      <span className="font-bold text-green-400">{competitor.active_ads_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Analyzed</span>
                      <span className="font-bold text-photon-400">{competitor.analyzed_ads_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Success Rate</span>
                      <span className="font-bold">
                        {competitor.ads_count > 0 ? 
                          Math.round((competitor.active_ads_count / competitor.ads_count) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Last Updated</span>
                      <span className="font-bold">{formatDate(competitor.updated_at)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-bold">{formatDate(competitor.created_at)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={competitor.is_active ? "default" : "secondary"}>
                        {competitor.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="details" className="space-y-6">
            <h2 className="text-2xl font-bold">Competitor Details</h2>
            
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-lg font-semibold">{competitor.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Facebook Page ID</label>
                    <p className="text-lg font-semibold">{competitor.page_id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <Badge variant={competitor.is_active ? "default" : "secondary"}>
                        {competitor.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created Date</label>
                    <p className="text-lg font-semibold">{formatDate(competitor.created_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <ScrapeDialog />
        <TaskStatusDialog />
      </div>
    </DashboardLayout>
  );
}