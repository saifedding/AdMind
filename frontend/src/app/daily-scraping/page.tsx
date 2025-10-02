"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Clock, 
  Play, 
  Pause, 
  Settings, 
  Calendar, 
  Timer, 
  Target,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Info,
  Globe,
  Activity
} from "lucide-react";

interface DailyScrapingConfig {
  enabled: boolean;
  schedule_time: string; // HH:MM format
  countries: string[];
  max_pages_per_competitor: number;
  delay_between_requests: number;
  hours_lookback: number;
  active_status: string;
  selected_competitors: number[]; // Empty array means all competitors
}

interface TaskStatus {
  task_id: string;
  state: string;
  result?: any;
  info?: any;
  error?: string;
}

interface CompetitorSummary {
  total_active_competitors: number;
  competitors: Array<{
    id: number;
    name: string;
    page_id: string;
    latest_ad_date: string | null;
    created_at: string;
    updated_at: string;
  }>;
}

const COUNTRY_OPTIONS = [
  { value: "ALL", label: "🌍 All Countries" },  // Special value for all countries
  { value: "AE", label: "UAE 🇦🇪" },
  { value: "US", label: "United States 🇺🇸" },
  { value: "GB", label: "United Kingdom 🇬🇧" },
  { value: "SA", label: "Saudi Arabia 🇸🇦" },
  { value: "EG", label: "Egypt 🇪🇬" },
  { value: "DE", label: "Germany 🇩🇪" },
  { value: "FR", label: "France 🇫🇷" },
  { value: "CA", label: "Canada 🇨🇦" },
  { value: "AU", label: "Australia 🇦🇺" },
];

const ACTIVE_STATUS_OPTIONS = [
  { value: "active", label: "Active Only" },
  { value: "inactive", label: "Inactive Only" },
  { value: "all", label: "All Ads" },
];

export default function DailyScrapingPage() {
  const [config, setConfig] = useState<DailyScrapingConfig>({
    enabled: false,
    schedule_time: "02:00",
    countries: ["AE", "US", "GB"],  // Changed UK to GB
    max_pages_per_competitor: 10,  // Increased to match competitors page
    delay_between_requests: 2,
    hours_lookback: 24,
    active_status: "all",  // Changed to 'all' to match working config
    selected_competitors: [] // Empty means all
  });

  const [currentTask, setCurrentTask] = useState<TaskStatus | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load saved configuration from localStorage on mount
  useEffect(() => {
    loadSavedConfiguration();
    fetchCompetitors();
  }, []);

  // Poll task status if there's an active task
  useEffect(() => {
    if (currentTask && !["SUCCESS", "FAILURE", "REVOKED"].includes(currentTask.state)) {
      const interval = setInterval(() => {
        fetchTaskStatus(currentTask.task_id);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentTask]);

  const loadSavedConfiguration = () => {
    try {
      const savedConfig = localStorage.getItem('dailyScrapingConfig');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
        console.log('Loaded saved configuration:', parsed);
      }
    } catch (error) {
      console.error('Failed to load saved configuration:', error);
    }
  };

  const fetchCompetitors = async () => {
    try {
      const response = await fetch("/api/v1/scraping/active-competitors");
      if (response.ok) {
        const data = await response.json();
        setCompetitors(data);
      }
    } catch (error) {
      console.error("Failed to fetch competitors:", error);
    }
  };

  const fetchTaskStatus = async (taskId: string) => {
    try {
      const response = await fetch(`/api/v1/scraping/tasks/${taskId}/status`);
      if (response.ok) {
        const data = await response.json();
        setCurrentTask(data);
      }
    } catch (error) {
      console.error("Failed to fetch task status:", error);
    }
  };

  const startDailyScraping = async () => {
    setIsLoading(true);
    try {
      // Determine which endpoint to use based on competitor selection
      const endpoint = config.selected_competitors.length === 0
        ? "/api/v1/scraping/daily/start"
        : "/api/v1/scraping/competitors/scrape";

      const payload = config.selected_competitors.length === 0
        ? {
            countries: config.countries,
            max_pages_per_competitor: config.max_pages_per_competitor,
            delay_between_requests: config.delay_between_requests,
            hours_lookback: config.hours_lookback,
            active_status: config.active_status
          }
        : {
            competitor_ids: config.selected_competitors,
            countries: config.countries,
            max_pages_per_competitor: config.max_pages_per_competitor,
            delay_between_requests: config.delay_between_requests,
            active_status: config.active_status
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentTask({
          task_id: data.task_id,
          state: "PENDING"
        });
        
        // Save task to localStorage for tasks page
        saveTaskToLocalStorage(data.task_id);
      } else {
        const error = await response.json();
        alert(`Failed to start scraping: ${error.detail}`);
      }
    } catch (error) {
      alert(`Error starting scraping: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTaskToLocalStorage = (taskId: string) => {
    try {
      // Determine competitor details based on selection
      let competitorName = "Multiple Competitors";
      let competitorPageId = "N/A";
      
      if (config.selected_competitors.length === 1 && competitors) {
        const selectedCompetitor = competitors.competitors.find(
          c => c.id === config.selected_competitors[0]
        );
        if (selectedCompetitor) {
          competitorName = selectedCompetitor.name;
          competitorPageId = selectedCompetitor.page_id;
        }
      } else if (config.selected_competitors.length === 0 && competitors) {
        competitorName = `All Competitors (${competitors.total_active_competitors})`;
        competitorPageId = "All";
      } else if (config.selected_competitors.length > 1) {
        competitorName = `${config.selected_competitors.length} Competitors`;
        competitorPageId = "Multiple";
      }

      const newTask = {
        id: taskId,
        competitor_name: competitorName,
        competitor_page_id: competitorPageId,
        status: {
          task_id: taskId,
          state: "PENDING" as const,
          status: "Task started from Daily Scraping page"
        },
        created_at: new Date().toISOString(),
        config: {
          countries: config.countries,
          max_pages: config.max_pages_per_competitor,
          delay_between_requests: config.delay_between_requests
        }
      };

      // Get existing tasks from localStorage
      const existingTasks = localStorage.getItem('scrapingTasks');
      const tasks = existingTasks ? JSON.parse(existingTasks) : [];
      
      // Add new task to the beginning of the array
      tasks.unshift(newTask);
      
      // Save back to localStorage
      localStorage.setItem('scrapingTasks', JSON.stringify(tasks));
    } catch (error) {
      console.error('Failed to save task to localStorage:', error);
    }
  };

  const saveConfiguration = async () => {
    setIsSaving(true);
    try {
      // Save configuration to localStorage
      localStorage.setItem('dailyScrapingConfig', JSON.stringify(config));
      
      // Simulate a small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Configuration saved:', config);
      alert("Configuration saved successfully! Your settings will be remembered.");
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert(`Error saving configuration: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to default values? This will clear your saved configuration.')) {
      const defaultConfig: DailyScrapingConfig = {
        enabled: false,
        schedule_time: "02:00",
        countries: ["AE", "US", "GB"],
        max_pages_per_competitor: 10,
        delay_between_requests: 2,
        hours_lookback: 24,
        active_status: "all",
        selected_competitors: []
      };
      
      setConfig(defaultConfig);
      localStorage.removeItem('dailyScrapingConfig');
      console.log('Configuration reset to defaults');
      alert('Configuration has been reset to default values.');
    }
  };

  const cancelTask = async () => {
    if (!currentTask?.task_id) return;
    
    try {
      const response = await fetch(`/api/v1/scraping/tasks/${currentTask.task_id}/cancel`, {
        method: "DELETE"
      });
      
      if (response.ok) {
        setCurrentTask(null);
      }
    } catch (error) {
      console.error("Failed to cancel task:", error);
    }
  };

  const handleCountryChange = (country: string, checked: boolean) => {
    setConfig(prev => {
      let countries = [...prev.countries];
      
      if (country === 'ALL') {
        // If selecting ALL, replace with just ['ALL']
        countries = checked ? ['ALL'] : [];
      } else {
        // If selecting specific country, remove 'ALL' if present
        countries = countries.filter(c => c !== 'ALL');
        
        if (checked) {
          countries.push(country);
        } else {
          countries = countries.filter(c => c !== country);
        }
      }
      
      return { ...prev, countries };
    });
  };

  const handleSelectAllCountries = () => {
    setConfig(prev => ({
      ...prev,
      countries: ['ALL']  // Just set to 'ALL' instead of all individual countries
    }));
  };

  const handleDeselectAllCountries = () => {
    setConfig(prev => ({
      ...prev,
      countries: []
    }));
  };

  const handleCompetitorToggle = (competitorId: number, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      selected_competitors: checked
        ? [...prev.selected_competitors, competitorId]
        : prev.selected_competitors.filter(id => id !== competitorId)
    }));
  };

  const handleSelectAllCompetitors = () => {
    if (competitors) {
      setConfig(prev => ({
        ...prev,
        selected_competitors: competitors.competitors.map(c => c.id)
      }));
    }
  };

  const handleDeselectAllCompetitors = () => {
    setConfig(prev => ({
      ...prev,
      selected_competitors: []
    }));
  };

  const getTaskStatusIcon = (state: string) => {
    switch (state) {
      case "SUCCESS":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "FAILURE":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "PENDING":
        return <Timer className="h-5 w-5 text-yellow-500" />;
      case "STARTED":
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatLastAdDate = (dateString: string | null) => {
    if (!dateString) return "No ads yet";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold">Daily Scraping Control</h1>
            <p className="text-muted-foreground">
              Configure and manage automated daily ads scraping from your competitors
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={fetchCompetitors}
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button 
              onClick={startDailyScraping}
              disabled={isLoading || !competitors?.total_active_competitors}
            >
              <Play className="mr-2 h-4 w-4" />
              Start Manual Scraping
            </Button>
          </div>
        </div>

        {/* Current Task Status */}
        {currentTask && (
          <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                {getTaskStatusIcon(currentTask.state)}
                Current Task Status
              </CardTitle>
              <CardDescription>
                Task ID: {currentTask.task_id}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">State: {currentTask.state}</p>
                  {currentTask.result && (
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Competitors Processed:</span>
                        <span className="ml-2 font-medium">{currentTask.result.competitors_processed}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">New Ads Found:</span>
                        <span className="ml-2 font-medium">{currentTask.result.total_new_ads}</span>
                      </div>
                    </div>
                  )}
                  {currentTask.error && (
                    <p className="text-sm text-red-500 mt-2">{currentTask.error}</p>
                  )}
                </div>
                {!["SUCCESS", "FAILURE", "REVOKED"].includes(currentTask.state) && (
                  <Button variant="outline" size="sm" onClick={cancelTask}>
                    <Pause className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Scheduling Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule Configuration
              </CardTitle>
              <CardDescription>
                Configure when and how often to run daily scraping
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Enable Daily Scraping</Label>
                  <div className="text-xs text-muted-foreground">
                    Automatically run scraping daily at scheduled time
                  </div>
                </div>
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(enabled) => setConfig(prev => ({ ...prev, enabled }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-time">Daily Schedule Time</Label>
                <Input
                  id="schedule-time"
                  type="time"
                  value={config.schedule_time}
                  onChange={(e) => setConfig(prev => ({ ...prev, schedule_time: e.target.value }))}
                  disabled={!config.enabled}
                />
                <p className="text-xs text-muted-foreground">
                  Time when daily scraping should run (24-hour format)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hours-lookback">Hours Lookback</Label>
                <Input
                  id="hours-lookback"
                  type="number"
                  min="1"
                  max="168"
                  value={config.hours_lookback}
                  onChange={(e) => setConfig(prev => ({ ...prev, hours_lookback: parseInt(e.target.value) }))}
                />
                <p className="text-xs text-muted-foreground">
                  How many hours back to look for new ads (default: 24)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Scraping Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Scraping Parameters
              </CardTitle>
              <CardDescription>
                Configure how the scraping process behaves
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="max-pages">Max Pages per Competitor</Label>
                <Input
                  id="max-pages"
                  type="number"
                  min="1"
                  max="10"
                  value={config.max_pages_per_competitor}
                  onChange={(e) => setConfig(prev => ({ ...prev, max_pages_per_competitor: parseInt(e.target.value) }))}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of pages to scrape per competitor
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delay">Delay Between Requests (seconds)</Label>
                <Input
                  id="delay"
                  type="number"
                  min="1"
                  max="10"
                  value={config.delay_between_requests}
                  onChange={(e) => setConfig(prev => ({ ...prev, delay_between_requests: parseInt(e.target.value) }))}
                />
                <p className="text-xs text-muted-foreground">
                  Delay between requests to avoid rate limiting
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="active-status">Ad Status Filter</Label>
                <Select 
                  value={config.active_status} 
                  onValueChange={(value) => setConfig(prev => ({ ...prev, active_status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVE_STATUS_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Filter ads by their active status
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Countries Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Target Countries
                </CardTitle>
                <CardDescription>
                  Select which countries to scrape ads from
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllCountries}
                  disabled={config.countries.includes('ALL')}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAllCountries}
                  disabled={config.countries.length === 0}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {COUNTRY_OPTIONS.map(country => (
                <div key={country.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`country-${country.value}`}
                    checked={config.countries.includes(country.value)}
                    onChange={(e) => handleCountryChange(country.value, e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <Label 
                    htmlFor={`country-${country.value}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {country.label}
                  </Label>
                </div>
              ))}
            </div>
            {config.countries.length === 0 && (
              <div className="flex items-center gap-2 mt-4 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">Please select at least one country</p>
              </div>
            )}
            <div className="mt-4 text-sm text-muted-foreground">
              {config.countries.includes('ALL') ? (
                <span className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  All countries will be scraped
                </span>
              ) : (
                `${config.countries.length} of ${COUNTRY_OPTIONS.length - 1} countries selected`
              )}
            </div>
          </CardContent>
        </Card>

        {/* Competitor Selection */}
        {competitors && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Competitor Selection
                  </CardTitle>
                  <CardDescription>
                    Choose which competitors to scrape (leave empty for all)
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllCompetitors}
                    disabled={config.selected_competitors.length === competitors.competitors.length}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAllCompetitors}
                    disabled={config.selected_competitors.length === 0}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {competitors.total_active_competitors === 0 ? (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">
                    No active competitors found. Please add some competitors first.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {competitors.competitors.map(competitor => (
                      <div 
                        key={competitor.id} 
                        className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                          config.selected_competitors.includes(competitor.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:bg-gray-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            id={`competitor-${competitor.id}`}
                            checked={config.selected_competitors.includes(competitor.id)}
                            onChange={(e) => handleCompetitorToggle(competitor.id, e.target.checked)}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                          <Label
                            htmlFor={`competitor-${competitor.id}`}
                            className="cursor-pointer flex-1"
                          >
                            <div>
                              <p className="font-medium">{competitor.name}</p>
                              <p className="text-xs text-muted-foreground">Page ID: {competitor.page_id}</p>
                            </div>
                          </Label>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            Latest: {formatLastAdDate(competitor.latest_ad_date)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {config.selected_competitors.length === 0 ? (
                        <span className="flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          All {competitors.total_active_competitors} competitors will be scraped
                        </span>
                      ) : (
                        `${config.selected_competitors.length} of ${competitors.total_active_competitors} competitors selected`
                      )}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Save Configuration */}
        <div className="flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={resetToDefaults}
            className="text-red-400 hover:text-red-300 border-red-500/20 hover:border-red-500/40"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
          
          <div className="flex space-x-4">
            <Button variant="outline" onClick={loadSavedConfiguration}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload Saved
            </Button>
            <Button 
              onClick={saveConfiguration}
              disabled={isSaving || config.countries.length === 0}
              className="bg-photon-500 text-photon-950 hover:bg-photon-400"
            >
              {isSaving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>

        {/* Information Card */}
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <Info className="h-5 w-5" />
              How Daily Scraping Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>Smart Detection:</strong> Only scrapes new ads since the last scraping session</p>
              <p>• <strong>Automatic Schedule:</strong> Runs daily at your configured time</p>
              <p>• <strong>Rate Limited:</strong> Includes delays between requests to respect Facebook limits</p>
              <p>• <strong>Error Handling:</strong> Continues processing other competitors if one fails</p>
              <p>• <strong>Duplicate Prevention:</strong> Checks existing ads to avoid duplicates</p>
              <p>• <strong>Saved Settings:</strong> Your configuration is automatically saved and restored on page reload</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}