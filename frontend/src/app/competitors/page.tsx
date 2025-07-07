'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Edit2, Trash2, Eye, Download, AlertCircle, CheckCircle, XCircle, Users, Settings, Globe, Clock, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/dashboard';
import { 
  getCompetitors, 
  getCompetitorStats, 
  createCompetitor, 
  updateCompetitor, 
  deleteCompetitor,
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
  });
  const [scrapingCompetitor, setScrapingCompetitor] = useState<Competitor | null>(null);
  const [scrapeLoading, setScrapeLoading] = useState(false);

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
    if (!confirm(`Are you sure you want to delete "${competitor.name}"?`)) return;
    
    try {
      const result = await deleteCompetitor(competitor.id);
      alert(result.message);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete competitor');
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
      
      const scrapeRequest: CompetitorScrapeRequest = {
        countries: scrapeConfig.countries,
        max_pages: scrapeConfig.max_pages,
        delay_between_requests: scrapeConfig.delay_between_requests,
      };
      
      const result = await scrapeCompetitorAds(scrapingCompetitor.id, scrapeRequest);
      
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
            
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-photon-500 text-photon-950 hover:bg-photon-400">
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
              <div className="text-2xl font-bold">{stats.avg_ads_per_competitor}</div>
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
          {competitors.data.map((competitor) => (
            <Card key={competitor.id} className="bg-card border-border hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{competitor.name}</h3>
                      <Badge variant={competitor.is_active ? "default" : "secondary"} className={competitor.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                        {competitor.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>Page ID:</strong> {competitor.page_id}</p>
                      <p><strong>Ads Count:</strong> {competitor.ads_count}</p>
                      <p><strong>Created:</strong> {formatDate(competitor.created_at)}</p>
                      <p><strong>Updated:</strong> {formatDate(competitor.updated_at)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewCompetitor(competitor)}
                      className="flex items-center gap-1 border-border"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(competitor)}
                      className="flex items-center gap-1 border-border"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleScrape(competitor)}
                      className="flex items-center gap-1 border-border"
                    >
                      <Download className="h-4 w-4" />
                      Scrape
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCompetitor(competitor)}
                      className="flex items-center gap-1 border-border text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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

        {/* Add Competitor Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Competitor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCompetitor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Competitor Name
                </label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter competitor name"
                  className="bg-card border-border"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Facebook Page ID
                </label>
                <Input
                  required
                  value={formData.page_id}
                  onChange={(e) => setFormData({ ...formData, page_id: e.target.value })}
                  placeholder="Enter Facebook page ID"
                  className="bg-card border-border"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-border"
                />
                <label htmlFor="is_active" className="text-sm text-muted-foreground">
                  Active competitor
                </label>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={formLoading} className="flex-1 bg-photon-500 text-photon-950 hover:bg-photon-400">
                  {formLoading ? 'Creating...' : 'Create Competitor'}
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    resetForm();
                  }}
                  className="flex-1 border-border"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Competitor Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Competitor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateCompetitor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Competitor Name
                </label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter competitor name"
                  className="bg-card border-border"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Facebook Page ID
                </label>
                <Input
                  required
                  value={formData.page_id}
                  onChange={(e) => setFormData({ ...formData, page_id: e.target.value })}
                  placeholder="Enter Facebook page ID"
                  className="bg-card border-border"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active_edit"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-border"
                />
                <label htmlFor="is_active_edit" className="text-sm text-muted-foreground">
                  Active competitor
                </label>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={formLoading} className="flex-1 bg-photon-500 text-photon-950 hover:bg-photon-400">
                  {formLoading ? 'Updating...' : 'Update Competitor'}
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    resetForm();
                  }}
                  className="flex-1 border-border"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Scraping Dialog */}
        <Dialog open={showScrapeDialog} onOpenChange={setShowScrapeDialog}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-photon-400" />
                Scraping Configuration
              </DialogTitle>
              <DialogDescription>
                Configure scraping for {scrapingCompetitor?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Countries */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-photon-400" />
                  <h3 className="text-lg font-semibold">Target Countries</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
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
                    <p className="text-xs text-muted-foreground">Pages to scrape (1-100)</p>
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
                    <p className="text-xs text-muted-foreground">Delay between requests (1-10s)</p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Scraping Summary</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Target: {scrapingCompetitor?.name}</p>
                  <p>• Countries: {scrapeConfig.countries.join(', ')}</p>
                  <p>• Max pages: {scrapeConfig.max_pages} pages</p>
                  <p>• Estimated ads: ~{scrapeConfig.max_pages * 30} ads</p>
                  <p>• Estimated time: ~{Math.ceil((scrapeConfig.max_pages * scrapeConfig.delay_between_requests) / 60)} minutes</p>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={startScrape} 
                  disabled={scrapeLoading || scrapeConfig.countries.length === 0}
                  className="flex-1 bg-photon-500 text-photon-950 hover:bg-photon-400"
                >
                  {scrapeLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Starting...
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

      </div>
    </DashboardLayout>
  );
} 