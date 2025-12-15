'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Users, 
  Activity, 
  TrendingUp, 
  Eye, 
  Download,
  Edit,
  Trash2,
  RefreshCw,
  Calendar,
  Target,
  BarChart3,
  Zap,
  AlertCircle,
  Settings,
  Globe,
  Clock,
  Filter
} from 'lucide-react';
import { 
  getCompetitor, 
  getCompetitorAds, 
  scrapeCompetitorAds,
  deleteCompetitor,
  getScrapingStatus,
  type CompetitorDetail,
  type CompetitorScrapeRequest 
} from '@/lib/api';

interface CompetitorAd {
  id: number;
  ad_copy?: string;
  main_title?: string;
  main_body_text?: string;
  media_type?: string;
  media_url?: string;
  main_image_urls?: string[];
  impressions_text?: string;
  spend?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  analysis?: {
    overall_score?: number;
    hook_score?: number;
    confidence_score?: number;
    target_audience?: string;
    content_themes?: string[];
  };
}

interface CompetitorAdsResponse {
  ads: {
    data: CompetitorAd[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

interface ScrapeConfig {
  countries: string[];
  max_pages: number;
  delay_between_requests: number;
  active_status: 'active' | 'inactive' | 'all';
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
  min_duration_days?: number;
}

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

export default function CompetitorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const competitorId = parseInt(params.id as string);
  
  const [competitor, setCompetitor] = useState<CompetitorDetail | null>(null);
  const [ads, setAds] = useState<CompetitorAdsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [adsLoading, setAdsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [adsStatus, setAdsStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [minDurationDays, setMinDurationDays] = useState<number | undefined>(undefined);
  const [showScrapeDialog, setShowScrapeDialog] = useState(false);
  const [scrapeConfig, setScrapeConfig] = useState<ScrapeConfig>({
    countries: ['ALL'],
    max_pages: 50,
    delay_between_requests: 2,
    active_status: 'active',
  });
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [taskStatus, setTaskStatus] = useState<any>(null);

  useEffect(() => {
    loadCompetitor();
    loadAds();
  }, [competitorId, currentPage]);

  useEffect(() => {
    let timer: any;
    const poll = async () => {
      if (!activeTaskId) return;
      try {
        const s = await getScrapingStatus(activeTaskId);
        setTaskStatus(s);
        if (s.state !== 'PENDING' && s.state !== 'PROGRESS') {
          clearInterval(timer);
        }
      } catch {}
    };
    if (activeTaskId) {
      poll();
      timer = setInterval(poll, 2000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [activeTaskId]);

  const loadCompetitor = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCompetitor(competitorId);
      setCompetitor(data);
    } catch (err) {
      setError(`Failed to load competitor: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAds = async () => {
    try {
      setAdsLoading(true);
      const data = await getCompetitorAds(competitorId, {
        page: currentPage,
        page_size: 12,
        is_active: adsStatus === 'all' ? undefined : adsStatus === 'active',
        min_duration_days: minDurationDays
      });
      setAds(data);
    } catch (err) {
      console.error('Failed to load ads:', err);
    } finally {
      setAdsLoading(false);
    }
  };

  const handleScrape = async () => {
    if (!competitor) return;
    
    try {
      setScrapeLoading(true);
      
      const scrapeRequest: CompetitorScrapeRequest = {
        countries: scrapeConfig.countries,
        max_pages: scrapeConfig.max_pages,
        delay_between_requests: scrapeConfig.delay_between_requests,
        active_status: scrapeConfig.active_status,
        date_from: scrapeConfig.date_from,
        date_to: scrapeConfig.date_to,
        min_duration_days: scrapeConfig.min_duration_days,
      };
      
      const result = await scrapeCompetitorAds(competitorId, scrapeRequest);
      
      // Store task in localStorage for tracking
      const taskItem = {
        id: result.task_id,
        competitor_name: competitor.name,
        competitor_page_id: competitor.page_id,
        status: {
          task_id: result.task_id,
          state: 'PENDING' as const,
          status: result.status,
        },
        created_at: new Date().toISOString(),
        config: scrapeConfig,
      };
      
      // Get existing tasks from localStorage
      const existingTasks = localStorage.getItem('scrapingTasks');
      const tasks = existingTasks ? JSON.parse(existingTasks) : [];
      
      // Add new task to the beginning of the array
      tasks.unshift(taskItem);
      
      // Keep only the last 50 tasks to prevent localStorage from growing too large
      if (tasks.length > 50) {
        tasks.splice(50);
      }
      
      // Save back to localStorage
      localStorage.setItem('scrapingTasks', JSON.stringify(tasks));
      
      setActiveTaskId(result.task_id);
      setShowStatusDialog(true);
      
      setShowScrapeDialog(false);
      
      // Reload data after a short delay
      setTimeout(() => {
        if (scrapeConfig.active_status === 'active') setAdsStatus('active');
        else if (scrapeConfig.active_status === 'inactive') setAdsStatus('inactive');
        else setAdsStatus('all');
        setMinDurationDays(scrapeConfig.min_duration_days);
        loadCompetitor();
        loadAds();
      }, 3000);
    } catch (err) {
      alert(`Failed to start scraping: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setScrapeLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!competitor) return;
    
    if (confirm(`Are you sure you want to delete ${competitor.name}?`)) {
      try {
        await deleteCompetitor(competitorId);
        router.push('/competitors');
      } catch (err) {
        alert(`Failed to delete competitor: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBadge = (score?: number) => {
    if (!score) return 'secondary';
    if (score >= 8) return 'default';
    if (score >= 6) return 'secondary';
    return 'destructive';
  };

  const toggleCountry = (country: string) => {
    setScrapeConfig(prev => {
      let countries = [...prev.countries];
      if (country === 'ALL') {
        countries = countries.includes('ALL') ? [] : ['ALL'];
      } else {
        countries = countries.filter(c => c !== 'ALL');
        if (countries.includes(country)) {
          countries = countries.filter(c => c !== country);
        } else {
          countries.push(country);
        }
      }
      if (countries.length === 0) {
        countries = ['ALL'];
      }
      return { ...prev, countries };
    });
  };

  if (loading) {
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
                <span className="text-red-300">{error || 'Competitor not found'}</span>
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
                Competitor Analysis & Performance Insights
              </p>
        </div>
      </div>

      {activeTaskId && (
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className={`h-4 w-4 ${taskStatus?.state==='SUCCESS' ? '' : 'animate-spin'}`} />
              <div>
                <div className="text-sm font-semibold">Scraping task</div>
                <div className="text-xs text-muted-foreground">{taskStatus?.state || 'PENDING'}{taskStatus?.status ? ` • ${taskStatus.status}` : ''}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="border-border" onClick={() => setShowStatusDialog(true)}>View Progress</Button>
              {taskStatus?.state==='SUCCESS' && (
                <Badge variant="default" className="bg-green-500/20 text-green-400">Completed</Badge>
              )}
              {taskStatus?.state==='FAILURE' && (
                <Badge variant="destructive">Failed</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
          
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
              onClick={() => router.push(`/competitors/${competitorId}/edit`)}
              className="border-border"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            
            <Dialog open={showScrapeDialog} onOpenChange={setShowScrapeDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-border bg-photon-500/10 text-photon-400 hover:bg-photon-500/20"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Configure Scrape
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-photon-400" />
                    Scraping Configuration
                  </DialogTitle>
                  <DialogDescription>
                    Configure the parameters for scraping Facebook ads for {competitor.name}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Countries */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-photon-400" />
                      <h3 className="text-lg font-semibold">Target Countries</h3>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                      {COUNTRY_OPTIONS.map((country) => (
                        <div key={country.value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={country.value}
                            checked={scrapeConfig.countries.includes(country.value)}
                            onChange={() => toggleCountry(country.value)}
                            className="rounded border-border"
                          />
                          <label htmlFor={country.value} className="text-sm">
                            {country.label}
                          </label>
                        </div>
                      ))}
                    </div>
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
                          value={scrapeConfig.max_pages}
                          onChange={(e) => setScrapeConfig(prev => ({ ...prev, max_pages: parseInt(e.target.value) || 10 }))}
                          className="bg-card border-border"
                        />
                        <p className="text-xs text-muted-foreground">Number of pages to scrape (1-100)</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="delay_between_requests">Delay (seconds)</Label>
                        <Input
                          id="delay_between_requests"
                          type="number"
                          min="1"
                          max="10"
                          value={scrapeConfig.delay_between_requests}
                          onChange={(e) => setScrapeConfig(prev => ({ ...prev, delay_between_requests: parseInt(e.target.value) || 2 }))}
                          className="bg-card border-border"
                        />
                        <p className="text-xs text-muted-foreground">Delay between requests (1-10 seconds)</p>
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
                  {/* Active Only Switch */}
                  <div className="space-y-2 flex flex-col">
                    <Label htmlFor="active_only">Active Ads Only</Label>
                    <Select
                      value={scrapeConfig.active_status}
                      onValueChange={(value) => setScrapeConfig(prev => ({ ...prev, active_status: value as 'active' | 'inactive' | 'all'}))}
                    >
                      <SelectTrigger id="active_only" className="bg-card border-border">
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
                  {/* Date range inputs */}
                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <div className="flex gap-2">
                      <Input type="date" value={scrapeConfig.date_from || ''} onChange={(e)=> setScrapeConfig(prev=>({...prev, date_from: e.target.value}))} className="bg-card border-border flex-1" />
                      <span className="self-center">-</span>
                      <Input type="date" value={scrapeConfig.date_to || ''} onChange={(e)=> setScrapeConfig(prev=>({...prev, date_to: e.target.value}))} className="bg-card border-border flex-1" />
                    </div>
                    <p className="text-xs text-muted-foreground">Leave blank for no date filtering.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_duration_days">Minimum Days Running</Label>
                    <Input
                      id="min_duration_days"
                      type="number"
                      min="1"
                      value={scrapeConfig.min_duration_days ?? ''}
                      onChange={(e) => setScrapeConfig(prev => ({ ...prev, min_duration_days: e.target.value ? parseInt(e.target.value) : undefined }))}
                      className="bg-card border-border"
                    />
                    <p className="text-xs text-muted-foreground">Show ads that ran at least this many days.</p>
                  </div>
                </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-card border border-border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Scraping Summary</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>• Target: {competitor.name} ({competitor.page_id})</p>
                      <p>• Countries: {scrapeConfig.countries.join(', ')}</p>
                      <p>• Max pages: {scrapeConfig.max_pages} pages</p>
                      <p>• Active status: {scrapeConfig.active_status}</p>
                      <p>• Date range: {scrapeConfig.date_from || 'Any'} to {scrapeConfig.date_to || 'Any'}</p>
                      <p>• Estimated ads: ~{scrapeConfig.max_pages * 30} ads</p>
                      <p>• Estimated time: ~{Math.ceil((scrapeConfig.max_pages * scrapeConfig.delay_between_requests) / 60)} minutes</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={handleScrape} 
                      disabled={scrapeLoading || scrapeConfig.countries.length === 0}
                      className="flex-1 bg-photon-500 text-photon-950 hover:bg-photon-400"
                    >
                      {scrapeLoading ? (
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
                    <Button 
                      variant="outline" 
                      onClick={() => setShowScrapeDialog(false)}
                      className="flex-1 border-border"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDelete}
              className="border-border text-red-400 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
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
            <h2 className="text-2xl font-bold">Ad Gallery</h2>
            <div className="flex items-center gap-2">
              <Select value={adsStatus} onValueChange={(v)=> setAdsStatus(v as 'all'|'active'|'inactive')}>
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
                <Input id="min_days" type="number" min={1} value={minDurationDays ?? ''} onChange={(e)=> setMinDurationDays(e.target.value ? parseInt(e.target.value) : undefined)} className="w-24 bg-card border-border" />
              </div>
              <Button variant="outline" onClick={loadAds} disabled={adsLoading} className="border-border">
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
            ) : ads?.ads.data.length === 0 ? (
              <Card className="p-12 text-center">
                <CardContent>
                  <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Ads Found</h3>
                  <p className="text-muted-foreground mb-4">
                    This competitor doesn't have any ads yet.
                  </p>
                  <Button onClick={() => setShowScrapeDialog(true)} className="bg-photon-500 text-photon-950 hover:bg-photon-400">
                    <Download className="h-4 w-4 mr-2" />
                    Configure Scraping
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ads?.ads.data.map((ad) => (
                  <Card key={ad.id} className="bg-card border-border hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Ad Title */}
                        <div>
                          <h3 className="font-semibold text-lg line-clamp-2">
                            {ad.main_title || ad.ad_copy || 'Untitled Ad'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(ad.created_at)}
                          </p>
                        </div>
                        
                        {/* Media */}
                        {ad.main_image_urls && ad.main_image_urls.length > 0 && (
                          <div className="aspect-video bg-iridium-800 rounded-lg flex items-center justify-center">
                            <img 
                              src={ad.main_image_urls[0]} 
                              alt="Ad creative"
                              className="max-h-full max-w-full object-contain rounded-lg"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        
                        {/* Ad Copy */}
                        {ad.main_body_text && (
                          <p className="text-sm text-foreground line-clamp-3">
                            {ad.main_body_text}
                          </p>
                        )}
                        
                        {/* Metrics */}
                        <div className="flex flex-wrap gap-2">
                          {ad.is_active && (
                            <Badge variant="default" className="bg-green-500/20 text-green-400">
                              Active
                            </Badge>
                          )}
                          {ad.analysis?.overall_score && (
                            <Badge variant={getScoreBadge(ad.analysis.overall_score)}>
                              Score: {ad.analysis.overall_score?.toFixed(1) || '0.0'}
                            </Badge>
                          )}
                          {ad.impressions_text && (
                            <Badge variant="secondary" className="bg-photon-500/20 text-photon-400">
                              {ad.impressions_text}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {ads && ads.ads.total_pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <Button
                  variant="outline"
                  disabled={!ads.ads.has_previous}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="border-border"
                >
                  Previous
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  Page {ads.ads.page} of {ads.ads.total_pages}
                </span>
                
                <Button
                  variant="outline"
                  disabled={!ads.ads.has_next}
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

        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
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
      </div>
    </DashboardLayout>
  );
} 
