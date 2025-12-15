'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Edit2, Trash2, Eye, Download, AlertCircle, CheckCircle, XCircle, Users, Settings, Globe, Clock, Activity, MoreVertical, ChevronDown, ChevronUp, Eraser, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/dashboard';
import { 
  getCompetitors, 
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
  type Competitor, 
  type CompetitorStats,
  type CompetitorCreate,
  type CompetitorUpdate,
  type PaginatedCompetitors,
  type CompetitorScrapeRequest,
  type BulkScrapeRequest,
  type BulkTaskResponse,
  type BulkScrapingStatus
} from '@/lib/api';
import { adsApi } from '@/lib/api';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RefreshCw } from 'lucide-react';

interface CompetitorFormData {
  name: string;
  page_id: string;
  is_active: boolean;
}

interface ScrapeConfig {
  countries: string[];
  max_pages: number;
  delay_between_requests: number;
  active_status: 'active' | 'inactive' | 'all';
  date_from?: string;
  date_to?: string;
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

export default function CompetitorsPage() {
  const router = useRouter();
  const [competitors, setCompetitors] = useState<PaginatedCompetitors>({
    data: [],
    total: 0,
    page: 1,
    page_size: 20,
    total_pages: 0,
    has_next: false,
    has_previous: false
  });
  
  const [stats, setStats] = useState<CompetitorStats>({
    total_competitors: 0,
    active_competitors: 0,
    inactive_competitors: 0,
    competitors_with_ads: 0,
    total_ads_across_competitors: 0,
    avg_ads_per_competitor: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  
  // Form state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [formData, setFormData] = useState<CompetitorFormData>({
    name: '',
    page_id: '',
    is_active: true
  });
  const [formLoading, setFormLoading] = useState(false);

  const [showScrapeDialog, setShowScrapeDialog] = useState(false);
  const [scrapeConfig, setScrapeConfig] = useState<ScrapeConfig>({
    countries: ['AE', 'US', 'GB'],  // Multiple countries for better results
    max_pages: 10,
    delay_between_requests: 2,
    active_status: 'all',  // Include all ads (active and inactive)
  });
  const [scrapingCompetitor, setScrapingCompetitor] = useState<Competitor | null>(null);
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearingCompetitor, setClearingCompetitor] = useState<Competitor | null>(null);
  const [clearLoading, setClearLoading] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [clearAllLoading, setClearAllLoading] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [taskStatus, setTaskStatus] = useState<any>(null);
  
  // Bulk scraping state
  const [showBulkScrapeDialog, setShowBulkScrapeDialog] = useState(false);
  const [bulkScrapeConfig, setBulkScrapeConfig] = useState<ScrapeConfig>({
    countries: ['AE', 'US', 'GB'],
    max_pages: 10,
    delay_between_requests: 2,
    active_status: 'all',
  });
  const [bulkScrapeLoading, setBulkScrapeLoading] = useState(false);
  const [activeBulkTaskIds, setActiveBulkTaskIds] = useState<string[]>([]);
  const [showBulkStatusDialog, setShowBulkStatusDialog] = useState(false);
  const [bulkTaskStatus, setBulkTaskStatus] = useState<BulkScrapingStatus | null>(null);

  const visibleCompetitorIds = useMemo(() => competitors.data.map(c => c.id), [competitors.data]);
  const isAllVisibleSelected = useMemo(() => selectedIds.length > 0 && visibleCompetitorIds.every(id => selectedIds.includes(id)), [selectedIds, visibleCompetitorIds]);

  // Load data
  useEffect(() => {
    loadData();
  }, [currentPage, pageSize, searchTerm, statusFilter, sortBy, sortOrder]);

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

  // Bulk scraping status polling
  useEffect(() => {
    let timer: any;
    const pollBulk = async () => {
      if (!activeBulkTaskIds.length) return;
      try {
        const status = await getBulkScrapingStatus(activeBulkTaskIds);
        setBulkTaskStatus(status);
        if (status.summary.overall_status === 'completed' || status.summary.overall_status === 'failed') {
          clearInterval(timer);
        }
      } catch (error) {
        console.error('Error polling bulk status:', error);
      }
    };
    if (activeBulkTaskIds.length > 0) {
      pollBulk();
      timer = setInterval(pollBulk, 3000); // Poll every 3 seconds for bulk tasks
    }
    return () => { if (timer) clearInterval(timer); };
  }, [activeBulkTaskIds]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [competitorsData, statsData] = await Promise.all([
        getCompetitors({
          page: currentPage,
          page_size: pageSize,
          is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
          search: searchTerm || undefined,
          sort_by: sortBy,
          sort_order: sortOrder
        }),
        getCompetitorStats()
      ]);
      
      setCompetitors(competitorsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      
      const competitorData: CompetitorCreate = {
        name: formData.name,
        page_id: formData.page_id,
        is_active: formData.is_active
      };
      
      await createCompetitor(competitorData);
      setIsAddDialogOpen(false);
      setFormData({ name: '', page_id: '', is_active: true });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create competitor');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompetitor) return;
    
    try {
      setFormLoading(true);
      
      const updateData: CompetitorUpdate = {
        name: formData.name,
        page_id: formData.page_id,
        is_active: formData.is_active
      };
      
      await updateCompetitor(selectedCompetitor.id, updateData);
      setIsEditDialogOpen(false);
      setSelectedCompetitor(null);
      setFormData({ name: '', page_id: '', is_active: true });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update competitor');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCompetitor = async (competitor: Competitor) => {
    setSelectedIds([competitor.id]);
    setIsConfirmDialogOpen(true);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      const result = await bulkDeleteCompetitors(selectedIds);
      alert(`${result.message} Soft-deleted: ${result.soft_deleted_count}, Hard-deleted: ${result.hard_deleted_count}.`);
      setSelectedIds([]);
      
      // Adjust current page if it becomes empty
      const remainingItems = competitors.total - selectedIds.length;
      const totalPagesAfterDelete = Math.ceil(remainingItems / pageSize);
      
      if (currentPage > totalPagesAfterDelete && totalPagesAfterDelete > 0) {
        setCurrentPage(totalPagesAfterDelete);
      } else {
        loadData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete competitors');
    } finally {
      setIsConfirmDialogOpen(false);
    }
  };

  const handleScrape = async (competitor: Competitor) => {
    try {
      setScrapingCompetitor(competitor);
      setShowScrapeDialog(true);
    } catch (err) {
      alert(`Failed to open scraping dialog: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleClearAds = (competitor: Competitor) => {
    setClearingCompetitor(competitor);
    setShowClearDialog(true);
  };

  const performClearAds = async () => {
    if (!clearingCompetitor) return;
    try {
      setClearLoading(true);
      const result = await clearCompetitorAds(clearingCompetitor.id);
      alert(`${result.message}`);
      setShowClearDialog(false);
      setClearingCompetitor(null);
      loadData();
    } catch (err) {
      alert(`Failed to clear ads: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setClearLoading(false);
    }
  };

  const openClearAllDialog = () => {
    setShowClearAllDialog(true);
  };

  const performClearAllAds = async () => {
    try {
      setClearAllLoading(true);
      const result = await adsApi.deleteAllAds();
      alert(`${result.message}\nDeleted: ${result.deleted_count}`);
      setShowClearAllDialog(false);
      loadData();
    } catch (err) {
      alert(`Failed to clear all ads: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setClearAllLoading(false);
    }
  };

  const startScrape = async () => {
    if (!scrapingCompetitor) return;
    
    try {
      setScrapeLoading(true);
      
      const payload: CompetitorScrapeRequest = {
        countries: scrapeConfig.countries,
        max_pages: scrapeConfig.max_pages,
        delay_between_requests: scrapeConfig.delay_between_requests,
        active_status: scrapeConfig.active_status,
        date_from: scrapeConfig.date_from,
        date_to: scrapeConfig.date_to,
        min_duration_days: scrapeConfig.min_duration_days,
      };
      
      const result = await scrapeCompetitorAds(scrapingCompetitor.id, payload);
      
      // Store task in localStorage for tracking
      const taskItem = {
        id: result.task_id,
        competitor_name: scrapingCompetitor.name,
        competitor_page_id: scrapingCompetitor.page_id,
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
      setScrapingCompetitor(null);
      
      // Reload data after a short delay
      setTimeout(() => {
        loadData();
      }, 3000);
    } catch (err) {
      alert(`Failed to start scraping: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setScrapeLoading(false);
    }
  };

  const toggleCountry = (country: string) => {
    setScrapeConfig(prev => {
      let countries = [...prev.countries];
      if (country === 'ALL') {
        // If selecting ALL, replace any existing selection with just 'ALL'
        countries = countries.includes('ALL') ? [] : ['ALL'];
      } else {
        // Selecting specific country while ALL is selected should clear ALL
        countries = countries.filter(c => c !== 'ALL');
        if (countries.includes(country)) {
          countries = countries.filter(c => c !== country);
        } else {
          countries.push(country);
        }
      }
      // Ensure at least one country is selected; default to ALL if none
      if (countries.length === 0) {
        countries = ['ALL'];
      }
      return { ...prev, countries };
    });
  };

  const toggleBulkCountry = (country: string) => {
    setBulkScrapeConfig(prev => {
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

  const handleBulkScrape = () => {
    if (selectedIds.length === 0) {
      alert('Please select competitors to scrape');
      return;
    }
    setShowBulkScrapeDialog(true);
  };

  const startBulkScrape = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      setBulkScrapeLoading(true);
      
      const payload: BulkScrapeRequest = {
        competitor_ids: selectedIds,
        countries: bulkScrapeConfig.countries,
        max_pages: bulkScrapeConfig.max_pages,
        delay_between_requests: bulkScrapeConfig.delay_between_requests,
        active_status: bulkScrapeConfig.active_status,
        date_from: bulkScrapeConfig.date_from,
        date_to: bulkScrapeConfig.date_to,
        min_duration_days: bulkScrapeConfig.min_duration_days,
      };
      
      const result: BulkTaskResponse = await bulkScrapeCompetitors(payload);
      
      // Store bulk task in localStorage for tracking
      const bulkTaskItem = {
        id: `bulk_${Date.now()}`,
        task_ids: result.task_ids,
        competitor_ids: selectedIds,
        competitor_names: competitors.data
          .filter(c => selectedIds.includes(c.id))
          .map(c => c.name),
        status: {
          successful_starts: result.successful_starts,
          failed_starts: result.failed_starts,
          message: result.message,
          details: result.details
        },
        created_at: new Date().toISOString(),
        config: bulkScrapeConfig,
      };
      
      // Get existing bulk tasks from localStorage
      const existingBulkTasks = localStorage.getItem('bulkScrapingTasks');
      const bulkTasks = existingBulkTasks ? JSON.parse(existingBulkTasks) : [];
      
      // Add new bulk task to the beginning of the array
      bulkTasks.unshift(bulkTaskItem);
      
      // Keep only the last 20 bulk tasks
      if (bulkTasks.length > 20) {
        bulkTasks.splice(20);
      }
      
      // Save back to localStorage
      localStorage.setItem('bulkScrapingTasks', JSON.stringify(bulkTasks));
      
      setActiveBulkTaskIds(result.task_ids);
      setShowBulkStatusDialog(true);
      
      setShowBulkScrapeDialog(false);
      setSelectedIds([]); // Clear selection after starting bulk scrape
      
      alert(`Bulk scraping started: ${result.successful_starts} tasks started, ${result.failed_starts} failed`);
      
      // Reload data after a short delay
      setTimeout(() => {
        loadData();
      }, 3000);
    } catch (err) {
      alert(`Failed to start bulk scraping: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setBulkScrapeLoading(false);
    }
  };

  const handleViewCompetitor = (competitor: Competitor) => {
    router.push(`/competitors/${competitor.id}`);
  };

  const openEditDialog = (competitor: Competitor) => {
    setSelectedCompetitor(competitor);
    setFormData({
      name: competitor.name,
      page_id: competitor.page_id,
      is_active: competitor.is_active
    });
    setIsEditDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const resetForm = () => {
    setFormData({ name: '', page_id: '', is_active: true });
    setSelectedCompetitor(null);
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds(prev => 
      checked ? [...prev, id] : prev.filter(i => i !== id)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allVisibleIds = competitors.data.map(c => c.id);
      setSelectedIds(prev => [...new Set([...prev, ...allVisibleIds])]);
    } else {
      const allVisibleIds = competitors.data.map(c => c.id);
      setSelectedIds(prev => prev.filter(id => !allVisibleIds.includes(id)));
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

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
              onClick={openClearAllDialog}
              variant="destructive"
            >
              <Trash className="h-4 w-4 mr-2" />
              Clear ALL Ads
            </Button>
            
            <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }} className="bg-photon-500 text-photon-950 hover:bg-photon-400">
              <Plus className="h-4 w-4 mr-2" />
              Add Competitor
            </Button>
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

        {activeBulkTaskIds.length > 0 && (
          <Card className="border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className={`h-4 w-4 ${bulkTaskStatus?.summary.overall_status === 'completed' ? '' : 'animate-spin'}`} />
                <div>
                  <div className="text-sm font-semibold">Bulk scraping ({activeBulkTaskIds.length} tasks)</div>
                  <div className="text-xs text-muted-foreground">
                    {bulkTaskStatus ? (
                      `${bulkTaskStatus.summary.success} completed, ${bulkTaskStatus.summary.progress + bulkTaskStatus.summary.pending} in progress, ${bulkTaskStatus.summary.failure} failed`
                    ) : 'Starting...'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="border-border" onClick={() => setShowBulkStatusDialog(true)}>View Progress</Button>
                {bulkTaskStatus?.summary.overall_status === 'completed' && (
                  <Badge variant="default" className="bg-green-500/20 text-green-400">All Completed</Badge>
                )}
                {bulkTaskStatus?.summary.overall_status === 'failed' && (
                  <Badge variant="destructive">All Failed</Badge>
                )}
                {bulkTaskStatus?.summary.overall_status === 'mixed' && (
                  <Badge variant="secondary">Mixed Results</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="bg-red-900/20 border-red-500">
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-red-300">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_competitors}</div>
              <p className="text-xs text-photon-400">Competitors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{stats.active_competitors}</div>
              <p className="text-xs text-muted-foreground">Currently Tracking</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{stats.inactive_competitors}</div>
              <p className="text-xs text-muted-foreground">Paused</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">With Ads</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-photon-400">{stats.competitors_with_ads}</div>
              <p className="text-xs text-muted-foreground">Have Data</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Ads</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_ads_across_competitors}</div>
              <p className="text-xs text-muted-foreground">Collected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Ads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avg_ads_per_competitor.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Per Competitor</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search competitors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
            <SelectTrigger className="w-48 bg-card border-border">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Competitors</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48 bg-card border-border">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Date Created</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="updated_at">Last Updated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Competitors List */}
        <div className="grid gap-4">
          {selectedIds.length > 0 && (
            <div className="bg-muted p-2 rounded-md mb-4 flex justify-between items-center">
              <span className="text-sm font-medium">{selectedIds.length} competitor(s) selected</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleBulkScrape} className="border-photon-500 text-photon-400 hover:bg-photon-500/20">
                  <Download className="mr-2 h-4 w-4" />
                  Scrape Selected ({selectedIds.length})
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setIsConfirmDialogOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 w-10 text-left">
                    <Checkbox
                      checked={isAllVisibleSelected}
                      onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="p-2 text-left font-semibold">Name</th>
                  <th className="p-2 text-left font-semibold">Page ID</th>
                  <th className="p-2 text-left font-semibold">Status</th>
                  <th className="p-2 text-left font-semibold">Ads</th>
                  <th className="p-2 text-left font-semibold">Last Updated</th>
                  <th className="p-2 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center p-4">Loading...</td></tr>
                ) : error ? (
                  <tr><td colSpan={7} className="text-center p-4 text-red-500">{error}</td></tr>
                ) : competitors.data.length === 0 ? (
                  <tr><td colSpan={7} className="text-center p-4">No competitors found.</td></tr>
                ) : (
                  competitors.data.map(c => (
                    <tr key={c.id} className="border-b">
                       <td className="p-2">
                        <Checkbox
                          checked={selectedIds.includes(c.id)}
                          onCheckedChange={(checked) => handleSelectOne(c.id, Boolean(checked))}
                          aria-label={`Select ${c.name}`}
                        />
                      </td>
                      <td className="p-2 font-medium">{c.name}</td>
                      <td className="p-2 text-muted-foreground">{c.page_id}</td>
                      <td className="p-2">
                        <Badge variant={c.is_active ? 'default' : 'secondary'}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-2">{c.ads_count}</td>
                      <td className="p-2 text-muted-foreground">{formatDate(c.updated_at)}</td>
                      <td className="p-2 flex items-center space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewCompetitor(c)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(c)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleScrape(c)}><Download className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleClearAds(c)}><Eraser className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteCompetitor(c)}><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {competitors.total_pages > 1 && (
          <div className="flex items-center justify-between gap-2 pt-6">
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page</span>
                <Select
                    value={`${pageSize}`}
                    onValueChange={(value) => {
                        setPageSize(Number(value));
                        setCurrentPage(1);
                    }}
                >
                    <SelectTrigger className="w-24 bg-card border-border">
                        <SelectValue placeholder={pageSize} />
                    </SelectTrigger>
                    <SelectContent>
                        {[20, 50, 100, 500, 1000].map(size => (
                            <SelectItem key={size} value={`${size}`}>{size}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center justify-center gap-2">
                <Button
                    variant="outline"
                    disabled={!competitors.has_previous}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="border-border"
                >
                    Previous
                </Button>
                
                <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {competitors.total_pages}
                </span>
                
                <Button
                    variant="outline"
                    disabled={!competitors.has_next}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="border-border"
                >
                    Next
                </Button>
            </div>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedCompetitor(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditDialogOpen ? 'Edit Competitor' : 'Add New Competitor'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={isEditDialogOpen ? handleUpdateCompetitor : handleCreateCompetitor} className="space-y-4">
              <div>
                <Label htmlFor="name">Competitor Name</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData(f => ({...f, name: e.target.value}))} required />
              </div>
              <div>
                <Label htmlFor="page_id">Facebook Page ID</Label>
                <Input id="page_id" value={formData.page_id} onChange={(e) => setFormData(f => ({...f, page_id: e.target.value}))} required />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData(f => ({...f, is_active: Boolean(checked)}))} />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => { setIsAddDialogOpen(false); setIsEditDialogOpen(false); }}>Cancel</Button>
                <Button type="submit" disabled={formLoading}>{formLoading ? 'Saving...' : 'Save'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Scrape Dialog */}
        <Dialog open={showScrapeDialog} onOpenChange={setShowScrapeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Scrape Ads for {scrapingCompetitor?.name}</DialogTitle>
              <DialogDescription>
                Configure scraping parameters for this competitor.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                  <Label>Countries</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                      {COUNTRY_OPTIONS.map(country => (
                          <div key={country.value} className="flex items-center space-x-2">
                              <Checkbox
                                  id={`country-${country.value}`}
                                  checked={scrapeConfig.countries.includes(country.value)}
                                  onCheckedChange={() => toggleCountry(country.value)}
                              />
                              <Label htmlFor={`country-${country.value}`}>{country.label}</Label>
                          </div>
                      ))}
                  </div>
              </div>
              <div>
                <Label htmlFor="max_pages">Max Pages to Scrape</Label>
                <Input 
                  id="max_pages" 
                  type="number" 
                  value={scrapeConfig.max_pages} 
                  onChange={(e) => setScrapeConfig(s => ({...s, max_pages: parseInt(e.target.value, 10) || 1}))} 
                />
              </div>
               <div>
                <Label htmlFor="delay">Delay Between Requests (seconds)</Label>
                <Input 
                  id="delay" 
                  type="number" 
                  value={scrapeConfig.delay_between_requests} 
                  onChange={(e) => setScrapeConfig(s => ({...s, delay_between_requests: parseInt(e.target.value, 10) || 1}))}
                />
              </div>
              <div>
                <Label htmlFor="status">Ad Status</Label>
                <Select value={scrapeConfig.active_status} onValueChange={(v)=> setScrapeConfig(s=>({...s, active_status: v as 'active' | 'inactive' | 'all'}))}>
                  <SelectTrigger id="status" className="bg-card border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="min_days">Minimum Days Running</Label>
                <Input 
                  id="min_days" 
                  type="number" 
                  min={1}
                  placeholder="e.g., 15 (optional)"
                  value={scrapeConfig.min_duration_days ?? ''} 
                  onChange={(e) => setScrapeConfig(s => ({...s, min_duration_days: e.target.value ? parseInt(e.target.value, 10) : undefined}))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Only scrape ads that have been running for at least this many days. Leave empty to include all ads.
                </p>
              </div>
              <div>
                <Label>Date Range</Label>
                <div className="flex gap-2">
                  <Input type="date" value={scrapeConfig.date_from || ''} onChange={(e)=> setScrapeConfig(s=>({...s, date_from: e.target.value}))} className="bg-card border-border flex-1" />
                  <span className="self-center">-</span>
                  <Input type="date" value={scrapeConfig.date_to || ''} onChange={(e)=> setScrapeConfig(s=>({...s, date_to: e.target.value}))} className="bg-card border-border flex-1" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowScrapeDialog(false)}>Cancel</Button>
              <Button onClick={startScrape} disabled={scrapeLoading}>{scrapeLoading ? 'Starting...' : 'Start Scraping'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Confirmation Dialog */}
        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you absolutely sure?</DialogTitle>
              <DialogDescription>
                This action will delete {selectedIds.length} competitor(s). This may be a soft or hard delete depending on whether they have associated ads. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleBulkDelete}>Yes, delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Clear Ads Confirmation Dialog */}
        <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear ads for {clearingCompetitor?.name}</DialogTitle>
              <DialogDescription>
                This will permanently delete all ads associated with this competitor.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowClearDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={performClearAds} disabled={clearLoading}>{clearLoading ? 'Clearing...' : 'Clear Ads'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Clear ALL Ads Confirmation Dialog */}
        <Dialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear ALL ads for ALL competitors</DialogTitle>
              <DialogDescription>
                This will permanently delete every ad in the database across all competitors. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowClearAllDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={performClearAllAds} disabled={clearAllLoading}>{clearAllLoading ? 'Clearing...' : 'Clear ALL Ads'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

        {/* Bulk Scrape Dialog */}
        <Dialog open={showBulkScrapeDialog} onOpenChange={setShowBulkScrapeDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Bulk Scrape Competitors ({selectedIds.length} selected)</DialogTitle>
              <DialogDescription>
                Configure scraping parameters for all selected competitors. Each competitor will be scraped with the same settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                  <Label>Countries</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                      {COUNTRY_OPTIONS.map(country => (
                          <div key={country.value} className="flex items-center space-x-2">
                              <Checkbox
                                  id={`bulk-country-${country.value}`}
                                  checked={bulkScrapeConfig.countries.includes(country.value)}
                                  onCheckedChange={() => toggleBulkCountry(country.value)}
                              />
                              <Label htmlFor={`bulk-country-${country.value}`}>{country.label}</Label>
                          </div>
                      ))}
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bulk_max_pages">Max Pages per Competitor</Label>
                  <Input 
                    id="bulk_max_pages" 
                    type="number" 
                    value={bulkScrapeConfig.max_pages} 
                    onChange={(e) => setBulkScrapeConfig(s => ({...s, max_pages: parseInt(e.target.value, 10) || 1}))} 
                  />
                </div>
                <div>
                  <Label htmlFor="bulk_delay">Delay Between Requests (seconds)</Label>
                  <Input 
                    id="bulk_delay" 
                    type="number" 
                    value={bulkScrapeConfig.delay_between_requests} 
                    onChange={(e) => setBulkScrapeConfig(s => ({...s, delay_between_requests: parseInt(e.target.value, 10) || 1}))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="bulk_status">Ad Status</Label>
                <Select value={bulkScrapeConfig.active_status} onValueChange={(v)=> setBulkScrapeConfig(s=>({...s, active_status: v as 'active' | 'inactive' | 'all'}))}>
                  <SelectTrigger id="bulk_status" className="bg-card border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bulk_min_days">Minimum Days Running</Label>
                <Input 
                  id="bulk_min_days" 
                  type="number" 
                  min={1}
                  placeholder="e.g., 15 (optional)"
                  value={bulkScrapeConfig.min_duration_days ?? ''} 
                  onChange={(e) => setBulkScrapeConfig(s => ({...s, min_duration_days: e.target.value ? parseInt(e.target.value, 10) : undefined}))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Only scrape ads that have been running for at least this many days. Leave empty to include all ads.
                </p>
              </div>
              <div>
                <Label>Date Range (Optional)</Label>
                <div className="flex gap-2">
                  <Input type="date" value={bulkScrapeConfig.date_from || ''} onChange={(e)=> setBulkScrapeConfig(s=>({...s, date_from: e.target.value}))} className="bg-card border-border flex-1" />
                  <span className="self-center">-</span>
                  <Input type="date" value={bulkScrapeConfig.date_to || ''} onChange={(e)=> setBulkScrapeConfig(s=>({...s, date_to: e.target.value}))} className="bg-card border-border flex-1" />
                </div>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-2">Selected Competitors:</p>
                <div className="text-xs text-muted-foreground">
                  {competitors.data
                    .filter(c => selectedIds.includes(c.id))
                    .map(c => c.name)
                    .join(', ')}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkScrapeDialog(false)}>Cancel</Button>
              <Button onClick={startBulkScrape} disabled={bulkScrapeLoading} className="bg-photon-500 text-photon-950 hover:bg-photon-400">
                {bulkScrapeLoading ? 'Starting...' : `Start Bulk Scraping (${selectedIds.length})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Status Dialog */}
        <Dialog open={showBulkStatusDialog} onOpenChange={setShowBulkStatusDialog}>
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
                        {bulkTaskStatus.tasks.map((task, index) => (
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkStatusDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
} 
