'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Video, Loader2, RefreshCw, Sparkles, Copy, ChevronDown, ChevronUp,
  Languages, Play, Wand2, Eye, Save, FolderOpen, Trash2, Clock, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api, VideoAnalysis, SceneAnalysis } from '@/lib/api';
import { getStoredSessions, saveSession, getSessionById, deleteSession, formatTimestamp, StoredSession } from '@/lib/storage';

interface SceneWithPrompt extends SceneAnalysis {
  editedDialogue: string;
  generatedPrompt: string | null;
  isGeneratingPrompt: boolean;
  isExpanded: boolean;
}

interface VideoReplicatorProps {
  aspectRatio: string;
}

export const VideoReplicator: React.FC<VideoReplicatorProps> = ({ aspectRatio }) => {
  // State
  const [videoUrl, setVideoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [videoAnalysis, setVideoAnalysis] = useState<VideoAnalysis | null>(null);
  const [scenes, setScenes] = useState<SceneWithPrompt[]>([]);
  const [geminiModel, setGeminiModel] = useState('gemini-3.0-flash');
  
  // Saved sessions state
  const [savedSessions, setSavedSessions] = useState<StoredSession[]>([]);
  const [showSavedSessions, setShowSavedSessions] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState('');
  
  // Settings
  const [includeDiacritics, setIncludeDiacritics] = useState(true);
  const [includeMusic, setIncludeMusic] = useState(true);
  const [includeTextOverlays, setIncludeTextOverlays] = useState(true);
  const [includeSoundEffects, setIncludeSoundEffects] = useState(true);
  const [promptDetailLevel, setPromptDetailLevel] = useState<'basic' | 'detailed' | 'ultra_detailed'>('ultra_detailed');
  const [maxDurationSeconds] = useState(8);
  const [targetSceneCount, setTargetSceneCount] = useState<number | null>(null);
  const [mergeShortScenes, setMergeShortScenes] = useState(true);

  // Bulk operation states
  const [isGeneratingAllPrompts, setIsGeneratingAllPrompts] = useState(false);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);

  // Load saved sessions on mount
  useEffect(() => {
    setSavedSessions(getStoredSessions());
  }, []);

  // Analyze video
  const handleAnalyzeVideo = async () => {
    if (!videoUrl.trim()) {
      toast.error('Please enter a video URL');
      return;
    }

    setIsAnalyzing(true);
    setVideoAnalysis(null);
    setScenes([]);

    try {
      const response = await api.analyzeVideoUrl({
        video_url: videoUrl.trim(),
        model: geminiModel,
        extract_transcript: true,
        analyze_style: true,
        merge_short_scenes: mergeShortScenes,
        ...(targetSceneCount !== null && { target_scene_count: targetSceneCount }),
      });

      if (response.success && response.analysis) {
        setVideoAnalysis(response.analysis);
        
        const sceneBreakdown = response.analysis.scene_breakdown || [];
        const scenesWithPrompts: SceneWithPrompt[] = sceneBreakdown.map((scene, idx) => ({
          ...scene,
          scene_number: scene.scene_number || idx + 1,
          timestamp_start: scene.timestamp_start || `${idx * 8}:00`,
          timestamp_end: scene.timestamp_end || `${(idx + 1) * 8}:00`,
          duration_seconds: Math.min(scene.duration_seconds || 8, 8),
          editedDialogue: scene.audio?.dialogue || '',
          generatedPrompt: null,
          isGeneratingPrompt: false,
          isExpanded: idx === 0,
        }));
        
        setScenes(scenesWithPrompts);
        toast.success(`Analyzed ${scenesWithPrompts.length} scenes!`);
      } else {
        toast.error(response.error || 'Analysis failed');
      }
    } catch (err) {
      toast.error('Failed to analyze video');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Translate dialogue for a scene
  const handleTranslateDialogue = async (sceneIndex: number) => {
    const scene = scenes[sceneIndex];
    if (!scene.editedDialogue.trim()) {
      toast.error('No dialogue to translate');
      return;
    }

    try {
      const response = await api.translateScript({
        text: scene.editedDialogue,
        model: geminiModel,
        include_diacritics: includeDiacritics,
      });

      if (response.translated_text) {
        const updatedScenes = [...scenes];
        updatedScenes[sceneIndex] = { ...updatedScenes[sceneIndex], editedDialogue: response.translated_text };
        setScenes(updatedScenes);
        toast.success('Translated!');
      }
    } catch (err) {
      toast.error('Translation failed');
    }
  };

  // Generate prompt for a single scene
  const handleGeneratePrompt = async (sceneIndex: number) => {
    const scene = scenes[sceneIndex];
    
    const updatedScenes = [...scenes];
    updatedScenes[sceneIndex] = { ...scene, isGeneratingPrompt: true };
    setScenes(updatedScenes);

    try {
      const response = await api.generateScenePrompt({
        scene_analysis: {
          scene_number: scene.scene_number,
          timestamp_start: scene.timestamp_start,
          timestamp_end: scene.timestamp_end,
          duration_seconds: Math.min(scene.duration_seconds || 8, maxDurationSeconds),
          scene_type: scene.scene_type,
          subject_description: scene.subject_description,
          visual_composition: scene.visual_composition,
          subject_in_frame: scene.subject_in_frame,
          background: scene.background,
          motion_dynamics: scene.motion_dynamics,
          text_graphics: scene.text_graphics,
          audio: scene.audio,
          recreation_notes: scene.recreation_notes,
        },
        dialogue: scene.editedDialogue,
        video_style: videoAnalysis?.style_analysis || {},
        video_type: videoAnalysis?.video_type || {},
        model: geminiModel,
        aspect_ratio: aspectRatio,
        include_music: includeMusic,
        include_text_overlays: includeTextOverlays,
        include_sound_effects: includeSoundEffects,
        prompt_detail_level: promptDetailLevel,
        max_duration_seconds: maxDurationSeconds,
      });

      if (response.prompt) {
        const finalScenes = [...scenes];
        finalScenes[sceneIndex] = { ...finalScenes[sceneIndex], generatedPrompt: response.prompt, isGeneratingPrompt: false };
        setScenes(finalScenes);
        toast.success('Prompt generated!');
      } else {
        throw new Error('No prompt returned');
      }
    } catch (err) {
      const finalScenes = [...scenes];
      finalScenes[sceneIndex] = { ...finalScenes[sceneIndex], isGeneratingPrompt: false };
      setScenes(finalScenes);
      toast.error('Failed to generate prompt');
    }
  };

  // Copy prompt to clipboard
  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success('Prompt copied!');
  };

  // Toggle scene expansion
  const toggleSceneExpansion = (sceneIndex: number) => {
    const updatedScenes = [...scenes];
    updatedScenes[sceneIndex] = { ...updatedScenes[sceneIndex], isExpanded: !updatedScenes[sceneIndex].isExpanded };
    setScenes(updatedScenes);
  };

  // Update dialogue
  const updateDialogue = (sceneIndex: number, newDialogue: string) => {
    const updatedScenes = [...scenes];
    updatedScenes[sceneIndex] = { ...updatedScenes[sceneIndex], editedDialogue: newDialogue };
    setScenes(updatedScenes);
  };

  // Generate prompts for ALL scenes
  const handleGenerateAllPrompts = async () => {
    if (scenes.length === 0) {
      toast.error('No scenes to generate prompts for');
      return;
    }

    setIsGeneratingAllPrompts(true);
    const updatedScenes = scenes.map(scene => ({ ...scene, isGeneratingPrompt: true }));
    setScenes(updatedScenes);

    try {
      const response = await api.generateAllPrompts({
        scenes: scenes.map(scene => ({
          scene_analysis: {
            scene_number: scene.scene_number,
            timestamp_start: scene.timestamp_start,
            timestamp_end: scene.timestamp_end,
            duration_seconds: Math.min(scene.duration_seconds || 8, maxDurationSeconds),
            scene_type: scene.scene_type,
            subject_description: scene.subject_description,
            visual_composition: scene.visual_composition,
            subject_in_frame: scene.subject_in_frame,
            background: scene.background,
            motion_dynamics: scene.motion_dynamics,
            text_graphics: scene.text_graphics,
            audio: scene.audio,
            recreation_notes: scene.recreation_notes,
          },
          dialogue: scene.editedDialogue,
        })),
        video_style: videoAnalysis?.style_analysis || {},
        video_type: videoAnalysis?.video_type || {},
        model: geminiModel,
        aspect_ratio: aspectRatio,
        include_music: includeMusic,
        include_text_overlays: includeTextOverlays,
        include_sound_effects: includeSoundEffects,
        prompt_detail_level: promptDetailLevel,
        max_duration_seconds: maxDurationSeconds,
      });

      const finalScenes = scenes.map((scene, idx) => {
        const result = response.prompts[idx];
        return { ...scene, generatedPrompt: result?.success ? result.prompt : scene.generatedPrompt, isGeneratingPrompt: false };
      });
      setScenes(finalScenes);

      if (response.failed_count > 0) {
        toast.warning(`Generated ${response.successful_count}/${response.total_scenes} prompts`);
      } else {
        toast.success(`Generated all ${response.successful_count} prompts!`);
      }
    } catch (err) {
      const resetScenes = scenes.map(scene => ({ ...scene, isGeneratingPrompt: false }));
      setScenes(resetScenes);
      toast.error('Failed to generate prompts');
    } finally {
      setIsGeneratingAllPrompts(false);
    }
  };

  // Translate ALL dialogues
  const handleTranslateAll = async () => {
    const dialogues = scenes.map(scene => scene.editedDialogue);
    if (!dialogues.some(d => d.trim())) {
      toast.error('No dialogues to translate');
      return;
    }

    setIsTranslatingAll(true);

    try {
      const response = await api.translateAllDialogues({
        dialogues,
        model: geminiModel,
        include_diacritics: includeDiacritics,
      });

      const updatedScenes = scenes.map((scene, idx) => {
        const result = response.translations[idx];
        return { ...scene, editedDialogue: result?.success ? result.translated : scene.editedDialogue };
      });
      setScenes(updatedScenes);

      if (response.failed_count > 0) {
        toast.warning(`Translated ${response.successful_count}/${response.total_count} dialogues`);
      } else {
        toast.success(`Translated all ${response.successful_count} dialogues!`);
      }
    } catch (err) {
      toast.error('Failed to translate dialogues');
    } finally {
      setIsTranslatingAll(false);
    }
  };

  // Save current session
  const handleSaveSession = () => {
    if (!videoAnalysis && scenes.length === 0) {
      toast.error('Nothing to save - analyze a video first');
      return;
    }

    const name = sessionName.trim() || `Session ${new Date().toLocaleString()}`;
    
    try {
      const id = saveSession({
        name,
        videoUrl,
        videoAnalysis,
        scenes,
        settings: {
          geminiModel,
          includeDiacritics,
          includeMusic,
          includeTextOverlays,
          includeSoundEffects,
          promptDetailLevel,
          maxDurationSeconds,
          targetSceneCount,
          aspectRatio,
          mergeShortScenes,
        },
      });
      
      setCurrentSessionId(id);
      setSavedSessions(getStoredSessions());
      setSessionName('');
      toast.success(`Session saved: ${name}`);
    } catch (err) {
      toast.error('Failed to save session');
    }
  };

  // Load a saved session
  const handleLoadSession = (sessionId: string) => {
    const session = getSessionById(sessionId);
    if (!session) {
      toast.error('Session not found');
      return;
    }

    setVideoUrl(session.videoUrl);
    setVideoAnalysis(session.videoAnalysis);
    setScenes(session.scenes);
    setGeminiModel(session.settings.geminiModel);
    setIncludeDiacritics(session.settings.includeDiacritics);
    setIncludeMusic(session.settings.includeMusic);
    setIncludeTextOverlays(session.settings.includeTextOverlays);
    setIncludeSoundEffects(session.settings.includeSoundEffects);
    setPromptDetailLevel(session.settings.promptDetailLevel as 'basic' | 'detailed' | 'ultra_detailed');
    setTargetSceneCount(session.settings.targetSceneCount);
    setMergeShortScenes(session.settings.mergeShortScenes ?? true);
    setCurrentSessionId(sessionId);
    setShowSavedSessions(false);
    
    toast.success(`Loaded: ${session.name}`);
  };

  // Delete a saved session
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSession(sessionId);
    setSavedSessions(getStoredSessions());
    if (currentSessionId === sessionId) setCurrentSessionId(null);
    toast.success('Session deleted');
  };

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
            <Button onClick={handleSaveSession} disabled={!videoAnalysis && scenes.length === 0} size="sm" className="bg-green-600 hover:bg-green-700">
              <Save className="w-3 h-3 mr-1" /> Save
            </Button>
            <Button onClick={() => setShowSavedSessions(!showSavedSessions)} size="sm" variant="outline" className="border-blue-700 text-blue-400 hover:bg-blue-900/30">
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
                      <Badge variant="outline" className="text-[9px] px-1 py-0">{session.scenes?.length || 0} scenes</Badge>
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

      {/* Video URL Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Video className="w-4 h-4 text-pink-400" /> Video Replicator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Paste Instagram/TikTok/YouTube URL..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="flex-1" />
            <Button onClick={handleAnalyzeVideo} disabled={isAnalyzing || !videoUrl.trim()} className="bg-pink-600 hover:bg-pink-700">
              {isAnalyzing ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>) : (<><Sparkles className="w-4 h-4 mr-2" /> Analyze</>)}
            </Button>
          </div>

          {/* Model Selection */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400 whitespace-nowrap">AI Model:</label>
            <select value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500">
              <option value="gemini-3.0-flash">Gemini 3.0 Flash (Fastest)</option>
              <option value="gemini-3.0-pro">Gemini 3.0 Pro (Best)</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            </select>
          </div>

          {/* Scene Detection */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400 whitespace-nowrap">Scene Detection:</label>
            <select value={targetSceneCount === null ? 'auto' : targetSceneCount.toString()}
              onChange={(e) => setTargetSceneCount(e.target.value === 'auto' ? null : parseInt(e.target.value))}
              className="flex-1 bg-slate-800 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500">
              <option value="auto">🤖 Auto (AI decides, max 8s each)</option>
              <option value="1">1 scene (Full video as one)</option>
              <option value="2">2 scenes</option>
              <option value="3">3 scenes</option>
              <option value="4">4 scenes</option>
              <option value="5">5 scenes</option>
              <option value="6">6 scenes</option>
            </select>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox id="mergeShortScenes" checked={mergeShortScenes} onCheckedChange={(checked) => setMergeShortScenes(checked as boolean)} />
              <label htmlFor="mergeShortScenes" className="text-xs text-slate-400">Merge short scenes</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="diacritics" checked={includeDiacritics} onCheckedChange={(checked) => setIncludeDiacritics(checked as boolean)} />
              <label htmlFor="diacritics" className="text-xs text-slate-400">Arabic diacritics (تشكيل)</label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Analysis Summary */}
      {videoAnalysis && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><Eye className="w-4 h-4 text-purple-400" /> Analysis Summary</span>
              <Badge variant="outline" className="text-pink-400 border-pink-700">{videoAnalysis.video_type?.primary_type || 'Video'}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {videoAnalysis.video_type?.description && <p className="text-slate-300">{videoAnalysis.video_type.description}</p>}
            {videoAnalysis.style_analysis?.visual_style && <p className="text-slate-400"><span className="text-purple-400">Style:</span> {videoAnalysis.style_analysis.visual_style}</p>}
            <p className="text-slate-400"><span className="text-pink-400">Scenes:</span> {scenes.length}</p>
          </CardContent>
        </Card>
      )}

      {/* Video Transcript */}
      {videoAnalysis?.transcript && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-green-400" /> Video Transcript</span>
              <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(videoAnalysis.transcript || '')} className="h-6 text-xs text-green-400 hover:text-green-300">
                <Copy className="w-3 h-3 mr-1" /> Copy
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 bg-green-900/20 border border-green-700/30 rounded text-xs text-green-100 max-h-[200px] overflow-y-auto whitespace-pre-wrap">
              {videoAnalysis.transcript}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prompt Generation Controls */}
      {scenes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Wand2 className="w-4 h-4 text-purple-400" /> Prompt Generation Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400 whitespace-nowrap">Detail Level:</label>
              <select value={promptDetailLevel} onChange={(e) => setPromptDetailLevel(e.target.value as 'basic' | 'detailed' | 'ultra_detailed')}
                className="flex-1 bg-slate-800 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="basic">Basic (500-800 words)</option>
                <option value="detailed">Detailed (800-1200 words)</option>
                <option value="ultra_detailed">Ultra Detailed (1200-2000 words) ⭐</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="flex items-center gap-2">
                <Checkbox id="includeMusic" checked={includeMusic} onCheckedChange={(checked) => setIncludeMusic(checked as boolean)} />
                <label htmlFor="includeMusic" className="text-xs text-slate-400">Background music</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="includeTextOverlays" checked={includeTextOverlays} onCheckedChange={(checked) => setIncludeTextOverlays(checked as boolean)} />
                <label htmlFor="includeTextOverlays" className="text-xs text-slate-400">Text overlays</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="includeSoundEffects" checked={includeSoundEffects} onCheckedChange={(checked) => setIncludeSoundEffects(checked as boolean)} />
                <label htmlFor="includeSoundEffects" className="text-xs text-slate-400">Sound effects</label>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700">
              <Button onClick={handleTranslateAll} disabled={isTranslatingAll || scenes.every(s => !s.editedDialogue.trim())} size="sm" variant="outline" className="flex-1 border-cyan-700 text-cyan-400 hover:bg-cyan-900/30">
                {isTranslatingAll ? (<><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Translating...</>) : (<><Languages className="w-3 h-3 mr-1" /> Translate All</>)}
              </Button>
              <Button onClick={handleGenerateAllPrompts} disabled={isGeneratingAllPrompts} size="sm" className="flex-1 bg-purple-600 hover:bg-purple-700">
                {isGeneratingAllPrompts ? (<><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</>) : (<><Wand2 className="w-3 h-3 mr-1" /> Generate All Prompts</>)}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scenes List */}
      {scenes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Play className="w-4 h-4 text-pink-400" /> Scenes ({scenes.length})
          </h3>

          {scenes.map((scene, idx) => (
            <Card key={idx} className={cn("transition-all", scene.isExpanded && "border-pink-700/50")}>
              <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-800/50" onClick={() => toggleSceneExpansion(idx)}>
                <div className="flex items-center gap-3">
                  <Badge className="bg-pink-600 text-white text-xs">Scene {scene.scene_number}</Badge>
                  <span className="text-xs text-slate-400">{scene.timestamp_start} - {scene.timestamp_end}</span>
                  <Badge variant="outline" className="text-cyan-400 border-cyan-700 text-[10px]">⏱️ {scene.duration_seconds}s</Badge>
                  {scene.generatedPrompt && <Badge variant="outline" className="text-green-400 border-green-700 text-[10px]">✓ Prompt Ready</Badge>}
                </div>
                {scene.isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>

              {scene.isExpanded && (
                <CardContent className="pt-0 space-y-4">
                  {/* Scene Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {scene.subject_description && (
                      <div className="p-2 bg-slate-800/50 rounded">
                        <div className="text-pink-400 font-medium mb-1">🎭 Subject</div>
                        <div className="text-slate-300">{scene.subject_description.what_is_it || scene.subject_description.type || 'N/A'}</div>
                      </div>
                    )}
                    {scene.visual_composition && (
                      <div className="p-2 bg-slate-800/50 rounded">
                        <div className="text-purple-400 font-medium mb-1">📷 Camera</div>
                        <div className="text-slate-300">{scene.visual_composition.shot_type} / {scene.visual_composition.camera_angle}</div>
                      </div>
                    )}
                    {scene.background && (
                      <div className="p-2 bg-slate-800/50 rounded">
                        <div className="text-cyan-400 font-medium mb-1">🏠 Background</div>
                        <div className="text-slate-300">{scene.background.description || 'N/A'}</div>
                      </div>
                    )}
                  </div>

                  {/* Recreation Notes */}
                  {scene.recreation_notes && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-orange-400 font-medium">🎬 Recreation Notes</label>
                        <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(scene.recreation_notes || '')} className="h-6 text-xs text-orange-400 hover:text-orange-300">
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </Button>
                      </div>
                      <div className="p-3 bg-orange-900/20 border border-orange-700/30 rounded text-xs text-orange-100 max-h-[120px] overflow-y-auto">
                        {scene.recreation_notes}
                      </div>
                    </div>
                  )}

                  {/* Dialogue Editor */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-400 font-medium">📝 Dialogue</label>
                      <Button variant="ghost" size="sm" onClick={() => handleTranslateDialogue(idx)} className="h-6 text-xs text-blue-400 hover:text-blue-300">
                        <Languages className="w-3 h-3 mr-1" /> Translate
                      </Button>
                    </div>
                    <Textarea value={scene.editedDialogue} onChange={(e) => updateDialogue(idx, e.target.value)} placeholder="Enter dialogue..." className="min-h-[60px]" />
                  </div>

                  {/* Generate Prompt Button */}
                  <Button onClick={() => handleGeneratePrompt(idx)} disabled={scene.isGeneratingPrompt}
                    className={cn("w-full", scene.generatedPrompt ? "bg-purple-600 hover:bg-purple-700" : "bg-pink-600 hover:bg-pink-700")}>
                    {scene.isGeneratingPrompt ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>) 
                      : scene.generatedPrompt ? (<><RefreshCw className="w-4 h-4 mr-2" /> Regenerate Prompt</>) 
                      : (<><Wand2 className="w-4 h-4 mr-2" /> Generate Prompt</>)}
                  </Button>

                  {/* Generated Prompt Display */}
                  {scene.generatedPrompt && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-green-400 font-medium">✨ Generated VEO Prompt</label>
                        <Button variant="ghost" size="sm" onClick={() => handleCopyPrompt(scene.generatedPrompt!)} className="h-6 text-xs text-green-400 hover:text-green-300">
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </Button>
                      </div>
                      <div className="p-3 bg-green-900/20 border border-green-700/30 rounded text-xs text-green-100 max-h-[150px] overflow-y-auto whitespace-pre-wrap">
                        {scene.generatedPrompt}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoReplicator;
