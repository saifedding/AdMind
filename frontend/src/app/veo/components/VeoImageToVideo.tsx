'use client';

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Loader2, Play, Image as ImageIcon, Sparkles, Video } from 'lucide-react';
import { uploadImageForVideo, adsApi, type VeoModel } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface VeoImageToVideoProps {
  aspectRatio: 'VIDEO_ASPECT_RATIO_PORTRAIT' | 'VIDEO_ASPECT_RATIO_LANDSCAPE' | 'VIDEO_ASPECT_RATIO_SQUARE';
  onSessionLoaded?: (sessionId: number) => void;
}

interface GeneratedPrompt {
  index: number;
  text: string;
  startFrame: string | null; // media_id or base64
  endFrame: string | null;
  generatingVideo: boolean;
  videoUrl: string | null;
  segmentId: number | null; // Database segment ID for saving videos
}

export const VeoImageToVideo = forwardRef<{ loadSession: (sessionId: number) => Promise<void> }, VeoImageToVideoProps>(
  ({ aspectRatio, onSessionLoaded }, ref) => {
  // Image upload state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageMediaId, setUploadedImageMediaId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageHistory, setImageHistory] = useState<Array<{base64: string, mediaId: string, timestamp: number}>>([]);

  // Script and analysis state
  const [script, setScript] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [prompts, setPrompts] = useState<GeneratedPrompt[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);

  // Voice controls
  const [voiceEnergy, setVoiceEnergy] = useState('Professional');
  const [language, setLanguage] = useState('English');
  const [accent, setAccent] = useState('Neutral');

  // Image-to-Video generation settings
  const [style, setStyle] = useState('informative');
  const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash-lite');
  const [videoModels, setVideoModels] = useState<VeoModel[]>([]);
  const [videoModelsLoading, setVideoModelsLoading] = useState(false);
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>('veo_3_1_i2v_s_fast_portrait_ultra_fl');

  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load image history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('veo_image_history');
    if (stored) {
      try {
        const history = JSON.parse(stored);
        // Keep only last 10 images
        setImageHistory(history.slice(0, 10));
      } catch (e) {
        console.error('Failed to load image history', e);
      }
    }
  }, []);

  // Load available Veo image-to-video models (for final video generation)
  useEffect(() => {
    const loadImageModels = async () => {
      try {
        setVideoModelsLoading(true);
        const res = await adsApi.getVeoModels();
        const models = res?.result?.data?.json?.result?.videoModels || [];
        // Heuristic: image-to-video models usually have "i2v" in the key
        const imageModels = (models as VeoModel[]).filter((m) =>
          m.key.includes('i2v') && (m.supportedAspectRatios || []).includes(aspectRatio)
        );
        setVideoModels(imageModels);
        if (imageModels.length) {
          const current = imageModels.find((m) => m.key === selectedVideoModel);
          setSelectedVideoModel(current ? current.key : imageModels[0].key);
        }
      } catch (err) {
        console.error('Failed to load image-to-video models:', err);
        toast.error('Failed to load image-to-video models');
      } finally {
        setVideoModelsLoading(false);
      }
    };

    loadImageModels();
  }, [aspectRatio]);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        setUploadedImage(base64);

        // Upload to backend
        const result = await uploadImageForVideo({
          image_base64: base64,
          aspect_ratio: aspectRatio === 'VIDEO_ASPECT_RATIO_PORTRAIT' ? 'IMAGE_ASPECT_RATIO_PORTRAIT'
            : aspectRatio === 'VIDEO_ASPECT_RATIO_LANDSCAPE' ? 'IMAGE_ASPECT_RATIO_LANDSCAPE'
              : 'IMAGE_ASPECT_RATIO_SQUARE'
        });

        if (result.success && result.media_id) {
          setUploadedImageMediaId(result.media_id);
          
          // Add to history
          const newHistoryItem = { base64, mediaId: result.media_id, timestamp: Date.now() };
          const newHistory = [newHistoryItem, ...imageHistory].slice(0, 10);
          setImageHistory(newHistory);
          localStorage.setItem('veo_image_history', JSON.stringify(newHistory));
          
          toast.success('Image uploaded successfully!');
        } else {
          throw new Error(result.error || 'Failed to upload image');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
      toast.error('Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAnalyzeAndGenerate = async () => {
    if (!uploadedImage || !script.trim()) {
      toast.error('Please upload an image and enter a script');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setPrompts([]);

    try {
      // Call the creative brief generation API with image
      const response = await adsApi.createVeoSession({
        script: script.trim(),
        styles: [style],
        model: geminiModel,
        aspect_ratio: aspectRatio,
        video_model_key: selectedVideoModel,
        image_path: uploadedImage,
        voice_energy: voiceEnergy !== 'Professional' ? voiceEnergy : undefined,
        language: language !== 'English' ? language : undefined,
        accent: accent !== 'Neutral' ? accent : undefined,
        workflow_type: 'image-to-video', // Trigger animation-focused template
      });

      // Store session ID for video saving
      setCurrentSessionId(response.id);

      // Extract prompts from response with segment IDs
      const generatedPrompts: GeneratedPrompt[] = [];
      response.briefs.forEach((brief) => {
        brief.segments.forEach((segment, idx) => {
          generatedPrompts.push({
            index: generatedPrompts.length,
            text: segment.current_prompt,
            startFrame: uploadedImageMediaId, // Default to uploaded image
            endFrame: null,
            generatingVideo: false,
            videoUrl: null,
            segmentId: segment.id, // Store segment ID for saving videos
          });
        });
      });

      setPrompts(generatedPrompts);
      toast.success(`Generated ${generatedPrompts.length} prompts!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image and generate prompts');
      toast.error('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateVideoForPrompt = async (promptIndex: number) => {
    const prompt = prompts[promptIndex];
    if (!prompt.startFrame) {
      toast.error('Please select a start frame for this prompt');
      return;
    }

    // Update state to show generating
    setPrompts(prev => prev.map((p, idx) =>
      idx === promptIndex ? { ...p, generatingVideo: true } : p
    ));

    try {
      // Generate video using the prompt and frames
      const result = await adsApi.generateVideoFromImages({
        start_image_media_id: prompt.startFrame,
        end_image_media_id: prompt.endFrame || undefined,
        prompt: prompt.text,
        aspect_ratio: aspectRatio,
        video_model_key: selectedVideoModel,
        timeout_sec: 600,
        poll_interval_sec: 5,
      });

      if (result.success && result.video_url) {
        // Update local state
        setPrompts(prev => prev.map((p, idx) =>
          idx === promptIndex ? { ...p, generatingVideo: false, videoUrl: result.video_url || null } : p
        ));

        // Save video to database segment if we have a segment ID
        if (prompt.segmentId) {
          try {
            await adsApi.saveVideoToSegment(prompt.segmentId, {
              video_url: result.video_url,
              prompt_used: prompt.text,
              model_key: selectedVideoModel,
              aspect_ratio: aspectRatio,
              seed: result.seed,
              generation_time_seconds: result.generation_time_seconds,
            });
          } catch (saveErr) {
            console.error('Failed to save video to database:', saveErr);
            // Don't fail the whole operation, video is still generated
          }
        }

        toast.success('Video generated and saved!');
      } else {
        throw new Error(result.error || 'Failed to generate video');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate video');
      toast.error('Video generation failed');
      setPrompts(prev => prev.map((p, idx) =>
        idx === promptIndex ? { ...p, generatingVideo: false } : p
      ));
    }
  };

  const clearImage = () => {
    setUploadedImage(null);
    setUploadedImageMediaId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const selectFromHistory = (item: {base64: string, mediaId: string, timestamp: number}) => {
    setUploadedImage(item.base64);
    setUploadedImageMediaId(item.mediaId);
    toast.success('Image selected from history');
  };

  const loadSession = async (sessionId: number) => {
    try {
      const session = await adsApi.getVeoSession(sessionId);
      
      // Load script
      setScript(session.script);
      
      // Load session ID
      setCurrentSessionId(session.id);
      
      // Extract prompts with their videos
      const loadedPrompts: GeneratedPrompt[] = [];
      session.briefs.forEach((brief) => {
        brief.segments.forEach((segment) => {
          const video = segment.videos && segment.videos.length > 0 ? segment.videos[0] : null;
          loadedPrompts.push({
            index: loadedPrompts.length,
            text: segment.current_prompt,
            startFrame: null, // Would need to store this in session metadata
            endFrame: null,
            generatingVideo: false,
            videoUrl: video ? video.video_url : null,
            segmentId: segment.id,
          });
        });
      });
      
      setPrompts(loadedPrompts);
      
      if (onSessionLoaded) {
        onSessionLoaded(sessionId);
      }
      
      toast.success('Session loaded from history');
    } catch (err) {
      console.error('Failed to load session:', err);
      toast.error('Failed to load session from history');
    }
  };

  // Expose loadSession to parent component via ref
  useImperativeHandle(ref, () => ({
    loadSession
  }));

  return (
    <div className="space-y-6">
      {/* Step 1: Image Upload & Script */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-xl text-slate-200 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-purple-400" />
            Step 1: Upload Image & Script
          </CardTitle>
          <CardDescription className="text-slate-400">
            Upload a reference image and provide your script to generate animation prompts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">Reference Image</Label>
              {imageHistory.length > 0 && !uploadedImage && (
                <span className="text-xs text-slate-500">{imageHistory.length} in history</span>
              )}
            </div>
            {uploadedImage ? (
              <div className="relative group">
                <img
                  src={uploadedImage}
                  alt="Uploaded reference"
                  className="w-full h-48 object-cover rounded-lg border border-slate-700"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={clearImage}
                  disabled={uploadingImage}
                >
                  <X className="w-4 h-4" />
                </Button>
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
                {uploadedImageMediaId && !uploadingImage && (
                  <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                    ✓ Ready
                  </div>
                )}
              </div>
            ) : (
              <div
                className="w-full h-48 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-purple-500/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleImageUpload(file);
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <Upload className="w-8 h-8 text-slate-500 mb-2" />
                <p className="text-sm text-slate-400">Click or drag image to upload</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
              disabled={uploadingImage}
            />
            
            {/* Image History */}
            {imageHistory.length > 0 && !uploadedImage && (
              <div className="mt-3">
                <Label className="text-xs text-slate-400 mb-2 block">Recent Uploads (Click to reuse)</Label>
                <div className="grid grid-cols-4 gap-2">
                  {imageHistory.slice(0, 8).map((item, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 cursor-pointer hover:border-purple-500 transition-colors group"
                      onClick={() => selectFromHistory(item)}
                    >
                      <img
                        src={item.base64}
                        alt={`Upload ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Script Input */}
          <div className="space-y-2">
            <Label className="text-slate-300">Script / Voice-Over</Label>
            <Textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Enter your script here... The AI will analyze the image and create animation prompts based on this script."
              className="min-h-[120px] bg-slate-800/50 border-slate-700 text-slate-200"
              disabled={analyzing}
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>{script.split(/\s+/).filter(Boolean).length} words</span>
              <span>~{Math.ceil(script.split(/\s+/).filter(Boolean).length / 3)}s duration</span>
            </div>
          </div>

          {/* Voice Controls */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Voice Energy</Label>
              <Select value={voiceEnergy} onValueChange={setVoiceEnergy}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="High Energy">High Energy</SelectItem>
                  <SelectItem value="Calm">Calm</SelectItem>
                  <SelectItem value="Excited">Excited</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Arabic">Arabic</SelectItem>
                  <SelectItem value="Spanish">Spanish</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Accent</Label>
              <Select value={accent} onValueChange={setAccent}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="Neutral">Neutral</SelectItem>
                  <SelectItem value="American">American</SelectItem>
                  <SelectItem value="British">British</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Image-to-Video Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="informative">Informative</SelectItem>
                  <SelectItem value="podcast">Podcast</SelectItem>
                  <SelectItem value="walking">Walking</SelectItem>
                  <SelectItem value="testimonial">Testimonial</SelectItem>
                  <SelectItem value="product_demo">Product Demo</SelectItem>
                  <SelectItem value="cinematic">Cinematic</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="tutorial">Tutorial</SelectItem>
                  <SelectItem value="motivational">Motivational</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Gemini Model</Label>
              <Select value={geminiModel} onValueChange={setGeminiModel}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {/* Gemini models (same as text-to-video) */}
                  <SelectItem value="gemini-2.0-flash-001">✨ Gemini 2.0 Flash (Gemini)</SelectItem>
                  <SelectItem value="gemini-2.0-flash-lite">⚡ Gemini 2.0 Flash-Lite (Gemini)</SelectItem>
                  <SelectItem value="gemini-2.5-flash-001">🚀 Gemini 2.5 Flash (Gemini)</SelectItem>
                  <SelectItem value="gemini-2.5-flash-preview-09-2025">🧪 Gemini 2.5 Flash Preview (Gemini)</SelectItem>
                  <SelectItem value="gemini-2.5-flash-lite">⚡ Gemini 2.5 Flash-Lite (Gemini)</SelectItem>
                  <SelectItem value="gemini-2.5-flash-lite-preview-09-2025">🌟 Gemini 2.5 Flash-Lite Preview (Gemini)</SelectItem>
                  <SelectItem value="gemini-2.5-pro">🎯 Gemini 2.5 Pro (Gemini)</SelectItem>
                  <SelectItem value="gemini-3-pro-preview">👑 Gemini 3 Pro Preview (Gemini)</SelectItem>
                  {/* OpenRouter models */}
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
            </div>
          </div>

          {/* Video generation model for Image-to-Video */}
          <div className="space-y-2 mt-3">
            <Label className="text-xs text-slate-400">Video Generation Model</Label>
            <Select value={selectedVideoModel} onValueChange={setSelectedVideoModel}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300 h-9">
                <SelectValue placeholder="Select Image-to-Video Model" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 max-h-[260px]">
                {videoModelsLoading ? (
                  <div className="p-2 text-xs text-slate-500">Loading models...</div>
                ) : videoModels.length === 0 ? (
                  <div className="p-2 text-xs text-slate-500">No image-to-video models found</div>
                ) : (
                  videoModels.map((m) => (
                    <SelectItem key={m.key} value={m.key} className="py-2">
                      <div className="flex flex-col text-left">
                        <span>{m.displayName || m.key}</span>
                        <span className="text-[10px] text-slate-500">
                          {(m.videoLengthSeconds ? `${m.videoLengthSeconds}s` : '')}
                          {m.creditCost ? ` • ${m.creditCost} credits` : ''}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyzeAndGenerate}
            disabled={!uploadedImageMediaId || !script.trim() || analyzing || uploadingImage}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            size="lg"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Image & Generating Prompts...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze & Generate Prompts
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 2: Generated Prompts */}
      {prompts.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-xl text-slate-200 flex items-center gap-2">
              <Video className="w-5 h-5 text-purple-400" />
              Step 2: Generated Prompts ({prompts.length})
            </CardTitle>
            <CardDescription className="text-slate-400">
              Each prompt can be generated as a video with custom start/end frames.
              Current settings: Style <span className="font-semibold">{style}</span>, Gemini model <span className="font-semibold">{geminiModel}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {prompts.map((prompt, idx) => (
              <Card key={idx} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 space-y-3">
                  {/* Prompt Text */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-purple-400">Segment {idx + 1}</span>
                    </div>
                    <Textarea
                      value={prompt.text}
                      readOnly
                      className="min-h-[80px] bg-slate-900/50 border-slate-600 text-slate-200 text-xs"
                    />
                  </div>

                  {/* Frame Selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Start Frame</Label>
                      <div className="text-xs text-green-400">Using uploaded image</div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">End Frame</Label>
                      <div className="text-xs text-slate-500">None (optional)</div>
                    </div>
                  </div>

                  {/* Generate Video Button */}
                  <Button
                    onClick={() => handleGenerateVideoForPrompt(idx)}
                    disabled={prompt.generatingVideo}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    size="sm"
                  >
                    {prompt.generatingVideo ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Generating Video...
                      </>
                    ) : prompt.videoUrl ? (
                      <>
                        <Play className="w-3 h-3 mr-2" />
                        Regenerate Video
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 mr-2" />
                        Generate Video
                      </>
                    )}
                  </Button>

                  {/* Generated Video */}
                  {prompt.videoUrl && (
                    <div className="pt-2 border-t border-slate-700">
                      <video
                        src={prompt.videoUrl}
                        controls
                        autoPlay
                        loop
                        className="w-full rounded-lg border border-slate-600"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
});

VeoImageToVideo.displayName = 'VeoImageToVideo';
