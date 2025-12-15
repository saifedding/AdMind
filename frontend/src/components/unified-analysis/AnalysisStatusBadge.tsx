"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Wand2, 
  Loader2, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { adsApi, UnifiedAnalysisRequest } from '@/lib/api';
import { toast } from 'sonner';

interface AnalysisStatusBadgeProps {
  adId: number;
  adSetId?: number;
  hasAnalysis?: boolean;
  showAnalyzeButton?: boolean;
  onAnalysisComplete?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AnalysisStatusBadge({
  adId,
  adSetId,
  hasAnalysis: initialHasAnalysis,
  showAnalyzeButton = true,
  onAnalysisComplete,
  className,
  size = 'sm'
}: AnalysisStatusBadgeProps) {
  const [hasAnalysis, setHasAnalysis] = useState(initialHasAnalysis);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check analysis status if not provided
  useEffect(() => {
    if (initialHasAnalysis === undefined) {
      checkAnalysisStatus();
    } else {
      setHasAnalysis(initialHasAnalysis);
    }
  }, [adId, initialHasAnalysis]);

  const checkAnalysisStatus = async () => {
    try {
      setLoading(true);
      const result = await adsApi.getAnalysisStatus([adId]);
      setHasAnalysis(result.analysis_status[adId] || false);
    } catch (error) {
      console.error('Error checking analysis status:', error);
      setHasAnalysis(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      setAnalyzing(true);
      
      const request: UnifiedAnalysisRequest = {
        generate_prompts: true,
        force_reanalyze: false
      };

      if (adSetId) {
        // Analyze entire ad set
        const taskResponse = await adsApi.unifiedAnalyzeAdSet(adSetId, request);
        toast.success(`Ad set analysis started! Task ID: ${taskResponse.task_id}`);
        
        // Poll for completion
        await pollTaskCompletion(taskResponse.task_id, true);
      } else {
        // Analyze single ad
        const taskResponse = await adsApi.unifiedAnalyzeAd(adId, request);
        
        // Check if analysis already exists (estimated_time: 0)
        if (taskResponse.estimated_time === 0) {
          toast.success('Analysis already exists!');
          setHasAnalysis(true);
          setAnalyzing(false);
          
          if (onAnalysisComplete) {
            onAnalysisComplete();
          }
        } else {
          toast.success(`Analysis started! Task ID: ${taskResponse.task_id}`);
          // Poll for completion
          await pollTaskCompletion(taskResponse.task_id, false);
        }
      }

    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(`Analysis failed: ${error.message}`);
      setAnalyzing(false);
    }
  };

  const pollTaskCompletion = async (taskId: string, isAdSet: boolean) => {
    const maxAttempts = 120; // 2 minutes with 1-second intervals
    let attempts = 0;

    const poll = async (): Promise<void> => {
      try {
        attempts++;
        const taskStatus = await adsApi.getUnifiedTaskStatus(taskId);

        if (taskStatus.state === 'SUCCESS') {
          // Task completed successfully
          toast.success(isAdSet ? 'Ad set analyzed successfully!' : 'Ad analyzed successfully!');
          setHasAnalysis(true);
          setAnalyzing(false);
          
          if (onAnalysisComplete) {
            onAnalysisComplete();
          }
          return;
        } else if (taskStatus.state === 'FAILURE') {
          // Task failed
          const errorMsg = taskStatus.error || 'Analysis task failed';
          toast.error(`Analysis failed: ${errorMsg}`);
          setAnalyzing(false);
          return;
        } else if (attempts >= maxAttempts) {
          // Timeout
          toast.error('Analysis is taking longer than expected. Please check back later.');
          setAnalyzing(false);
          return;
        }

        // Task still in progress, continue polling
        setTimeout(poll, 1000);
      } catch (error: any) {
        console.error('Error polling task status:', error);
        if (attempts >= maxAttempts) {
          toast.error('Failed to get analysis status. Please try again.');
          setAnalyzing(false);
        } else {
          // Continue polling on error
          setTimeout(poll, 1000);
        }
      }
    };

    // Start polling
    setTimeout(poll, 1000);
  };

  if (loading) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "border-neutral-700 text-neutral-400",
          size === 'sm' && "text-xs h-5 px-2",
          size === 'md' && "text-sm h-6 px-3",
          size === 'lg' && "text-base h-7 px-4",
          className
        )}
      >
        <Clock className={cn(
          "mr-1",
          size === 'sm' && "w-3 h-3",
          size === 'md' && "w-4 h-4",
          size === 'lg' && "w-4 h-4"
        )} />
        Checking...
      </Badge>
    );
  }

  if (analyzing) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "border-blue-500/50 bg-blue-500/10 text-blue-400",
          size === 'sm' && "text-xs h-5 px-2",
          size === 'md' && "text-sm h-6 px-3",
          size === 'lg' && "text-base h-7 px-4",
          className
        )}
      >
        <Loader2 className={cn(
          "mr-1 animate-spin",
          size === 'sm' && "w-3 h-3",
          size === 'md' && "w-4 h-4",
          size === 'lg' && "w-4 h-4"
        )} />
        Analyzing...
      </Badge>
    );
  }

  if (hasAnalysis) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "border-green-500/50 bg-green-500/10 text-green-400",
          size === 'sm' && "text-xs h-5 px-2",
          size === 'md' && "text-sm h-6 px-3",
          size === 'lg' && "text-base h-7 px-4",
          className
        )}
      >
        <CheckCircle2 className={cn(
          "mr-1",
          size === 'sm' && "w-3 h-3",
          size === 'md' && "w-4 h-4",
          size === 'lg' && "w-4 h-4"
        )} />
        Analyzed
      </Badge>
    );
  }

  if (showAnalyzeButton) {
    return (
      <Button
        variant="outline"
        size={size === 'md' ? 'sm' : size}
        onClick={handleAnalyze}
        className={cn(
          "border-orange-500/50 bg-orange-500/10 hover:bg-orange-500/20 hover:border-orange-400/70 text-orange-400 hover:text-orange-300 transition-all",
          size === 'sm' && "text-xs h-5 px-2",
          size === 'md' && "text-sm h-6 px-3",
          size === 'lg' && "text-base h-7 px-4",
          className
        )}
      >
        <Wand2 className={cn(
          "mr-1",
          size === 'sm' && "w-3 h-3",
          size === 'md' && "w-4 h-4",
          size === 'lg' && "w-4 h-4"
        )} />
        Analyze
      </Button>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "border-neutral-700 text-neutral-500",
        size === 'sm' && "text-xs h-5 px-2",
        size === 'md' && "text-sm h-6 px-3",
        size === 'lg' && "text-base h-7 px-4",
        className
      )}
    >
      <AlertCircle className={cn(
        "mr-1",
        size === 'sm' && "w-3 h-3",
        size === 'md' && "w-4 h-4",
        size === 'lg' && "w-4 h-4"
      )} />
      Not Analyzed
    </Badge>
  );
}

export default AnalysisStatusBadge;