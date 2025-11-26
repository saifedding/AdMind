'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Loader2, Sparkles, Video, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/dashboard';
import { adsApi, VeoModel } from '@/lib/api';

interface Style {
  id: string;
  name: string;
  description: string;
  example_use_case: string;
}

interface CharacterPreset {
  id: string;
  name: string;
  age: string;
  gender: string;
  ethnicity: string;
  features: string;
  wardrobe: string;
  energy: string;
}

// VeoModel is now imported from @/lib/api

interface CreativeBriefVariation {
  style: string;
  segments: string[];
}

export default function VeoPage() {
  const [script, setScript] = useState('');
  const [availableStyles, setAvailableStyles] = useState<Style[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [characterPresets, setCharacterPresets] = useState<CharacterPreset[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVariations, setGeneratedVariations] = useState<CreativeBriefVariation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [veoGeneratingKeys, setVeoGeneratingKeys] = useState<Set<string>>(new Set());
  const [veoVideoByPromptKey, setVeoVideoByPromptKey] = useState<Record<string, string | null>>({});
  const [veoErrorByPromptKey, setVeoErrorByPromptKey] = useState<Record<string, string | null>>({});
  const [generationTimeRemaining, setGenerationTimeRemaining] = useState<Record<string, number>>({});
  const [generationStartTime, setGenerationStartTime] = useState<Record<string, number>>({});
  const [generationIntervals, setGenerationIntervals] = useState<Record<string, NodeJS.Timeout>>({});
  const [actualGenerationTime, setActualGenerationTime] = useState<Record<string, number>>({});
  
  // Merge state
  const [selectedClipsForMerge, setSelectedClipsForMerge] = useState<Record<string, string[]>>({}); // style -> [urls]
  const [mergingStyles, setMergingStyles] = useState<Set<string>>(new Set());
  const [mergedVideoByStyle, setMergedVideoByStyle] = useState<Record<string, string>>({});
  const [mergeErrorByStyle, setMergeErrorByStyle] = useState<Record<string, string | null>>({});

  // Veo generation modal state
  const [showVeoModal, setShowVeoModal] = useState(false);
  const [currentPromptForModal, setCurrentPromptForModal] = useState<{ text: string; key: string } | null>(null);
  const [veoModels, setVeoModels] = useState<VeoModel[]>([]);
  const [veoModelsLoading, setVeoModelsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('veo_3_1_t2v_portrait');
  const [aspectRatio, setAspectRatio] = useState<string>('VIDEO_ASPECT_RATIO_PORTRAIT');
  const [seed, setSeed] = useState<number>(9831);
  const [geminiModel, setGeminiModel] = useState<string>('gemini-2.0-flash-lite');

  // Load available styles, character presets, and veo models
  useEffect(() => {
    loadAvailableStyles();
    loadCharacterPresets();
    loadVeoModels();
  }, []);

  const loadAvailableStyles = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/settings/ai/veo/available-styles');
      const data = await response.json();
      setAvailableStyles(data.styles || []);
    } catch (error) {
      console.error('Failed to load styles:', error);
      toast.error('Failed to load available styles');
    }
  };

  const openVeoModal = (promptText: string, promptKey: string) => {
    setCurrentPromptForModal({ text: promptText, key: promptKey });
    setShowVeoModal(true);
  };

  const loadCharacterPresets = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/settings/ai/veo/character-presets');
      const data = await response.json();
      setCharacterPresets(data.presets || []);
    } catch (error) {
      console.error('Failed to load character presets:', error);
      toast.error('Failed to load character presets');
    }
  };

  const loadVeoModels = async () => {
    try {
      setVeoModelsLoading(true);
      const res = await adsApi.getVeoModels();
      const models = res?.result?.data?.json?.result?.videoModels || [];
      // Filter out deprecated models
      const activeModels = models.filter((m: VeoModel) => m.modelStatus !== "MODEL_STATUS_DEPRECATED");
      setVeoModels(activeModels);
      // Auto-select best model for default aspect ratio
      const bestModel = findBestModel(activeModels, aspectRatio);
      if (bestModel) setSelectedModel(bestModel.key);
    } catch (error) {
      console.error('Failed to load veo models:', error);
      toast.error('Failed to load veo models');
    } finally {
      setVeoModelsLoading(false);
    }
  };

  const findBestModel = (models: VeoModel[], ratio: string): VeoModel | null => {
    const compatible = models.filter(m => 
      m.capabilities.includes('VIDEO_MODEL_CAPABILITY_TEXT') &&
      m.supportedAspectRatios.includes(ratio)
    );
    // Prefer veo_3_1 models
    return compatible.find(m => m.key.includes('veo_3_1')) || compatible[0] || null;
  };

  const handleStyleToggle = (styleId: string) => {
    setSelectedStyles(prev => 
      prev.includes(styleId) 
        ? prev.filter(id => id !== styleId)
        : [...prev, styleId]
    );
  };

  const handleGenerateBriefs = async () => {
    if (!script.trim()) {
      toast.error('Please enter a script or voice-over');
      return;
    }

    if (selectedStyles.length === 0) {
      toast.error('Please select at least one style');
      return;
    }

    setIsGenerating(true);
    setGeneratedVariations([]);

    try {
      const selectedPreset = characterPresets.find(p => p.id === selectedCharacter);
      const character = selectedPreset ? {
        age: selectedPreset.age,
        gender: selectedPreset.gender,
        ethnicity: selectedPreset.ethnicity,
        features: selectedPreset.features,
        wardrobe: selectedPreset.wardrobe,
        energy: selectedPreset.energy,
      } : undefined;

      const response = await fetch('http://localhost:8000/api/v1/settings/ai/veo/generate-briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          styles: selectedStyles,
          character,
          model: geminiModel,
        }),
      });

      const data = await response.json();

      if (data.success && data.variations) {
        setGeneratedVariations(data.variations);
        toast.success(`Generated ${data.variations.length} creative brief variations!`);
      } else {
        toast.error(data.error || 'Failed to generate briefs');
      }
    } catch (error) {
      console.error('Failed to generate briefs:', error);
      toast.error('Failed to generate creative briefs');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleGenerateVideo = async () => {
    if (!currentPromptForModal || !selectedModel) return;
    const { text: promptText, key: promptKey } = currentPromptForModal;

    // Get estimated generation time from selected model
    const selectedModelData = veoModels.find(m => m.key === selectedModel);
    const estimatedSeconds = selectedModelData?.videoGenerationTimeSeconds || 120;

    try {
      setVeoGeneratingKeys(prev => new Set([...prev, promptKey]));
      setVeoErrorByPromptKey(prev => ({ ...prev, [promptKey]: null }));
      setShowVeoModal(false);

      // Start countdown timer
      const startTime = Date.now();
      setGenerationStartTime(prev => ({ ...prev, [promptKey]: startTime }));
      setGenerationTimeRemaining(prev => ({ ...prev, [promptKey]: estimatedSeconds }));

      // Update countdown every second
      const countdownInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, estimatedSeconds - elapsed);
        setGenerationTimeRemaining(prev => ({ ...prev, [promptKey]: remaining }));

        if (remaining <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);

      // Store interval reference so we can clear it when generation completes
      setGenerationIntervals(prev => ({ ...prev, [promptKey]: countdownInterval }));

      // Start async video generation - returns immediately with task_id
      const asyncRes = await adsApi.generateVeoVideoAsync({
        prompt: promptText,
        aspect_ratio: aspectRatio,
        video_model_key: selectedModel,
        seed: seed,
      });

      if (!asyncRes.success || !asyncRes.task_id) {
        const msg = "Failed to start video generation";
        setVeoErrorByPromptKey(prev => ({ ...prev, [promptKey]: msg }));
        toast.error(msg);
        return;
      }

      console.log(`Started async generation for ${promptKey}, task_id: ${asyncRes.task_id}`);

      // Poll for task completion
      const pollInterval = setInterval(async () => {
        try {
          const status = await adsApi.getVeoTaskStatus(asyncRes.task_id);

          if (status.state === 'SUCCESS' && status.result?.video_url) {
            // Generation complete!
            clearInterval(pollInterval);

            // Save to state
            setVeoVideoByPromptKey(prev => ({ ...prev, [promptKey]: status.result!.video_url }));

            // Calculate actual generation time
            const actualTime = Math.floor((Date.now() - startTime) / 1000);
            setActualGenerationTime(prev => ({ ...prev, [promptKey]: actualTime }));

            // Clear countdown and interval
            setGenerationIntervals(prev => {
              if (prev[promptKey]) {
                clearInterval(prev[promptKey]);
              }
              const next = { ...prev };
              delete next[promptKey];
              return next;
            });

            setGenerationTimeRemaining(prev => {
              const next = { ...prev };
              delete next[promptKey];
              return next;
            });

            setVeoGeneratingKeys(prev => {
              const next = new Set(prev);
              next.delete(promptKey);
              return next;
            });

            toast.success('Video generated successfully!');
          } else if (status.state === 'FAILURE') {
            // Generation failed
            clearInterval(pollInterval);
            const msg = (status.result as any)?.error || 'Video generation failed';
            setVeoErrorByPromptKey(prev => ({ ...prev, [promptKey]: msg }));
            setVeoGeneratingKeys(prev => {
              const next = new Set(prev);
              next.delete(promptKey);
              return next;
            });
            toast.error(msg);
          }
          // Otherwise, keep polling (PENDING or STARTED)
        } catch (pollErr) {
          console.error('Polling error:', pollErr);
        }
      }, 3000); // Poll every 3 seconds

    } catch (err: any) {
      const msg = err.message || 'Generation failed';
      setVeoErrorByPromptKey(prev => ({ ...prev, [promptKey]: msg }));
      toast.error(msg);
      setVeoGeneratingKeys(prev => {
        const next = new Set(prev);
        next.delete(promptKey);
        return next;
      });
    }
  };

  const toggleClipSelection = (style: string, url: string) => {
    setSelectedClipsForMerge(prev => {
      const current = prev[style] || [];
      if (current.includes(url)) {
        return { ...prev, [style]: current.filter(u => u !== url) };
      } else {
        return { ...prev, [style]: [...current, url] };
      }
    });
  };

  const handleMergeClips = async (style: string) => {
    const clips = selectedClipsForMerge[style];
    if (!clips || clips.length < 2) {
      toast.error('Select at least 2 clips to merge');
      return;
    }

    setMergingStyles(prev => new Set([...prev, style]));
    setMergeErrorByStyle(prev => ({ ...prev, [style]: null }));
    
    try {
      toast.info('Merging videos... this may take a minute');
      const response = await fetch('http://localhost:8000/api/v1/settings/ai/veo/merge-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_urls: clips,
          output_filename: `veo_merge_${style}_${Date.now()}.mp4`
        }),
      });

      const data = await response.json();

      if (!data.success || !data.public_url) {
        throw new Error(data.error || 'Merge failed');
      }

      setMergedVideoByStyle(prev => ({ ...prev, [style]: data.public_url }));
      toast.success('Videos merged successfully!');
    } catch (error: any) {
      console.error('Merge error:', error);
      setMergeErrorByStyle(prev => ({ ...prev, [style]: error.message || 'Failed to merge videos' }));
      toast.error(error.message || 'Failed to merge videos');
    } finally {
      setMergingStyles(prev => {
        const next = new Set(prev);
        next.delete(style);
        return next;
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">VEO Creative Brief Generator</h1>
        <p className="text-muted-foreground">
          Generate multiple creative brief variations from your script with different visual styles
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-6">
          {/* Script Input */}
          <Card>
            <CardHeader>
              <CardTitle>Script / Voice-Over</CardTitle>
              <CardDescription>
                Enter your script or voice-over content that will be adapted to different visual styles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Example: We created a comprehensive Damac Island Phase 2 Ebook. It deals with everything from legal to ownership to access to location..."
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {script.split(' ').filter(w => w).length} words (~{Math.ceil(script.split(' ').filter(w => w).length / 3)} seconds)
              </p>
            </CardContent>
          </Card>

          {/* Style Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Styles</CardTitle>
              <CardDescription>
                Choose one or more visual styles to generate variations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableStyles.map((style) => (
                <div key={style.id} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <Checkbox
                    id={style.id}
                    checked={selectedStyles.includes(style.id)}
                    onCheckedChange={() => handleStyleToggle(style.id)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={style.id} className="font-medium cursor-pointer">
                      {style.name}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">{style.description}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1 italic">
                      {style.example_use_case}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Character Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Character Preset (Optional)</CardTitle>
              <CardDescription>
                Select a character archetype for consistent appearance across all styles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedCharacter} onValueChange={setSelectedCharacter}>
                <SelectTrigger>
                  <SelectValue placeholder="None - Let AI decide" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None - Let AI decide</SelectItem>
                  {characterPresets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCharacter && selectedCharacter !== "none" && (
                <div className="mt-3 p-3 rounded-lg bg-accent/30 text-sm space-y-1">
                  {characterPresets.find(p => p.id === selectedCharacter) && (
                    <>
                      <p><strong>Age:</strong> {characterPresets.find(p => p.id === selectedCharacter)?.age}</p>
                      <p><strong>Gender:</strong> {characterPresets.find(p => p.id === selectedCharacter)?.gender}</p>
                      <p><strong>Features:</strong> {characterPresets.find(p => p.id === selectedCharacter)?.features}</p>
                      <p><strong>Wardrobe:</strong> {characterPresets.find(p => p.id === selectedCharacter)?.wardrobe}</p>
                      <p><strong>Energy:</strong> {characterPresets.find(p => p.id === selectedCharacter)?.energy}</p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Model Selection */}
          <Card>
            <CardHeader>
              <CardTitle>AI Model for Brief Generation</CardTitle>
              <CardDescription>
                Choose Gemini or OpenRouter models for generating creative brief prompts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={geminiModel} onValueChange={setGeminiModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* Gemini 2.0 Models */}
                  <SelectItem value="gemini-2.0-flash-001">✨ Gemini 2.0 Flash (Gemini)</SelectItem>
                  <SelectItem value="gemini-2.0-flash-lite">⚡ Gemini 2.0 Flash-Lite (Gemini)</SelectItem>
                  
                  {/* Gemini 2.5 Models */}
                  <SelectItem value="gemini-2.5-flash-001">🚀 Gemini 2.5 Flash (Gemini)</SelectItem>
                  <SelectItem value="gemini-2.5-flash-preview-09-2025">🧪 Gemini 2.5 Flash Preview (Gemini)</SelectItem>
                  <SelectItem value="gemini-2.5-flash-lite">� Gemini 2.5 Flash-Lite (Gemini)</SelectItem>
                  <SelectItem value="gemini-2.5-flash-lite-preview-09-2025">🌟 Gemini 2.5 Flash-Lite Preview (Gemini)</SelectItem>
                  <SelectItem value="gemini-2.5-pro">🎯 Gemini 2.5 Pro (Gemini)</SelectItem>
                  
                  {/* Gemini 3 Models */}
                  <SelectItem value="gemini-3-pro-preview">👑 Gemini 3 Pro Preview (Gemini)</SelectItem>
                  
                  {/* OpenRouter Models - Free */}
                  <SelectItem value="openrouter:x-ai/grok-4.1-fast:free">🌐 Grok 4.1 Fast (OpenRouter - Free)</SelectItem>
                  <SelectItem value="openrouter:tngtech/deepseek-r1t2-chimera:free">🌐 DeepSeek R1T2 Chimera (OpenRouter - Free)</SelectItem>
                  <SelectItem value="openrouter:z-ai/glm-4.5-air:free">🌐 GLM 4.5 Air (OpenRouter - Free)</SelectItem>
                  <SelectItem value="openrouter:openrouter/bert-nebulon-alpha">🌐 BERT Nebulon Alpha (OpenRouter)</SelectItem>
                  <SelectItem value="openrouter:nvidia/nemotron-nano-12b-v2-vl:free">🌐 Nemotron Nano 12B VL (OpenRouter - Free)</SelectItem>
                  <SelectItem value="openrouter:google/gemini-2.0-flash-exp:free">🌐 Gemini 2.0 Flash Exp (OpenRouter - Free)</SelectItem>
                  <SelectItem value="openrouter:qwen/qwen3-235b-a22b:free">🌐 Qwen3 235B (OpenRouter - Free)</SelectItem>
                  <SelectItem value="openrouter:meta-llama/llama-3.3-70b-instruct:free">🌐 Llama 3.3 70B (OpenRouter - Free)</SelectItem>
                  <SelectItem value="openrouter:openai/gpt-oss-20b:free">🌐 GPT OSS 20B (OpenRouter - Free)</SelectItem>
                  <SelectItem value="openrouter:google/gemma-3-27b-it:free">🌐 Gemma 3 27B (OpenRouter - Free)</SelectItem>
                  <SelectItem value="openrouter:meituan/longcat-flash-chat:free">🌐 LongCat Flash Chat (OpenRouter - Free)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Recommended: Gemini 2.0 Flash Exp for best balance of speed and quality
                <br />
                🌐 OpenRouter models require API key configuration in settings
              </p>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateBriefs}
            disabled={isGenerating || !script.trim() || selectedStyles.length === 0}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Creative Briefs...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate {selectedStyles.length} Creative Brief{selectedStyles.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>

        {/* Generated Variations Section */}
        <div className="space-y-6">
          {generatedVariations.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Prompts (8s segments)</CardTitle>
                <CardDescription>Your generated prompts will appear here</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-12 text-muted-foreground">
                <Video className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No prompts generated yet</p>
                <p className="text-sm mt-2">Select styles and generate to see 8-second segment prompts</p>
              </CardContent>
            </Card>
          )}

          {generatedVariations.map((variation, varIdx) => (
            <Card key={varIdx}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="capitalize">{variation.style.replace('_', ' ')} Style</CardTitle>
                    <CardDescription>{variation.segments.length} segments (8s each)</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(`${variation.style}:all`, variation.segments.join('\n\n---\n\n'))}
                  >
                    {copiedKey === `${variation.style}:all` ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    Copy All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal ml-5 space-y-3">
                  {variation.segments.map((segment, segIdx) => {
                    const promptKey = `${variation.style}:prompt:${segIdx + 1}`;
                    const isGenerating = veoGeneratingKeys.has(promptKey);
                    const videoUrl = veoVideoByPromptKey[promptKey];
                    const error = veoErrorByPromptKey[promptKey];
                    const timeRemaining = generationTimeRemaining[promptKey];

                    return (
                      <li key={segIdx} className="space-y-2 border border-neutral-800 rounded-md p-3 bg-neutral-900/60">
                        <div className="flex items-center justify-between mb-2 text-xs text-neutral-400">
                          <span>Segment {segIdx + 1}</span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopy(promptKey, segment)}
                            >
                              {copiedKey === promptKey ? 'Copied' : 'Copy'}
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              disabled={isGenerating}
                              onClick={() => openVeoModal(segment, promptKey)}
                            >
                              {isGenerating ? (
                                <span className="flex items-center gap-1.5">
                                  <span className="animate-spin">⏳</span>
                                  {timeRemaining !== undefined && timeRemaining > 0 ? (
                                    <span>{Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')} left</span>
                                  ) : (
                                    <span>Finalizing...</span>
                                  )}
                                </span>
                              ) : 'Generate'}
                            </Button>
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        {isGenerating && timeRemaining !== undefined && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-neutral-500">
                              <span>Generating video...</span>
                              <span>{Math.round(((120 - timeRemaining) / 120) * 100)}%</span>
                            </div>
                            <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 transition-all duration-1000"
                                style={{ width: `${((120 - timeRemaining) / 120) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Error message */}
                        {error && (
                          <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded">
                            Error: {error}
                          </div>
                        )}

                        {/* Video preview */}
                        {videoUrl && (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={(selectedClipsForMerge[variation.style] || []).includes(videoUrl)}
                                onChange={() => toggleClipSelection(variation.style, videoUrl)}
                                className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                              />
                              <span className="text-xs text-neutral-400">Select for merge</span>
                            </div>
                            <video
                              src={videoUrl}
                              controls
                              className="w-full rounded-lg max-h-[300px]"
                            />
                          </div>
                        )}

                        {/* Prompt preview */}
                        <pre className="text-[10px] bg-neutral-950 p-2 rounded overflow-x-auto max-h-[150px] overflow-y-auto whitespace-pre-wrap font-mono">
                          {segment}
                        </pre>
                      </li>
                    );
                  })}
                </ol>

                {/* Merge Section */}
                {(selectedClipsForMerge[variation.style] || []).length > 0 && (
                  <div className="mt-6 border-t border-neutral-800 pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">Merge Selected Segments</h3>
                        <p className="text-xs text-neutral-500 mt-1">
                          {(selectedClipsForMerge[variation.style] || []).length} clips selected
                        </p>
                      </div>
                      <Button
                        onClick={() => handleMergeClips(variation.style)}
                        disabled={mergingStyles.has(variation.style) || (selectedClipsForMerge[variation.style] || []).length < 2}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                      >
                        {mergingStyles.has(variation.style) ? 'Merging...' : 'Merge Videos'}
                      </Button>
                    </div>

                    {mergeErrorByStyle[variation.style] && (
                      <div className="text-xs text-red-400 bg-red-900/20 p-3 rounded border border-red-900/50">
                        {mergeErrorByStyle[variation.style]}
                      </div>
                    )}

                    {mergedVideoByStyle[variation.style] && (
                      <div className="bg-neutral-800/50 border border-neutral-700 rounded-md p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-green-400">✓ Full Video Generated</h4>
                          <a
                            href={mergedVideoByStyle[variation.style]}
                            download={`veo_merge_${variation.style}.mp4`}
                            className="text-xs text-blue-400 hover:underline"
                          >
                            Download
                          </a>
                        </div>
                        <video
                          src={mergedVideoByStyle[variation.style]}
                          controls
                          className="w-full max-h-96 rounded-md border border-neutral-700 bg-black"
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Veo Generation Modal */}
      {showVeoModal && currentPromptForModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowVeoModal(false)}
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Veo 3 Generation Settings</h2>
              <button
                onClick={() => setShowVeoModal(false)}
                className="text-neutral-400 hover:text-neutral-200 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {veoModelsLoading ? (
                <div className="text-center py-8 text-neutral-400">Loading models...</div>
              ) : (
                <>
                  {/* Aspect Ratio */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Aspect Ratio</label>
                    <select
                      value={aspectRatio}
                      onChange={(e) => {
                        setAspectRatio(e.target.value);
                        // Auto-select best model for new aspect ratio
                        const bestModel = findBestModel(veoModels, e.target.value);
                        if (bestModel) setSelectedModel(bestModel.key);
                      }}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="VIDEO_ASPECT_RATIO_PORTRAIT">Portrait (9:16)</option>
                      <option value="VIDEO_ASPECT_RATIO_LANDSCAPE">Landscape (16:9)</option>
                    </select>
                    <p className="text-xs text-neutral-500">Select video orientation</p>
                  </div>

                  {/* Model Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Model</label>
                    <select
                      value={selectedModel || ""}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm font-mono"
                    >
                      {veoModels
                        .filter(m =>
                          m.capabilities.includes("VIDEO_MODEL_CAPABILITY_TEXT") &&
                          m.supportedAspectRatios.includes(aspectRatio)
                        )
                        .map(model => (
                          <option key={model.key} value={model.key}>
                            {model.displayName} - {model.key}
                            {model.creditCost ? ` (${model.creditCost} credits)` : " (Ultra tier)"}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Model Details */}
                  {selectedModel && (() => {
                    const model = veoModels.find(m => m.key === selectedModel);
                    if (!model) return null;
                    return (
                      <div className="bg-neutral-800/50 border border-neutral-700 rounded-md p-4 space-y-3">
                        <h3 className="text-sm font-semibold">Model Details</h3>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-neutral-400">Display Name:</span>
                            <div className="font-medium">{model.displayName}</div>
                          </div>
                          <div>
                            <span className="text-neutral-400">Model Key:</span>
                            <div className="font-mono text-[10px]">{model.key}</div>
                          </div>
                          <div>
                            <span className="text-neutral-400">Credit Cost:</span>
                            <div className="font-medium">{model.creditCost || "Ultra tier (no cost)"}</div>
                          </div>
                          <div>
                            <span className="text-neutral-400">Generation Time:</span>
                            <div className="font-medium">{model.videoGenerationTimeSeconds || "N/A"}s</div>
                          </div>
                          <div>
                            <span className="text-neutral-400">Video Length:</span>
                            <div className="font-medium">{model.videoLengthSeconds}s</div>
                          </div>
                          <div>
                            <span className="text-neutral-400">Frame Rate:</span>
                            <div className="font-medium">{model.framesPerSecond} fps</div>
                          </div>
                          <div className="col-span-2">
                            <span className="text-neutral-400">Capabilities:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {model.capabilities.map(cap => (
                                <span key={cap} className="px-2 py-0.5 bg-neutral-700 rounded text-[10px]">
                                  {cap.replace("VIDEO_MODEL_CAPABILITY_", "")}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <span className="text-neutral-400">Metadata:</span>
                            <div className="text-[10px] font-mono mt-1">
                              {model.modelMetadata.veoModelName || "N/A"}
                              {model.modelMetadata.modelQuality && ` • ${model.modelMetadata.modelQuality}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Seed */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Seed</label>
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(parseInt(e.target.value) || 9831)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-neutral-500">Random seed for reproducibility</p>
                  </div>

                  {/* Prompt Preview */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prompt Preview</label>
                    <div className="bg-neutral-800 border border-neutral-700 rounded-md p-3 text-xs max-h-32 overflow-y-auto">
                      {currentPromptForModal.text.substring(0, 500)}...
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                    <Button
                      variant="outline"
                      onClick={() => setShowVeoModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleGenerateVideo}
                      disabled={!selectedModel || veoGeneratingKeys.has(currentPromptForModal.key)}
                      className="bg-gradient-to-r from-photon-500 to-photon-600 hover:from-photon-600 hover:to-photon-700"
                    >
                      Generate Video
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
