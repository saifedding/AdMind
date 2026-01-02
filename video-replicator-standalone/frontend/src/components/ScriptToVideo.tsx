'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Video, Loader2, Sparkles, Copy, ChevronDown, ChevronUp,
  Languages, Wand2, Save, FolderOpen, Trash2, Clock,
  FileText, Palette, Edit3, ArrowRight, ArrowLeft, CheckCircle2, RefreshCw, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api, VideoAnalysis } from '@/lib/api';
import {
  getStoredScriptSessions,
  saveScriptSession,
  getScriptSessionById,
  deleteScriptSession,
  formatTimestamp,
  StoredScriptSession,
} from '@/lib/script-storage';

// Storyboard concept from AI
interface StoryboardConcept {
  id: string;
  style_name: string;
  style_icon: string;
  creative_concept: string;
  visual_approach: string;
  character_description?: string;
  environment_description?: string;
  mood_and_tone: string;
  scenes: StoryboardScene[];
}

interface StoryboardScene {
  scene_number: number;
  duration: string;
  dialogue: string;
  visual_description: string;
  camera: string;
  mood: string;
}

interface GeneratedPrompt {
  index: number;
  text: string;
  summary: string;
  duration: string;
  styleName: string;
}

// Workflow steps
type WorkflowStep = 'script' | 'storyboards' | 'edit' | 'prompts';

interface ScriptToVideoProps {
  aspectRatio: string;
}

export const ScriptToVideo: React.FC<ScriptToVideoProps> = ({ aspectRatio }) => {
  // Workflow state
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('script');
  
  // Step 1: Script input
  const [script, setScript] = useState('');
  const [styleReferenceUrl, setStyleReferenceUrl] = useState('');
  const [translating, setTranslating] = useState(false);
  const [includeDiacritics, setIncludeDiacritics] = useState(true);
  
  // Video analysis state (for style reference)
  const [analyzingVideo, setAnalyzingVideo] = useState(false);
  const [videoAnalysis, setVideoAnalysis] = useState<VideoAnalysis | null>(null);
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);
  const [useStyleAnalysis, setUseStyleAnalysis] = useState(false);

  // Step 2: Storyboard concepts
  const [storyboards, setStoryboards] = useState<StoryboardConcept[]>([]);
  const [selectedStoryboardIds, setSelectedStoryboardIds] = useState<Set<string>>(new Set());
  const [generatingStoryboards, setGeneratingStoryboards] = useState(false);
  
  // Step 3: Edit selected storyboards
  const [editedStoryboards, setEditedStoryboards] = useState<StoryboardConcept[]>([]);
  const [activeEditIndex, setActiveEditIndex] = useState(0);
  
  // Step 4: Final prompts
  const [promptsByStyle, setPromptsByStyle] = useState<Map<string, GeneratedPrompt[]>>(new Map());
  const [prompts, setPrompts] = useState<GeneratedPrompt[]>([]);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  
  // Session management
  const [savedSessions, setSavedSessions] = useState<StoredScriptSession[]>([]);
  const [showSavedSessions, setShowSavedSessions] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState('');
  
  // UI state
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<number>>(new Set());
  
  // Model settings
  const [geminiModel, setGeminiModel] = useState('gemini-3.0-flash');

  // Load saved sessions on mount
  useEffect(() => {
    setSavedSessions(getStoredScriptSessions());
  }, []);

  const wordCount = script.split(/\s+/).filter(Boolean).length;
  const estimatedDuration = Math.ceil(wordCount / 2.5);

  // Translate script (Arabic <-> English)
  const handleTranslateScript = async () => {
    if (!script.trim()) {
      toast.error('Please enter a script to translate');
      return;
    }

    setTranslating(true);
    try {
      const response = await api.translateScript({
        text: script.trim(),
        model: geminiModel,
        include_diacritics: includeDiacritics,
      });
      
      if (response.translated_text) {
        setScript(response.translated_text);
        toast.success(`Translated to ${response.target_language}!`);
      } else {
        throw new Error('Translation failed');
      }
    } catch (err) {
      toast.error('Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  // Analyze video from URL (for style reference)
  const handleAnalyzeVideo = async () => {
    if (!styleReferenceUrl.trim()) {
      toast.error('Please enter a video URL to analyze');
      return;
    }

    setAnalyzingVideo(true);
    setVideoAnalysis(null);
    
    try {
      const response = await api.analyzeVideoUrl({
        video_url: styleReferenceUrl.trim(),
        model: geminiModel,
        extract_transcript: true,
        analyze_style: true,
        // Skip scene breakdown for Script-to-Video to save tokens
        skip_scene_breakdown: true,
      });
      
      if (response.success && response.analysis) {
        setVideoAnalysis(response.analysis);
        setShowAnalysisDetails(true);
        toast.success('Video analyzed! Style can be used as reference.');
      } else {
        throw new Error(response.error || 'Analysis failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Video analysis failed');
    } finally {
      setAnalyzingVideo(false);
    }
  };

  // Use extracted transcript as script
  const handleUseExtractedScript = () => {
    if (videoAnalysis?.transcript) {
      setScript(videoAnalysis.transcript);
      toast.success('Script loaded from video!');
    }
  };

  // Generate creative storyboard concepts
  const handleGenerateStoryboards = async () => {
    if (!script.trim()) {
      toast.error('Please enter a script');
      return;
    }

    setGeneratingStoryboards(true);
    setError(null);
    setStoryboards([]);
    setSelectedStoryboardIds(new Set());

    try {
      const response = await api.generateStoryboards({
        script: script.trim(),
        model: geminiModel,
        aspect_ratio: aspectRatio,
        num_concepts: 3,
        style_reference_url: styleReferenceUrl.trim() || undefined,
        video_analysis: useStyleAnalysis && videoAnalysis ? videoAnalysis : undefined,
        replication_mode: false, // Always reference mode
      });

      if (response.concepts && response.concepts.length > 0) {
        setStoryboards(response.concepts);
        setCurrentStep('storyboards');
        toast.success(`Generated ${response.concepts.length} creative concepts!`);
      } else {
        throw new Error('No storyboard concepts generated');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate storyboards');
      toast.error('Storyboard generation failed');
    } finally {
      setGeneratingStoryboards(false);
    }
  };

  // Toggle storyboard selection
  const toggleStoryboardSelection = (storyboardId: string) => {
    setSelectedStoryboardIds(prev => {
      const next = new Set(prev);
      if (next.has(storyboardId)) {
        next.delete(storyboardId);
      } else {
        next.add(storyboardId);
      }
      return next;
    });
  };

  // Proceed with selected storyboards
  const handleProceedWithSelected = () => {
    if (selectedStoryboardIds.size === 0) {
      toast.error('Please select at least one concept');
      return;
    }
    
    const selected = storyboards.filter(s => selectedStoryboardIds.has(s.id));
    setEditedStoryboards(selected.map(s => ({ ...s })));
    setActiveEditIndex(0);
    setCurrentStep('edit');
  };

  // Update edited storyboard scene
  const updateEditedScene = (storyboardIndex: number, sceneIndex: number, field: keyof StoryboardScene, value: string) => {
    setEditedStoryboards(prev => {
      const updated = [...prev];
      const storyboard = { ...updated[storyboardIndex] };
      const scenes = [...storyboard.scenes];
      scenes[sceneIndex] = { ...scenes[sceneIndex], [field]: value };
      storyboard.scenes = scenes;
      updated[storyboardIndex] = storyboard;
      return updated;
    });
  };

  // Update storyboard field
  const updateEditedStoryboard = (storyboardIndex: number, field: keyof StoryboardConcept, value: string) => {
    setEditedStoryboards(prev => {
      const updated = [...prev];
      updated[storyboardIndex] = { ...updated[storyboardIndex], [field]: value };
      return updated;
    });
  };

  // Generate final prompts from all edited storyboards
  const handleGeneratePrompts = async () => {
    if (editedStoryboards.length === 0) {
      toast.error('No storyboards selected');
      return;
    }

    setGeneratingPrompts(true);
    setError(null);
    setPrompts([]);
    setPromptsByStyle(new Map());

    try {
      const allPrompts: GeneratedPrompt[] = [];
      const stylePrompts = new Map<string, GeneratedPrompt[]>();

      for (const storyboard of editedStoryboards) {
        const response = await api.generatePromptsFromStoryboard({
          script: script.trim(),
          storyboard: storyboard,
          model: geminiModel,
          aspect_ratio: aspectRatio,
        });

        const stylePromptList: GeneratedPrompt[] = [];
        response.prompts.forEach((prompt, idx) => {
          const p: GeneratedPrompt = {
            index: allPrompts.length,
            text: prompt.prompt,
            summary: `${storyboard.style_name} - Scene ${idx + 1}`,
            duration: `${prompt.duration_seconds}s`,
            styleName: storyboard.style_name,
          };
          allPrompts.push(p);
          stylePromptList.push(p);
        });
        
        stylePrompts.set(storyboard.style_name, stylePromptList);
      }

      setPrompts(allPrompts);
      setPromptsByStyle(stylePrompts);
      setCurrentStep('prompts');
      toast.success(`Generated ${allPrompts.length} prompts for ${editedStoryboards.length} style(s)!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prompts');
      toast.error('Prompt generation failed');
    } finally {
      setGeneratingPrompts(false);
    }
  };

  // Copy prompt
  const copyPrompt = (index: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success('Prompt copied!');
  };

  // Toggle prompt expand
  const togglePromptExpand = (index: number) => {
    setExpandedPrompts(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Save session
  const handleSaveSession = () => {
    if (!script.trim() && storyboards.length === 0 && prompts.length === 0) {
      toast.error('Nothing to save');
      return;
    }

    const name = sessionName.trim() || `Script Session ${new Date().toLocaleString()}`;
    
    try {
      const id = saveScriptSession({
        name,
        script,
        styleReferenceUrl,
        videoAnalysis,
        storyboards,
        selectedStoryboardIds: Array.from(selectedStoryboardIds),
        editedStoryboards,
        prompts,
        currentStep,
        settings: {
          geminiModel,
          includeDiacritics,
          useStyleAnalysis,
          replicationMode: false,
          aspectRatio,
        },
      });
      
      setCurrentSessionId(id);
      setSavedSessions(getStoredScriptSessions());
      setSessionName('');
      toast.success(`Session saved: ${name}`);
    } catch (err) {
      toast.error('Failed to save session');
    }
  };

  // Load session
  const handleLoadSession = (sessionId: string) => {
    const session = getScriptSessionById(sessionId);
    if (!session) {
      toast.error('Session not found');
      return;
    }

    setScript(session.script);
    setStyleReferenceUrl(session.styleReferenceUrl);
    setVideoAnalysis(session.videoAnalysis);
    setStoryboards(session.storyboards);
    setSelectedStoryboardIds(new Set(session.selectedStoryboardIds));
    setEditedStoryboards(session.editedStoryboards);
    setPrompts(session.prompts);
    setCurrentStep(session.currentStep as WorkflowStep);
    setGeminiModel(session.settings.geminiModel);
    setIncludeDiacritics(session.settings.includeDiacritics);
    setUseStyleAnalysis(session.settings.useStyleAnalysis);
    setCurrentSessionId(sessionId);
    setShowSavedSessions(false);
    
    toast.success(`Loaded: ${session.name}`);
  };

  // Delete session
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteScriptSession(sessionId);
    setSavedSessions(getStoredScriptSessions());
    if (currentSessionId === sessionId) setCurrentSessionId(null);
    toast.success('Session deleted');
  };

  // Step indicator
  const steps = [
    { id: 'script', label: 'Script', icon: FileText },
    { id: 'storyboards', label: 'Concepts', icon: Palette },
    { id: 'edit', label: 'Edit', icon: Edit3 },
    { id: 'prompts', label: 'Generate', icon: Video },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="space-y-4">
      {/* Save/Load Sessions Bar */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              placeholder="Session name (optional)..."
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="flex-1 min-w-[150px] h-8 text-sm"
            />
            <Button onClick={handleSaveSession} size="sm" className="bg-green-600 hover:bg-green-700">
              <Save className="w-3 h-3 mr-1" /> Save
            </Button>
            <Button onClick={() => setShowSavedSessions(!showSavedSessions)} size="sm" variant="outline" className="border-cyan-700 text-cyan-400 hover:bg-cyan-900/30">
              <FolderOpen className="w-3 h-3 mr-1" /> Load ({savedSessions.length})
            </Button>
          </div>

          {showSavedSessions && savedSessions.length > 0 && (
            <div className="mt-3 space-y-2 max-h-[200px] overflow-y-auto">
              {savedSessions.map((session) => (
                <div key={session.id} onClick={() => handleLoadSession(session.id)}
                  className={cn("flex items-center justify-between p-2 rounded cursor-pointer transition-colors bg-slate-800/50 hover:bg-slate-700/50",
                    currentSessionId === session.id && "border border-green-700/50")}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 truncate">{session.name}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" /> {formatTimestamp(session.timestamp)}
                      <Badge variant="outline" className="text-[9px] px-1 py-0">{session.currentStep}</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={(e) => handleDeleteSession(session.id, e)} className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/30">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {showSavedSessions && savedSessions.length === 0 && (
            <div className="mt-3 text-center text-xs text-slate-500 py-4">No saved sessions yet.</div>
          )}
        </CardContent>
      </Card>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = idx < currentStepIndex;
          
          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => {
                  if (isCompleted || isActive) {
                    setCurrentStep(step.id as WorkflowStep);
                  }
                }}
                disabled={!isCompleted && !isActive}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm",
                  isActive && "bg-cyan-600 text-white",
                  isCompleted && "bg-cyan-900/50 text-cyan-300 hover:bg-cyan-800/50 cursor-pointer",
                  !isActive && !isCompleted && "bg-slate-800/50 text-slate-500 cursor-not-allowed"
                )}
              >
                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <ArrowRight className={cn("w-4 h-4", idx < currentStepIndex ? "text-cyan-400" : "text-slate-600")} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* STEP 1: Script Input */}
      {currentStep === 'script' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Step 1: Enter Your Script
            </CardTitle>
            <CardDescription className="text-xs">
              Paste your script and AI will generate 3 different creative concepts for you to choose from.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Script Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">Your Script</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDiacritics}
                      onChange={(e) => setIncludeDiacritics(e.target.checked)}
                      className="w-3 h-3 rounded border-slate-600 bg-slate-800"
                    />
                    <span>تشكيل</span>
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTranslateScript}
                    disabled={!script.trim() || translating || generatingStoryboards}
                    className="h-6 px-2 text-xs border-purple-700 text-purple-400 hover:bg-purple-900/30"
                  >
                    {translating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3 mr-1" />}
                    {translating ? 'Translating...' : 'Translate'}
                  </Button>
                </div>
              </div>
              <Textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Paste your full script here..."
                className="min-h-[150px] text-sm"
                disabled={generatingStoryboards}
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>{wordCount} words</span>
                <span>~{estimatedDuration}s estimated</span>
              </div>
            </div>

            {/* Style Reference URL (Optional) */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 flex items-center gap-2">
                <Palette className="w-3 h-3 text-purple-400" />
                Style Reference (Optional) - Analyze a video to inspire the creative concepts
              </label>
              <div className="flex gap-2">
                <Input
                  value={styleReferenceUrl}
                  onChange={(e) => {
                    setStyleReferenceUrl(e.target.value);
                    setVideoAnalysis(null);
                    setUseStyleAnalysis(false);
                  }}
                  placeholder="Paste Instagram, TikTok, or YouTube video URL"
                  className="flex-1 text-sm"
                  disabled={generatingStoryboards || analyzingVideo}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAnalyzeVideo}
                  disabled={!styleReferenceUrl.trim() || analyzingVideo || generatingStoryboards}
                  className="h-9 px-3 border-purple-700 text-purple-400 hover:bg-purple-900/30"
                >
                  {analyzingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Video Analysis Results */}
            {videoAnalysis && (
              <div className="p-3 bg-purple-900/20 border border-purple-700/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-purple-300">Video Analyzed</span>
                    {videoAnalysis.video_type?.primary_type && (
                      <Badge className="bg-purple-600 text-[10px]">
                        {videoAnalysis.video_type.primary_type.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAnalysisDetails(!showAnalysisDetails)}
                    className="h-6 px-2 text-xs text-purple-400"
                  >
                    {showAnalysisDetails ? 'Hide' : 'Show'} Details
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUseExtractedScript}
                      disabled={!videoAnalysis.transcript}
                      className="flex-1 h-7 text-xs border-cyan-700 text-cyan-400 hover:bg-cyan-900/30"
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Use Extracted Script
                    </Button>
                    <Button
                      variant={useStyleAnalysis ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUseStyleAnalysis(!useStyleAnalysis)}
                      className={cn(
                        "flex-1 h-7 text-xs",
                        useStyleAnalysis
                          ? "bg-purple-600 hover:bg-purple-700 text-white" 
                          : "border-purple-700 text-purple-400 hover:bg-purple-900/30"
                      )}
                    >
                      <Palette className="w-3 h-3 mr-1" />
                      {useStyleAnalysis ? '✓ Using as Reference' : 'Use Style as Reference'}
                    </Button>
                  </div>
                  
                  {useStyleAnalysis && (
                    <div className="text-[10px] p-2 rounded bg-purple-900/30 text-purple-300 border border-purple-700/50">
                      🎨 The 3 creative concepts will be inspired by this video's style (colors, mood, camera work, etc.)
                    </div>
                  )}
                </div>

                {/* Transcript Preview */}
                {videoAnalysis.transcript && showAnalysisDetails && (
                  <div className="space-y-1">
                    <div className="text-xs text-purple-400 font-medium">📝 Extracted Script:</div>
                    <div className="p-2 bg-slate-800/50 rounded text-xs text-slate-300 max-h-[100px] overflow-y-auto">
                      {videoAnalysis.transcript.slice(0, 300)}
                      {videoAnalysis.transcript.length > 300 && '...'}
                    </div>
                  </div>
                )}

                {/* Style Analysis */}
                {showAnalysisDetails && videoAnalysis.style_analysis && (
                  <div className="space-y-2 text-xs">
                    <div className="text-purple-400 font-medium">🎨 Style Analysis:</div>
                    <div className="grid grid-cols-2 gap-2">
                      {videoAnalysis.style_analysis.visual_style && (
                        <div><span className="text-slate-500">Visual Style:</span> <span className="text-slate-300">{videoAnalysis.style_analysis.visual_style}</span></div>
                      )}
                      {videoAnalysis.style_analysis.color_palette && (
                        <div><span className="text-slate-500">Colors:</span> <span className="text-slate-300">{videoAnalysis.style_analysis.color_palette}</span></div>
                      )}
                      {videoAnalysis.style_analysis.lighting && (
                        <div><span className="text-slate-500">Lighting:</span> <span className="text-slate-300">{videoAnalysis.style_analysis.lighting}</span></div>
                      )}
                      {videoAnalysis.style_analysis.mood && (
                        <div><span className="text-slate-500">Mood:</span> <span className="text-slate-300">{videoAnalysis.style_analysis.mood}</span></div>
                      )}
                      {videoAnalysis.style_analysis.camera_work && (
                        <div><span className="text-slate-500">Camera Work:</span> <span className="text-slate-300">{videoAnalysis.style_analysis.camera_work}</span></div>
                      )}
                      {videoAnalysis.style_analysis.pacing && (
                        <div><span className="text-slate-500">Pacing:</span> <span className="text-slate-300">{videoAnalysis.style_analysis.pacing}</span></div>
                      )}
                    </div>
                    {videoAnalysis.style_analysis.character_description && (
                      <div className="col-span-2 pt-1">
                        <span className="text-slate-500">Characters:</span> <span className="text-slate-300">{videoAnalysis.style_analysis.character_description}</span>
                      </div>
                    )}
                    {videoAnalysis.style_analysis.environment_description && (
                      <div className="col-span-2">
                        <span className="text-slate-500">Environment:</span> <span className="text-slate-300">{videoAnalysis.style_analysis.environment_description}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Model Selection */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400 whitespace-nowrap">AI Model:</label>
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200"
              >
                <option value="gemini-3.0-flash">Gemini 3.0 Flash (Fastest)</option>
                <option value="gemini-3.0-pro">Gemini 3.0 Pro (Best)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              </select>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateStoryboards}
              disabled={!script.trim() || generatingStoryboards}
              className="w-full bg-cyan-600 hover:bg-cyan-700"
            >
              {generatingStoryboards ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Concepts...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Generate 3 Creative Concepts</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Storyboard Selection */}
      {currentStep === 'storyboards' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="w-4 h-4 text-purple-400" />
              Step 2: Choose Your Concepts
            </CardTitle>
            <CardDescription className="text-xs">
              Select one or more creative concepts to proceed with. You can edit them in the next step.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {storyboards.map((storyboard) => (
              <div
                key={storyboard.id}
                onClick={() => toggleStoryboardSelection(storyboard.id)}
                className={cn(
                  "p-4 rounded-lg border cursor-pointer transition-all",
                  selectedStoryboardIds.has(storyboard.id)
                    ? "border-purple-500 bg-purple-900/20"
                    : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{storyboard.style_icon}</span>
                    <span className="font-medium text-slate-200">{storyboard.style_name}</span>
                  </div>
                  <Checkbox
                    checked={selectedStoryboardIds.has(storyboard.id)}
                    onCheckedChange={() => toggleStoryboardSelection(storyboard.id)}
                  />
                </div>
                <p className="text-sm text-slate-400 mb-2">{storyboard.creative_concept}</p>
                <div className="text-xs text-slate-500">
                  <span className="text-purple-400">Visual:</span> {storyboard.visual_approach}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  <span className="text-cyan-400">Mood:</span> {storyboard.mood_and_tone}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  <span className="text-pink-400">Scenes:</span> {storyboard.scenes.length}
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('script')}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                onClick={handleProceedWithSelected}
                disabled={selectedStoryboardIds.size === 0}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                Edit Selected ({selectedStoryboardIds.size}) <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Edit Storyboards */}
      {currentStep === 'edit' && editedStoryboards.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-cyan-400" />
              Step 3: Edit Your Storyboard
            </CardTitle>
            <CardDescription className="text-xs">
              Fine-tune the scenes and descriptions before generating final prompts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Storyboard Tabs */}
            {editedStoryboards.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {editedStoryboards.map((sb, idx) => (
                  <Button
                    key={sb.id}
                    variant={activeEditIndex === idx ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveEditIndex(idx)}
                    className={cn(
                      "whitespace-nowrap",
                      activeEditIndex === idx && "bg-cyan-600"
                    )}
                  >
                    {sb.style_icon} {sb.style_name}
                  </Button>
                ))}
              </div>
            )}

            {/* Active Storyboard Editor */}
            {editedStoryboards[activeEditIndex] && (
              <div className="space-y-4">
                <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{editedStoryboards[activeEditIndex].style_icon}</span>
                    <Input
                      value={editedStoryboards[activeEditIndex].style_name}
                      onChange={(e) => updateEditedStoryboard(activeEditIndex, 'style_name', e.target.value)}
                      className="font-medium"
                    />
                  </div>
                  <Textarea
                    value={editedStoryboards[activeEditIndex].creative_concept}
                    onChange={(e) => updateEditedStoryboard(activeEditIndex, 'creative_concept', e.target.value)}
                    placeholder="Creative concept..."
                    className="min-h-[60px] text-sm"
                  />
                </div>

                {/* Scenes */}
                <div className="space-y-3">
                  <div className="text-xs text-slate-400 font-medium">Scenes:</div>
                  {editedStoryboards[activeEditIndex].scenes.map((scene, sceneIdx) => (
                    <div key={sceneIdx} className="p-3 bg-slate-800/30 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-cyan-600">Scene {scene.scene_number}</Badge>
                        <span className="text-xs text-slate-500">{scene.duration}</span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] text-slate-500">Dialogue</label>
                          <Textarea
                            value={scene.dialogue}
                            onChange={(e) => updateEditedScene(activeEditIndex, sceneIdx, 'dialogue', e.target.value)}
                            className="min-h-[40px] text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500">Visual Description</label>
                          <Textarea
                            value={scene.visual_description}
                            onChange={(e) => updateEditedScene(activeEditIndex, sceneIdx, 'visual_description', e.target.value)}
                            className="min-h-[40px] text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500">Camera</label>
                            <Input
                              value={scene.camera}
                              onChange={(e) => updateEditedScene(activeEditIndex, sceneIdx, 'camera', e.target.value)}
                              className="text-xs h-7"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500">Mood</label>
                            <Input
                              value={scene.mood}
                              onChange={(e) => updateEditedScene(activeEditIndex, sceneIdx, 'mood', e.target.value)}
                              className="text-xs h-7"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('storyboards')}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                onClick={handleGeneratePrompts}
                disabled={generatingPrompts}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700"
              >
                {generatingPrompts ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Wand2 className="w-4 h-4 mr-2" /> Generate Prompts</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Generated Prompts */}
      {currentStep === 'prompts' && prompts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Video className="w-4 h-4 text-green-400" />
              Step 4: Your VEO Prompts
            </CardTitle>
            <CardDescription className="text-xs">
              Copy these prompts to use with VEO video generation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Group by style */}
            {Array.from(promptsByStyle.entries()).map(([styleName, stylePrompts]) => (
              <div key={styleName} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-600">{styleName}</Badge>
                  <span className="text-xs text-slate-500">{stylePrompts.length} prompts</span>
                </div>
                
                {stylePrompts.map((prompt) => (
                  <div
                    key={prompt.index}
                    className="p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-cyan-400 border-cyan-700 text-[10px]">
                          {prompt.summary}
                        </Badge>
                        <Badge variant="outline" className="text-slate-400 border-slate-600 text-[10px]">
                          {prompt.duration}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePromptExpand(prompt.index)}
                          className="h-6 w-6 p-0 text-slate-400"
                        >
                          {expandedPrompts.has(prompt.index) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyPrompt(prompt.index, prompt.text)}
                          className="h-6 w-6 p-0 text-green-400 hover:text-green-300"
                        >
                          {copiedIndex === prompt.index ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className={cn(
                      "text-xs text-slate-300 whitespace-pre-wrap",
                      expandedPrompts.has(prompt.index) ? "" : "line-clamp-3"
                    )}>
                      {prompt.text}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('edit')}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentStep('script');
                  setStoryboards([]);
                  setSelectedStoryboardIds(new Set());
                  setEditedStoryboards([]);
                  setPrompts([]);
                  setPromptsByStyle(new Map());
                }}
                className="flex-1 border-cyan-700 text-cyan-400 hover:bg-cyan-900/30"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Start New
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ScriptToVideo;
