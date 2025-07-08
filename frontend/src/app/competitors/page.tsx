'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Edit2, Trash2, Eye, Download, AlertCircle, CheckCircle, XCircle, Users, Settings, Globe, Clock, Activity, MoreVertical, ChevronDown, ChevronUp } from 'lucide-react';
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
  type Competitor, 
  type CompetitorStats,
  type CompetitorCreate,
  type CompetitorUpdate,
  type PaginatedCompetitors,
  type CompetitorScrapeRequest 
} from '@/lib/api';
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
}

const COUNTRY_OPTIONS = [
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
    countries: ['AE'],
    max_pages: 10,
    delay_between_requests: 2,
    active_status: 'active',
  });
  const [scrapingCompetitor, setScrapingCompetitor] = useState<Competitor | null>(null);
  const [scrapeLoading, setScrapeLoading] = useState(false);

  const visibleCompetitorIds = useMemo(() => competitors.data.map(c => c.id), [competitors.data]);
  const isAllVisibleSelected = useMemo(() => selectedIds.length > 0 && visibleCompetitorIds.every(id => selectedIds.includes(id)), [selectedIds, visibleCompetitorIds]);

  // Load data
  useEffect(() => {
    loadData();
  }, [currentPage, searchTerm, statusFilter, sortBy, sortOrder]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [competitorsData, statsData] = await Promise.all([
        getCompetitors({
          page: currentPage,
          page_size: 20,
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
      loadData();
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
      
      alert(`Scraping started successfully!\n\nTask ID: ${result.task_id}\nStatus: ${result.status}\n\nThis will take a few minutes. You can check the progress in the Tasks page.`);
      
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
    setScrapeConfig(prev => ({
      ...prev,
      countries: prev.countries.includes(country)
        ? prev.countries.filter(c => c !== country)
        : [...prev.countries, country]
    }));
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
            
            <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }} className="bg-photon-500 text-photon-950 hover:bg-photon-400">
              <Plus className="h-4 w-4 mr-2" />
              Add Competitor
            </Button>
          </div>
        </div>

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
              <Button variant="destructive" size="sm" onClick={() => setIsConfirmDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
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
          <div className="flex items-center justify-center gap-2 pt-6">
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

      </div>
    </DashboardLayout>
  );
} 