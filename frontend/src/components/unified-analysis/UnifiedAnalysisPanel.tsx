"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wand2, 
  Loader2, 
  CheckCircle2, 
  RefreshCw, 
  Trash2, 
  History,
  Mic,
  FileText,
  Type,
  Target,
  TrendingUp,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { adsApi, UnifiedAnalysisRequest, UnifiedAnalysisResponse } from '@/lib/api';

interface UnifiedAnalysisPanelProps {
  adId: number;
  adSetId?: number;
  showAdSetAnalysis?: boolean;
  onAnalysisComplete?: (analysis: UnifiedAnalysisResponse) => void;
  className?: string;
}

export function UnifiedAnalysisPanel({
  adId,
  adSetId,
  showAdSetAnalysis = false,
  onAnalysisComplete,
  className
}: UnifiedAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<UnifiedAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');
  const [customInstruction, setCustomInstruction] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [generatePrompts, setGeneratePrompts] = useState(false);

  // Load existing analysis on mount
  useEffect(() => {
    loadAnalysis();
  }, [adId]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      const result = await adsApi.getUnifiedAnalysis(adId);
      setAnalysis(result);
    } catch (error: any) {
      // No analysis exists yet - this is normal
      if (error.status !== 404) {
        console.error('Error loading analysis:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const result = await adsApi.getUnifiedAnalysisHistory(adId);
      setAnalysisHistory(result.analyses || []);
    } catch (error) {
      console.error('Error loading analysis history:', error);
    }
  };

  const handleAnalyze = async (customInstr?: string, forceReanalyze = false) => {
    try {
      setAnalyzing(true);
      
      const request: UnifiedAnalysisRequest = {
        custom_instruction: customInstr,
        generate_prompts: generatePrompts,
        force_reanalyze: forceReanalyze
      };

      if (showAdSetAnalysis && adSetId) {
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
          toast.success('Analysis already exists! Loading results...');
          // Load existing analysis immediately
          await loadAnalysis();
          setAnalyzing(false);
          
          if (onAnalysisComplete && analysis) {
            onAnalysisComplete(analysis);
          }
        } else {
          toast.success(`Analysis started! Task ID: ${taskResponse.task_id}`);
          // Poll for completion
          await pollTaskCompletion(taskResponse.task_id, false);
        }
      }

      setShowCustomInput(false);
      setCustomInstruction('');

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
          
          // Reload the analysis
          await loadAnalysis();
          setAnalyzing(false);
          
          if (onAnalysisComplete && analysis) {
            onAnalysisComplete(analysis);
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

  const handleRegenerate = async () => {
    if (!customInstruction.trim()) {
      toast.error('Please provide an instruction for regeneration');
      return;
    }

    try {
      setAnalyzing(true);
      const taskResponse = await adsApi.regenerateUnifiedAnalysis(adId, customInstruction, true);
      toast.success(`Regeneration started! Task ID: ${taskResponse.task_id}`);
      
      // Poll for completion
      await pollTaskCompletion(taskResponse.task_id, false);
      
      setShowCustomInput(false);
      setCustomInstruction('');
    } catch (error: any) {
      console.error('Regeneration error:', error);
      toast.error(`Regeneration failed: ${error.message}`);
      setAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    const confirmMessage = `Are you sure you want to delete this analysis?

This will permanently remove:
• All analysis versions and history
• Generated creative prompts
• Cached analysis data
• Related video generations

This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      toast.loading('Deleting analysis and cleaning up related data...');
      await adsApi.deleteUnifiedAnalysis(adId);
      setAnalysis(null);
      setAnalysisHistory([]);
      toast.success('Analysis and all related data deleted successfully');
      
      // Notify parent component if callback provided
      if (onAnalysisComplete) {
        onAnalysisComplete({
          success: true,
          message: 'Analysis deleted',
          analysis_id: undefined,
          transcript: '',
          summary: '',
          hook_score: undefined,
          overall_score: undefined,
          target_audience: '',
          content_themes: []
        });
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete analysis: ${error.message}`);
    }
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/20">
      <div className="w-16 h-16 bg-neutral-800/50 rounded-full flex items-center justify-center mb-4">
        <Wand2 className="w-8 h-8 text-neutral-500" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-white">No Analysis Yet</h3>
      <p className="text-neutral-400 max-w-md mb-4">
        {showAdSetAnalysis 
          ? "Analyze this ad set to get AI-powered insights for all variants."
          : "Analyze this ad to get AI-powered insights, transcript, and creative recommendations."
        }
      </p>
      
      {/* Generate Prompts Option */}
      <div className="flex items-center space-x-2 mb-6">
        <Checkbox 
          id="generate-prompts" 
          checked={generatePrompts}
          onCheckedChange={(checked) => setGeneratePrompts(checked as boolean)}
          className="border-neutral-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <label 
          htmlFor="generate-prompts" 
          className="text-sm text-neutral-300 cursor-pointer"
        >
          Generate creative prompts (takes longer, costs more)
        </label>
      </div>
      
      <div className="flex gap-3">
        <Button 
          onClick={() => handleAnalyze()}
          disabled={analyzing}
          className="bg-primary hover:bg-primary/90"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              {showAdSetAnalysis ? 'Analyze Ad Set' : 'Analyze Ad'}
            </>
          )}
        </Button>
        <Button 
          variant="outline"
          onClick={() => setShowCustomInput(true)}
          className="border-neutral-700 hover:bg-neutral-800"
        >
          Custom Analysis
        </Button>
      </div>
    </div>
  );

  const renderAnalysisContent = () => {
    if (!analysis) return null;

    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start h-12 bg-neutral-900/50 border border-neutral-800 p-1 mb-6 rounded-xl">
          <TabsTrigger value="analysis" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white px-4 h-full rounded-lg">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Analysis
          </TabsTrigger>
          <TabsTrigger value="transcript" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white px-4 h-full rounded-lg">
            <Mic className="w-4 h-4 mr-2" /> Transcript
          </TabsTrigger>
          <TabsTrigger value="prompts" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white px-4 h-full rounded-lg">
            <Type className="w-4 h-4 mr-2" /> Prompts
          </TabsTrigger>
          <TabsTrigger value="insights" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white px-4 h-full rounded-lg">
            <TrendingUp className="w-4 h-4 mr-2" /> Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-6">
          {/* Summary */}
          <Card className="border-neutral-800 bg-gradient-to-br from-neutral-900/50 to-neutral-900/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <FileText className="w-5 h-5 mr-2 text-primary" />
                AI Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-300 leading-relaxed">
                {analysis.summary || "No summary available."}
              </p>
            </CardContent>
          </Card>

          {/* Scores */}
          {(analysis.hook_score || analysis.overall_score) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.hook_score && (
                <Card className="border-neutral-800 bg-neutral-900/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-neutral-400">Hook Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">{analysis.hook_score?.toFixed(1) || '0.0'}</span>
                      <span className="text-sm text-neutral-500">/ 10</span>
                    </div>
                    <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-500" 
                        style={{ width: `${(analysis.hook_score / 10) * 100}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {analysis.overall_score && (
                <Card className="border-neutral-800 bg-neutral-900/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-neutral-400">Overall Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">{analysis.overall_score?.toFixed(1) || '0.0'}</span>
                      <span className="text-sm text-neutral-500">/ 10</span>
                    </div>
                    <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div 
                        className="bg-green-500 h-full transition-all duration-500" 
                        style={{ width: `${(analysis.overall_score / 10) * 100}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Target Audience */}
          {analysis.target_audience && (
            <Card className="border-neutral-800 bg-neutral-900/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Target className="w-4 h-4 mr-2 text-blue-400" />
                  Target Audience
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-300">{analysis.target_audience}</p>
              </CardContent>
            </Card>
          )}

          {/* Content Themes */}
          {analysis.content_themes && analysis.content_themes.length > 0 && (
            <Card className="border-neutral-800 bg-neutral-900/30">
              <CardHeader>
                <CardTitle className="text-base">Content Themes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.content_themes.map((theme, index) => (
                    <Badge key={index} variant="secondary" className="bg-neutral-800 text-neutral-300">
                      {theme}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="transcript" className="space-y-4">
          <Card className="border-neutral-800 bg-neutral-900/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Mic className="w-4 h-4 mr-2 text-blue-400" />
                Audio Transcript
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.transcript ? (
                <div className="p-4 rounded-lg bg-neutral-950/50 border border-neutral-800 text-sm text-neutral-300 font-mono leading-relaxed max-h-64 overflow-y-auto">
                  {analysis.transcript}
                </div>
              ) : (
                <p className="text-neutral-500 italic">No transcript available</p>
              )}
            </CardContent>
          </Card>

          {analysis.voice_over && (
            <Card className="border-neutral-800 bg-neutral-900/30">
              <CardHeader>
                <CardTitle className="text-base">Voice Over Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-300">{analysis.voice_over}</p>
              </CardContent>
            </Card>
          )}

          {analysis.text_on_video && (
            <Card className="border-neutral-800 bg-neutral-900/30">
              <CardHeader>
                <CardTitle className="text-base">Text on Video</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-300">{analysis.text_on_video}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="prompts" className="space-y-4">
          {analysis.generation_prompts && analysis.generation_prompts.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Creative Prompts</h3>
                <Badge variant="outline" className="border-neutral-700 text-neutral-300">
                  {analysis.generation_prompts.length} prompts
                </Badge>
              </div>
              {analysis.generation_prompts.map((prompt, index) => (
                <Card key={index} className="border-neutral-800 bg-neutral-900/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-neutral-400">
                      Prompt {index + 1}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-neutral-300 text-sm leading-relaxed">{prompt}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Type className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
              <p className="text-neutral-500">No creative prompts generated</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {/* Strengths */}
          {analysis.strengths && analysis.strengths.length > 0 && (
            <Card className="border-neutral-800 bg-neutral-900/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center text-green-400">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-2 text-neutral-300">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <Card className="border-neutral-800 bg-neutral-900/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center text-yellow-400">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-neutral-300">
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Beats/Storyboard */}
          {analysis.beats && analysis.beats.length > 0 && (
            <Card className="border-neutral-800 bg-neutral-900/30">
              <CardHeader>
                <CardTitle className="text-base">Beat-by-Beat Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.beats.map((beat, index) => (
                    <div key={index} className="p-3 rounded-lg bg-neutral-950/50 border border-neutral-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs border-neutral-700">
                          Beat {index + 1}
                        </Badge>
                        {beat.start && beat.end && (
                          <span className="text-xs text-neutral-500">
                            {beat.start} - {beat.end}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-300 mb-2">{beat.summary}</p>
                      {beat.why_it_works && (
                        <p className="text-xs text-neutral-400 italic">
                          Why it works: {beat.why_it_works}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    );
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center min-h-[200px]", className)}>
        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {showAdSetAnalysis ? 'Ad Set Analysis' : 'Ad Analysis'}
          </h2>
          <p className="text-neutral-400 mt-1">
            {analysis ? 'AI-powered insights and recommendations' : 'Get AI-powered insights for this ad'}
          </p>
        </div>
        
        {analysis && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadHistory();
                setShowHistory(!showHistory);
              }}
              className="border-neutral-700 hover:bg-neutral-800"
            >
              <History className="w-4 h-4 mr-2" />
              History ({analysisHistory.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomInput(true)}
              className="border-neutral-700 hover:bg-neutral-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="border-red-700 hover:bg-red-900/20 text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Custom Instruction Input */}
      {showCustomInput && (
        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardHeader>
            <CardTitle className="text-lg">Custom Analysis</CardTitle>
            <CardDescription>
              Provide specific instructions for the AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="e.g., Focus on the emotional appeal and target audience analysis..."
              className="w-full h-24 p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder:text-neutral-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            
            {/* Generate Prompts Option */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="custom-generate-prompts" 
                checked={generatePrompts}
                onCheckedChange={(checked) => setGeneratePrompts(checked as boolean)}
                className="border-neutral-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label 
                htmlFor="custom-generate-prompts" 
                className="text-sm text-neutral-300 cursor-pointer"
              >
                Generate creative prompts (takes longer, costs more)
              </label>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => analysis ? handleRegenerate() : handleAnalyze(customInstruction)}
                disabled={analyzing || !customInstruction.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {analysis ? 'Regenerating...' : 'Analyzing...'}
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    {analysis ? 'Regenerate' : 'Analyze'}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomInstruction('');
                }}
                className="border-neutral-700 hover:bg-neutral-800"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {analysis ? renderAnalysisContent() : renderEmptyState()}
    </div>
  );
}

export default UnifiedAnalysisPanel;