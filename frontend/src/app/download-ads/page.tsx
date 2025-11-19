"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { adsApi, AnalyzeVideoResponse, VeoModel } from "@/lib/api";
import { DashboardLayout } from "@/components/dashboard";
import { Button } from "@/components/ui/button";

type DownloadFromLibraryRequest = {
  ad_library_url?: string;
  ad_archive_id?: string;
  media_type?: "video" | "image" | "all";
  download?: boolean;
};

type DownloadedFileInfo = {
  url: string;
  local_path?: string;
  public_url?: string;
  file_size?: number;
};

type MediaItem = {
  type: 'video' | 'image';
  url: string;
  quality?: string;
};

type DownloadFromLibraryResponse = {
  success: boolean;
  ad_archive_id: string;
  page_id?: string;
  ad_id?: number;
  video_urls: string[];
  image_urls: string[];
  video_hd_urls: string[];
  video_sd_urls: string[];
  downloaded: DownloadedFileInfo[];
  media: MediaItem[];
  save_path?: string;
  message: string;
};

export default function DownloadAdsPage() {
  const router = useRouter();
  const [input, setInput] = useState<string>("https://www.facebook.com/ads/library/?id=1165490822069878");
  const [download, setDownload] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<DownloadFromLibraryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analysisByUrl, setAnalysisByUrl] = useState<Record<string, AnalyzeVideoResponse>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyTotal, setHistoryTotal] = useState<number>(0);
  const [historyPageSize] = useState<number>(20);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [selectedAnalysisUrl, setSelectedAnalysisUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'analysis' | 'prompts'>('analysis');
  const [editedPromptsByUrl, setEditedPromptsByUrl] = useState<Record<string, string[]>>({});
  const [savedPromptKey, setSavedPromptKey] = useState<string | null>(null);
  const [veoGeneratingKeys, setVeoGeneratingKeys] = useState<Set<string>>(new Set());
  const [veoVideoByPromptKey, setVeoVideoByPromptKey] = useState<Record<string, string | null>>({});
  const [veoErrorByPromptKey, setVeoErrorByPromptKey] = useState<Record<string, string | null>>({});
  const [veoGenerationsByPromptKey, setVeoGenerationsByPromptKey] = useState<Record<string, any>>({});
  const [showArchivedGenerations, setShowArchivedGenerations] = useState<boolean>(false);
  const [archivedGenerationsByPromptKey, setArchivedGenerationsByPromptKey] = useState<Record<string, any[]>>({});
  const [generationTimeRemaining, setGenerationTimeRemaining] = useState<Record<string, number>>({});
  const [generationStartTime, setGenerationStartTime] = useState<Record<string, number>>({});
  const [generationIntervals, setGenerationIntervals] = useState<Record<string, NodeJS.Timeout>>({});
  const [actualGenerationTime, setActualGenerationTime] = useState<Record<string, number>>({});
  const [selectedClipsForMerge, setSelectedClipsForMerge] = useState<Record<number, string>>({});  // promptIndex -> video_url
  const [mergingVideos, setMergingVideos] = useState<boolean>(false);
  const [mergedVideoUrl, setMergedVideoUrl] = useState<string | null>(null);
  const [mergedVideoSystemPath, setMergedVideoSystemPath] = useState<string | null>(null);
  const [lastMergeSignature, setLastMergeSignature] = useState<string | null>(null);
  const [downloadingClips, setDownloadingClips] = useState<boolean>(false);
  const [downloadedFolder, setDownloadedFolder] = useState<string | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<any>(null);
  const [showCustomInstructionPopup, setShowCustomInstructionPopup] = useState<boolean>(false);
  const [customInstruction, setCustomInstruction] = useState<string>('');
  const [regeneratingWithInstruction, setRegeneratingWithInstruction] = useState<boolean>(false);
  const [pendingAnalyzeUrl, setPendingAnalyzeUrl] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);
  const [lastDownloadSignature, setLastDownloadSignature] = useState<string | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergeHistory, setMergeHistory] = useState<any[]>([]);
  const [showMergeHistory, setShowMergeHistory] = useState<boolean>(false);
  const [chatQuestion, setChatQuestion] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "model"; text: string; at: string; tokens?: any }[]>([]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [showVeoModal, setShowVeoModal] = useState<boolean>(false);
  const [veoModels, setVeoModels] = useState<VeoModel[]>([]);
  const [veoModelsLoading, setVeoModelsLoading] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [currentPromptForModal, setCurrentPromptForModal] = useState<{ text: string; key: string } | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("VIDEO_ASPECT_RATIO_PORTRAIT");
  const [seed, setSeed] = useState<number>(9831);
  const [analysisHistory, setAnalysisHistory] = useState<any>(null);
  const [showAnalysisHistory, setShowAnalysisHistory] = useState<boolean>(false);
  const [selectedAnalysisVersion, setSelectedAnalysisVersion] = useState<number | null>(null);

  const parseId = (value: string): string | null => {
    try {
      if (/^\d+$/.test(value.trim())) return value.trim();
      const url = new URL(value.trim());
      const id = url.searchParams.get("id");
      return id;
    } catch {
      return null;
    }
  };

  const handleAnalyze = async (videoUrl: string, customInstructionText?: string) => {
    try {
      setAnalyzing(videoUrl);
      setError(null);

      // If it's an Instagram preview URL, use the original Instagram URL from video_urls
      let actualVideoUrl = videoUrl;
      if (videoUrl.includes('/media/downloads/instagram_preview/') && result?.video_urls?.[0]) {
        actualVideoUrl = result.video_urls[0];
        console.log('Using original Instagram URL for analysis:', actualVideoUrl);
      }

      // Always use the /ads/{ad_id}/analyze endpoint which handles Instagram URLs properly
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/ads/${result?.ad_id}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_url: actualVideoUrl,
          custom_instruction: customInstructionText || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const res: AnalyzeVideoResponse = await response.json();
      setAnalysisByUrl(prev => ({ ...prev, [videoUrl]: res }));
      setSelectedAnalysisUrl(videoUrl);

      // Always use AI-generated prompts from backend (no manual fallback)
      const basePrompts = res.generation_prompts || [];
      setEditedPromptsByUrl(prev => ({ ...prev, [videoUrl]: basePrompts }));

      // Load chat history from analysis if exists
      loadChatHistoryFromAnalysis(res);

      // Load analysis history if ad_id exists
      if (result?.ad_id) {
        loadAnalysisHistory(result.ad_id);
      }
    } catch (err: any) {
      setError(err?.message || "Analysis failed");
    } finally {
      setAnalyzing(null);
    }
  };

  const loadAnalysisHistory = async (adId: number) => {
    try {
      const history = await adsApi.getAdAnalysisHistory(adId);
      setAnalysisHistory(history);
    } catch (err: any) {
      // Ad was deleted - this is OK, just clear history
      if (err?.status === 404) {
        console.log('Ad not found - clearing analysis history');
        setAnalysisHistory([]);
      } else {
        console.error('Failed to load analysis history:', err);
      }
    }
  };

  const loadAnalysisVersion = async (adId: number, version: number, videoUrl: string) => {
    try {
      const analysis = await adsApi.getAdAnalysisByVersion(adId, version);
      setAnalysisByUrl(prev => ({ ...prev, [videoUrl]: analysis }));
      setSelectedAnalysisUrl(videoUrl);
      setSelectedAnalysisVersion(version);

      const basePrompts = analysis.generation_prompts || [];
      setEditedPromptsByUrl(prev => ({ ...prev, [videoUrl]: basePrompts }));

      // Load chat history when switching versions
      loadChatHistoryFromAnalysis(analysis);
    } catch (err: any) {
      setError(err?.message || "Failed to load analysis version");
    }
  };

  const loadChatHistoryFromAnalysis = (analysis: AnalyzeVideoResponse) => {
    // Extract chat history from raw response if available
    const raw = analysis.raw as any;
    if (raw?.gemini_chat_history && Array.isArray(raw.gemini_chat_history)) {
      const history = raw.gemini_chat_history;
      const messages: any[] = [];

      for (let i = 0; i < history.length; i++) {
        const msg = history[i];
        if (msg.role === 'user' || msg.role === 'model') {
          // Extract text from parts
          let text = '';
          if (msg.parts && Array.isArray(msg.parts)) {
            for (const part of msg.parts) {
              if (part.text) {
                text += part.text;
              }
            }
          }

          if (text && i > 0) { // Skip first message (initial analysis)
            messages.push({
              role: msg.role,
              text: text,
              at: new Date().toISOString()
            });
          }
        }
      }

      setChatMessages(messages);
    } else {
      setChatMessages([]);
    }
  };

  const handleRegenerateAnalysis = async (instruction: string) => {
    if (!result?.ad_id || !selectedAnalysisUrl) {
      setError("No analysis to regenerate");
      return;
    }

    try {
      setRegeneratingWithInstruction(true);
      setError(null);

      const res = await adsApi.regenerateAdAnalysis(result.ad_id, { instruction });

      // Update analysis with new version
      setAnalysisByUrl(prev => ({ ...prev, [selectedAnalysisUrl]: res }));

      // Update prompts
      const basePrompts = res.generation_prompts || [];
      setEditedPromptsByUrl(prev => ({ ...prev, [selectedAnalysisUrl]: basePrompts }));

      // Reload analysis history to show new version
      if (result?.ad_id) {
        loadAnalysisHistory(result.ad_id);
      }

      // Clear chat since we have a new analysis version
      setChatMessages([]);
      setChatQuestion("");
    } catch (err: any) {
      setError(err?.message || "Regeneration failed");
    } finally {
      setRegeneratingWithInstruction(false);
    }
  };

  const openVeoModal = async (promptText: string, promptKey: string) => {
    setCurrentPromptForModal({ text: promptText, key: promptKey });
    setShowVeoModal(true);

    // Auto-detect aspect ratio from prompt
    const detectedAspect = detectAspectRatioFromPrompt(promptText);
    setAspectRatio(detectedAspect);

    // Load models if not already loaded
    if (veoModels.length === 0) {
      try {
        setVeoModelsLoading(true);
        const res = await adsApi.getVeoModels();
        const models = res?.result?.data?.json?.result?.videoModels || [];
        // Filter out deprecated models and sort by quality/speed
        const activeModels = models.filter((m: VeoModel) => m.modelStatus !== "MODEL_STATUS_DEPRECATED");
        setVeoModels(activeModels);

        // Auto-select best model for detected aspect ratio
        const bestModel = findBestModel(activeModels, detectedAspect);
        if (bestModel) {
          setSelectedModel(bestModel.key);
        }
      } catch (err: any) {
        console.error("Failed to load Veo models:", err);
      } finally {
        setVeoModelsLoading(false);
      }
    } else {
      // Models already loaded, just auto-select best one
      const bestModel = findBestModel(veoModels, detectedAspect);
      if (bestModel) {
        setSelectedModel(bestModel.key);
      }
    }
  };

  const detectAspectRatioFromPrompt = (prompt: string): string => {
    const lower = prompt.toLowerCase();
    if (lower.includes("9:16") || lower.includes("portrait") || lower.includes("vertical")) {
      return "VIDEO_ASPECT_RATIO_PORTRAIT";
    }
    if (lower.includes("16:9") || lower.includes("landscape") || lower.includes("widescreen")) {
      return "VIDEO_ASPECT_RATIO_LANDSCAPE";
    }
    // Default to portrait for social media ads
    return "VIDEO_ASPECT_RATIO_PORTRAIT";
  };

  const findBestModel = (models: VeoModel[], aspectRatio: string): VeoModel | null => {
    // Filter models that support text-to-video and the desired aspect ratio
    const compatible = models.filter(m =>
      m.capabilities.includes("VIDEO_MODEL_CAPABILITY_TEXT") &&
      m.supportedAspectRatios.includes(aspectRatio)
    );

    if (compatible.length === 0) return null;

    // Prefer Veo 3.1 Fast models (good balance of quality and speed)
    const veo31Fast = compatible.find(m => m.key.includes("veo_3_1") && m.key.includes("fast"));
    if (veo31Fast) return veo31Fast;

    // Fallback to any compatible model
    return compatible[0];
  };

  const loadVeoGenerationsForAd = async (adId: number) => {
    try {
      // Load current generations
      const currentGens = await adsApi.getVeoGenerations(adId, false);
      const byPromptKey: Record<string, string> = {};
      const metadataByKey: Record<string, any> = {};
      const byPromptHash: Record<string, any> = {};

      currentGens.forEach(gen => {
        // Store by prompt hash for matching with prompts
        if (gen.prompt_hash) {
          byPromptHash[gen.prompt_hash] = gen;
        }
        // Also store by generation ID as fallback
        const key = gen.prompt_hash || `gen:${gen.id}`;
        byPromptKey[key] = gen.video_url;
        metadataByKey[key] = gen;
      });

      setVeoVideoByPromptKey(prev => ({ ...prev, ...byPromptKey }));
      setVeoGenerationsByPromptKey(prev => ({ ...prev, ...metadataByKey, ...byPromptHash }));

      // Load archived generations
      const allGens = await adsApi.getVeoGenerations(adId, true);
      console.log('All generations loaded:', allGens.length);
      const archivedByHash: Record<string, any[]> = {};

      allGens.forEach(gen => {
        console.log('Generation:', gen.id, 'is_current:', gen.is_current, 'prompt_hash:', gen.prompt_hash);
        if (gen.is_current === 0) {
          const hash = gen.prompt_hash || `gen:${gen.id}`;
          if (!archivedByHash[hash]) {
            archivedByHash[hash] = [];
          }
          archivedByHash[hash].push(gen);
        }
      });

      console.log('Archived generations by hash:', archivedByHash);

      // Sort archived by version number descending
      Object.keys(archivedByHash).forEach(hash => {
        archivedByHash[hash].sort((a, b) => b.version_number - a.version_number);
      });

      setArchivedGenerationsByPromptKey(archivedByHash);

      return { currentGens, byPromptHash };
    } catch (err: any) {
      // Ad was deleted - this is OK
      if (err?.status === 404) {
        console.log('Ad not found - clearing Veo generations');
      } else {
        console.error("Failed to load Veo generations:", err);
      }
      return { currentGens: [], byPromptHash: {} };
    }
  };

  // Helper to create prompt hash (same algorithm as backend - SHA256)
  const createPromptHash = async (prompt: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(prompt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    // Return first 16 characters like backend
    return hashHex.substring(0, 16);
  };

  // Match saved generations to prompts when switching to Prompts tab
  const handleDownloadSelectedClips = async () => {
    try {
      setDownloadingClips(true);
      setDownloadedFolder(null);
      setDownloadProgress(null);

      // Get selected video URLs in order
      const sortedIndices = Object.keys(selectedClipsForMerge)
        .map(k => parseInt(k))
        .sort((a, b) => a - b);

      const videoUrls = sortedIndices.map(idx => selectedClipsForMerge[idx]);

      // Get clip metadata (prompt names and versions)
      const analysis = selectedAnalysisUrl ? analysisByUrl[selectedAnalysisUrl] : null;
      const prompts = analysis?.generation_prompts || [];
      const clipMetadata = sortedIndices.map(idx => {
        const promptKey = `${selectedAnalysisUrl}:prompt:${idx + 1}`;
        const currentGen = veoGenerationsByPromptKey[promptKey];
        return {
          prompt_name: `Prompt_${idx + 1}`,
          version: currentGen?.version_number || 1
        };
      });

      // Create signature for this download
      const downloadSignature = videoUrls.join('|');

      // Check if same clips were already downloaded
      if (lastDownloadSignature === downloadSignature && downloadedFolder) {
        console.log('Same clips already downloaded, showing existing folder');
        alert('These clips were already downloaded to:\n' + downloadedFolder);
        setDownloadingClips(false);
        return;
      }

      // Set initial progress
      setDownloadProgress({ current: 0, total: videoUrls.length });

      // Simulate progress updates (estimate 2-3 seconds per clip)
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (!prev || prev.current >= prev.total) return prev;
          return { ...prev, current: prev.current + 1 };
        });
      }, 2500); // Update every 2.5 seconds

      // Call backend to download clips
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const downloadResponse = await fetch(`${backendUrl}/api/v1/settings/ai/veo/download-clips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_urls: videoUrls,
          ad_id: result?.ad_id,
          clip_metadata: clipMetadata
        }),
      });

      clearInterval(progressInterval);

      const downloadResult = await downloadResponse.json();

      if (downloadResult.success) {
        setDownloadProgress({ current: videoUrls.length, total: videoUrls.length });
        setDownloadedFolder(downloadResult.folder_path);
        setDownloadInfo({
          adName: downloadResult.ad_name,
          reused: downloadResult.reused
        });
        setLastDownloadSignature(downloadSignature);

        if (downloadResult.reused) {
          console.log('Reused existing folder:', downloadResult.folder_path);
        } else {
          console.log('Downloaded to:', downloadResult.folder_path);
        }
      } else {
        throw new Error('Failed to download clips');
      }

    } catch (err: any) {
      console.error('Failed to download clips:', err);
      alert('Failed to download clips: ' + err.message);
    } finally {
      setDownloadingClips(false);
      setTimeout(() => setDownloadProgress(null), 2000);
    }
  };

  const handleMergeSelectedClips = async () => {
    if (Object.keys(selectedClipsForMerge).length < 2) {
      setMergeError("Please select at least 2 clips to merge");
      return;
    }

    try {
      setMergingVideos(true);
      setMergeError(null);

      // Get video URLs in prompt order (sorted by prompt index)
      const sortedIndices = Object.keys(selectedClipsForMerge)
        .map(k => parseInt(k))
        .sort((a, b) => a - b);

      const videoUrls = sortedIndices.map(idx => selectedClipsForMerge[idx]);

      // Create unique signature for this combination
      const mergeSignature = videoUrls.join('|');

      // Check if this is the same as last merge
      if (lastMergeSignature === mergeSignature && mergedVideoUrl) {
        console.log('Same video combination detected, using existing video');
        return; // Don't regenerate
      }

      const analysis = selectedAnalysisUrl ? analysisByUrl[selectedAnalysisUrl] : null;
      const res = await adsApi.mergeVeoVideos({
        video_urls: videoUrls,
        ad_id: result?.ad_id,
      });

      if (!res.success) {
        setMergeError(res.error || "Failed to merge videos");
        return;
      }

      // Use backend server URL for video access
      console.log('Merge response:', {
        publicUrl: res.public_url,
        systemPath: res.system_path
      });

      // Use backend server URL (http://localhost:8000) for video access
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const videoUrl = res.public_url ? `${backendUrl}${res.public_url}` : null;

      console.log('Using backend video URL:', videoUrl);
      setMergedVideoUrl(videoUrl);
      setMergedVideoSystemPath(videoUrl);

      // Store signature and reload merge history
      setLastMergeSignature(mergeSignature);
      if (result?.ad_id) {
        loadMergeHistory(result.ad_id);
      }
    } catch (err: any) {
      setMergeError(err?.message || "Failed to merge videos");
    } finally {
      setMergingVideos(false);
    }
  };

  const loadMergeHistory = async (adId: number) => {
    try {
      const history = await adsApi.getMergedVideos(adId);
      setMergeHistory(history);
    } catch (err: any) {
      // Ad was deleted - this is OK
      if (err?.status === 404) {
        console.log('Ad not found - clearing merge history');
        setMergeHistory([]);
      } else {
        console.error("Failed to load merge history:", err);
      }
    }
  };

  const toggleClipSelection = (promptIndex: number, videoUrl: string) => {
    setSelectedClipsForMerge(prev => {
      const next = { ...prev };
      if (next[promptIndex] === videoUrl) {
        // Deselect
        delete next[promptIndex];
      } else {
        // Select
        next[promptIndex] = videoUrl;
      }
      return next;
    });
  };

  const matchGenerationsToPrompts = async (prompts: string[], videoUrl: string) => {
    if (!result?.ad_id) return;

    const { currentGens, byPromptHash } = await loadVeoGenerationsForAd(result.ad_id);

    // Try to match each prompt with saved generations
    for (let index = 0; index < prompts.length; index++) {
      const prompt = prompts[index];
      const promptKey = `${videoUrl}:prompt:${index + 1}`;

      try {
        // Create hash to match with backend
        const hash = await createPromptHash(prompt);

        // Check if we have a saved generation for this prompt hash
        if (byPromptHash[hash]) {
          const gen = byPromptHash[hash];
          setVeoVideoByPromptKey(prev => ({ ...prev, [promptKey]: gen.video_url }));
          setVeoGenerationsByPromptKey(prev => ({ ...prev, [promptKey]: gen }));
          setActualGenerationTime(prev => ({ ...prev, [promptKey]: gen.generation_metadata?.actual_time || 0 }));
        } else {
          // Fallback: try to match by prompt text content directly
          const matchingGen = currentGens.find(g => g.prompt === prompt);
          if (matchingGen) {
            setVeoVideoByPromptKey(prev => ({ ...prev, [promptKey]: matchingGen.video_url }));
            setVeoGenerationsByPromptKey(prev => ({ ...prev, [promptKey]: matchingGen }));
            setActualGenerationTime(prev => ({ ...prev, [promptKey]: matchingGen.generation_metadata?.actual_time || 0 }));
          }
        }
      } catch (err) {
        console.error('Error matching generation:', err);
      }
    }
  };

  const handleGenerateVeoFromPrompt = async () => {
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
        ad_id: result?.ad_id,
      });

      if (!asyncRes.success || !asyncRes.task_id) {
        const msg = "Failed to start video generation";
        setVeoErrorByPromptKey(prev => ({ ...prev, [promptKey]: msg }));
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

            setGenerationStartTime(prev => {
              const next = { ...prev };
              delete next[promptKey];
              return next;
            });

            // Store the generation metadata (already saved by backend task)
            if (status.result.generation_id) {
              setVeoGenerationsByPromptKey(prev => ({
                ...prev, [promptKey]: {
                  id: status.result!.generation_id!,
                  video_url: status.result!.video_url,
                  prompt: promptText,
                  model_key: selectedModel,
                  aspect_ratio: aspectRatio,
                  seed: seed,
                  generation_metadata: { actual_time: actualTime }
                }
              }));
            }

            setVeoGeneratingKeys(prev => {
              const next = new Set(prev);
              next.delete(promptKey);
              return next;
            });

            console.log(`Generation complete for ${promptKey}: ${status.result.video_url}`);

          } else if (status.state === 'FAILURE') {
            // Generation failed
            clearInterval(pollInterval);
            const msg = status.error || "Video generation failed";
            setVeoErrorByPromptKey(prev => ({ ...prev, [promptKey]: msg }));

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

            setGenerationStartTime(prev => {
              const next = { ...prev };
              delete next[promptKey];
              return next;
            });

            setVeoGeneratingKeys(prev => {
              const next = new Set(prev);
              next.delete(promptKey);
              return next;
            });

            console.error(`Generation failed for ${promptKey}: ${msg}`);
          }
          // Otherwise keep polling (PENDING or PROGRESS state)

        } catch (pollErr: any) {
          console.error(`Error polling task status: ${pollErr.message}`);
          // Continue polling despite errors
        }
      }, 3000); // Poll every 3 seconds

      // Store poll interval so we can clean it up
      setGenerationIntervals(prev => ({ ...prev, [`${promptKey}_poll`]: pollInterval }));

    } catch (err: any) {
      setVeoErrorByPromptKey(prev => ({ ...prev, [promptKey]: err?.message || "Failed to generate Veo video" }));

      // Clear countdown and interval on error
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

      setGenerationStartTime(prev => {
        const next = { ...prev };
        delete next[promptKey];
        return next;
      });

      setVeoGeneratingKeys(prev => {
        const next = new Set(prev);
        next.delete(promptKey);
        return next;
      });
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const prevResult = result;

    const guessedId = parseId(input);
    const payload: DownloadFromLibraryRequest = guessedId
      ? { ad_archive_id: guessedId, media_type: "all", download }
      : { ad_library_url: input.trim(), media_type: "all", download };

    try {
      const res = await adsApi.downloadFromAdLibrary(payload);
      // If this is a different ad than the one currently analyzed,
      // clear any existing analysis/prompts so the UI doesn't show
      // stale analysis for a previous video.
      if (!prevResult || prevResult.ad_archive_id !== res.ad_archive_id) {
        setAnalysisByUrl({});
        setEditedPromptsByUrl({});
        setSelectedAnalysisUrl(null);
      }
      setResult(res);
      addToHistory(res);
      // Load saved Veo generations for this ad
      if (res.ad_id) {
        await loadVeoGenerationsForAd(res.ad_id);
      }
    } catch (err: any) {
      setError(err?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const loadCachedAnalysesForResult = async (_r: DownloadFromLibraryResponse) => {
    // no-op: analysis reuse now relies on backend DB via ad_id + persist
    return;
  };

  const stripTimestamps = (text: string): string => {
    if (!text) return "";
    // Remove bracketed timestamp ranges like [00:05], [00:01 → 00:03]
    let out = text.replace(/\[(?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d+)?(?:\s*[\u2192\-]\s*(?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d+)?)?\]\s*/g, "");
    // Remove standalone timestamps like 00:05 or 0:05 or 01:02:03
    out = out.replace(/\b(?:\d{1,2}:)?\d{1,2}:\d{2}\b/g, "");
    // Collapse extra spaces/newlines
    return out.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  };

  const buildScriptFromAnalysis = (a: AnalyzeVideoResponse): string => {
    if (a?.transcript) return stripTimestamps(a.transcript);
    if (a?.beats && a.beats.length) {
      const lines = a.beats.map(b => b.summary).filter(Boolean);
      return lines.join("\n");
    }
    return "";
  };

  const parseTs = (s?: string): number | null => {
    if (!s) return null;
    // Supports HH:MM:SS.mmm, MM:SS, M:SS
    const parts = s.split(':').map(Number);
    if (parts.some(isNaN)) return null;
    let sec = 0;
    if (parts.length === 3) {
      sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      sec = parts[0] * 60 + parts[1];
    } else {
      return null;
    }
    return sec;
  };


  const clearCurrentAnalysis = async () => {
    if (!selectedAnalysisUrl) return;
    // Best-effort: clear persisted analysis in DB if we have an ad_id
    try {
      if (result?.ad_id) {
        await adsApi.deleteAdAnalysis(result.ad_id);
      }
    } catch {
      // ignore errors; still clear from UI
    }
    setAnalysisByUrl(prev => {
      const next = { ...prev };
      delete next[selectedAnalysisUrl];
      return next;
    });
    setEditedPromptsByUrl(prev => {
      const next = { ...prev };
      delete next[selectedAnalysisUrl!];
      return next;
    });
    setSelectedAnalysisUrl(null);
    setChatMessages([]);
    setChatQuestion("");
    setChatError(null);
  };

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1200);
    } catch { }
  };

  const regeneratePrompts = async () => {
    if (!selectedAnalysisUrl) return;

    // Check if ad_id exists
    if (!result?.ad_id) {
      setError('Cannot regenerate prompts: Ad not found (may have been deleted)');
      return;
    }

    try {
      setAnalyzing(selectedAnalysisUrl);
      setError(null);

      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/ads/${result.ad_id}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_url: selectedAnalysisUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.detail || response.statusText;
        throw new Error(`Analysis failed: ${errorMsg}`);
      }

      const data: AnalyzeVideoResponse = await response.json();

      setAnalysisByUrl(prev => ({
        ...prev,
        [selectedAnalysisUrl]: data
      }));

      // Always use AI-generated prompts from backend (no manual fallback)
      const basePrompts = data.generation_prompts || [];
      setEditedPromptsByUrl(prev => ({ ...prev, [selectedAnalysisUrl]: basePrompts }));

      console.log('Prompts regenerated:', data);
    } catch (err: any) {
      console.error('Failed to regenerate prompts:', err);
      setError(err.message || 'Failed to regenerate prompts');
    } finally {
      setAnalyzing(null);
    }
  };

  const regenerateWithCustomInstruction = async () => {
    if (!selectedAnalysisUrl || !customInstruction.trim()) return;

    // Check if ad_id exists
    if (!result?.ad_id) {
      setError('Cannot regenerate prompts: Ad not found (may have been deleted)');
      return;
    }

    try {
      // Use the new cached regenerate endpoint for cost savings
      await handleRegenerateAnalysis(customInstruction.trim());

      // Clear custom instruction and close popup
      setCustomInstruction('');
      setShowCustomInstructionPopup(false);

      console.log('Regenerated with custom instruction using cached content');
    } catch (err: any) {
      console.error('Failed to regenerate with custom instruction:', err);
      setError(err.message || 'Failed to regenerate prompts');
    }
  };

  const askFollowupQuestion = async () => {
    if (!result?.ad_id) {
      setChatError("Cannot ask follow-up: Ad not found (may have been deleted)");
      return;
    }
    if (!chatQuestion.trim()) return;

    try {
      setChatLoading(true);
      setChatError(null);

      const question = chatQuestion.trim();
      const res = await adsApi.followupAdAnalysis(result.ad_id, {
        question,
        version_number: selectedAnalysisVersion ?? undefined,
      });

      const now = new Date().toISOString();
      const answerAt = res.generated_at || now;

      // Extract token usage from raw response
      const tokens = res.raw?.usageMetadata;

      setChatMessages(prev => [
        ...prev,
        { role: "user", text: question, at: now },
        { role: "model", text: res.answer || "", at: answerAt, tokens },
      ]);
      setChatQuestion("");
    } catch (err: any) {
      setChatError(err?.message || "Failed to ask follow-up question");
    } finally {
      setChatLoading(false);
    }
  };

  // ---- Previous downloads (Database) ----
  const loadHistory = async (page: number = 1) => {
    try {
      setLoadingHistory(true);
      const response = await adsApi.getDownloadHistory(page, historyPageSize);
      setHistory(response.items);
      setHistoryTotal(response.total);
      setHistoryPage(response.page);
    } catch (err) {
      console.error('Failed to load download history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const addToHistory = async (entry: DownloadFromLibraryResponse) => {
    try {
      // Extract title from the ad data
      let title = entry.ad_archive_id;
      if (entry.media && entry.media.length > 0) {
        // Try to get title from first creative
        const firstMedia = entry.media[0];
        if (firstMedia.title) {
          title = firstMedia.title;
        } else if (firstMedia.body) {
          // Use first 100 chars of body as title
          title = firstMedia.body.substring(0, 100) + (firstMedia.body.length > 100 ? '...' : '');
        }
      }

      await adsApi.createDownloadHistory({
        ad_id: entry.ad_id,
        ad_archive_id: entry.ad_archive_id,
        title: title,
        video_hd_urls: entry.video_hd_urls,
        video_sd_urls: entry.video_sd_urls,
        video_urls: entry.video_urls,
        image_urls: entry.image_urls,
        media: entry.media,
        save_path: entry.save_path
      });
      // Reload history to show the new item
      await loadHistory(1);
    } catch (err) {
      console.error('Failed to save to history:', err);
    }
  };

  const clearHistory = async () => {
    // Note: This would require a bulk delete endpoint or deleting all items
    // For now, just clear the UI
    setHistory([]);
  };

  useEffect(() => {
    loadHistory(1);
    restoreState();
  }, []);

  // Load merge history and Veo generations when result is available
  useEffect(() => {
    if (result?.ad_id) {
      loadMergeHistory(result.ad_id);
      loadVeoGenerationsForAd(result.ad_id);
    }
  }, [result?.ad_id]);

  // Save state to sessionStorage
  useEffect(() => {
    if (selectedAnalysisUrl && analysisByUrl[selectedAnalysisUrl]) {
      const state = {
        result,
        selectedAnalysisUrl,
        analysisByUrl,
        activeTab,
        veoVideoByPromptKey,
        veoGenerationsByPromptKey,
        selectedClipsForMerge,
        downloadedFolder,
        downloadInfo,
      };
      sessionStorage.setItem('downloadAdsState', JSON.stringify(state));
    }
  }, [selectedAnalysisUrl, analysisByUrl, activeTab, veoVideoByPromptKey, veoGenerationsByPromptKey, selectedClipsForMerge, downloadedFolder, downloadInfo]);

  const restoreState = () => {
    try {
      const savedState = sessionStorage.getItem('downloadAdsState');
      if (savedState) {
        const state = JSON.parse(savedState);
        if (state.result) setResult(state.result);
        if (state.selectedAnalysisUrl) setSelectedAnalysisUrl(state.selectedAnalysisUrl);
        if (state.analysisByUrl) setAnalysisByUrl(state.analysisByUrl);
        if (state.activeTab) setActiveTab(state.activeTab);
        if (state.veoVideoByPromptKey) setVeoVideoByPromptKey(state.veoVideoByPromptKey);
        if (state.veoGenerationsByPromptKey) setVeoGenerationsByPromptKey(state.veoGenerationsByPromptKey);
        if (state.selectedClipsForMerge) setSelectedClipsForMerge(state.selectedClipsForMerge);
        if (state.downloadedFolder) setDownloadedFolder(state.downloadedFolder);
        if (state.downloadInfo) setDownloadInfo(state.downloadInfo);
      }
    } catch (err) {
      console.error('Failed to restore state:', err);
    }
  };

  // Prompt edits are now session-only (in-memory) so analysis/prompt data
  // does not persist in browser storage. Only download history is cached.

  // Instagram Reel Downloader Component
  const InstagramReelDownloader = ({ adId }: { adId?: number }) => {
    const [instagramUrl, setInstagramUrl] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const handleFetchInstagramReel = async () => {
      if (!instagramUrl) return;

      try {
        setDownloading(true);
        setDownloadError(null);
        setError(null);

        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/v1/settings/ai/get-instagram-video-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: instagramUrl
          }),
        });

        const extractResult = await response.json();

        if (extractResult.success) {
          console.log('Instagram video URL extracted:', extractResult);

          // Download the video with audio using yt-dlp for preview
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          const downloadResponse = await fetch(`${backendUrl}/api/v1/settings/ai/download-instagram-preview`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: instagramUrl
            }),
          });

          const downloadResult = await downloadResponse.json();

          if (!downloadResult.success) {
            throw new Error(downloadResult.detail || 'Failed to download Instagram video');
          }

          // Use the downloaded preview URL (with audio) for UI and original URL for analysis
          const previewUrl = `${backendUrl}${downloadResult.preview_url}`;
          const thumbnail = extractResult.thumbnail;
          const title = extractResult.title || 'Instagram Reel';

          console.log('Preview URL (with audio):', previewUrl);
          console.log('Original Instagram URL:', instagramUrl);
          console.log('Thumbnail:', thumbnail);

          const instagramResult: DownloadFromLibraryResponse = {
            success: true,
            ad_id: result?.ad_id || Date.now(),
            ad_archive_id: `instagram_${Date.now()}`,
            video_urls: [instagramUrl],  // Original Instagram URL for analysis
            video_hd_urls: [instagramUrl],
            video_sd_urls: [instagramUrl],
            image_urls: thumbnail ? [thumbnail] : [],
            downloaded: [],
            media: [{
              type: 'video',
              url: previewUrl,  // Preview URL with audio for UI
              quality: 'hd',
            }],
            message: 'Instagram Reel downloaded with audio',
          };

          // Set as current result and add to analysis
          setResult(instagramResult);
          setSelectedAnalysisUrl(instagramUrl);

          // Add to history
          addToHistory(instagramResult);

          // Switch to Analysis tab
          setActiveTab('analysis');

          console.log('Instagram Reel added to workflow:', instagramResult);
        } else {
          throw new Error(extractResult.detail || 'Failed to fetch Instagram Reel');
        }
      } catch (err: any) {
        console.error('Failed to fetch Instagram Reel:', err);
        setDownloadError(err.message || 'Failed to fetch Instagram Reel');
      } finally {
        setDownloading(false);
      }
    };

    return (
      <div className="border rounded-md p-4 mb-6 bg-neutral-900/40 border-neutral-800">
        <h2 className="text-lg font-medium mb-3">Instagram Reel</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Instagram Reel URL
            </label>
            <input
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://www.instagram.com/p/DQqkvrngDVI/"
              className="w-full border rounded-md px-3 py-2 text-sm bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-400"
            />
          </div>

          <button
            onClick={handleFetchInstagramReel}
            disabled={downloading || !instagramUrl}
            className="px-4 py-2 bg-purple-600 text-white rounded-md disabled:opacity-60 hover:bg-purple-700"
          >
            {downloading ? 'Fetching...' : '🎬 Fetch & Analyze'}
          </button>

          {downloadError && (
            <div className="p-3 border border-red-400/40 bg-red-900/20 text-red-200 rounded-md text-sm">
              {downloadError}
            </div>
          )}

          <p className="text-xs text-neutral-400">
            Paste an Instagram Reel URL to analyze it like a Facebook ad
          </p>
          <p className="text-xs text-yellow-500/80 mt-2">
            ⚠️ Note: Instagram preview may not have audio due to browser limitations. When analyzing, the video will be downloaded with audio for Gemini.
          </p>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-semibold mb-4">Download Ad Media</h1>

        {/* Facebook Ad Library */}
        <form onSubmit={onSubmit} className="border rounded-md p-4 mb-4 bg-neutral-900/40 border-neutral-800">
          <h2 className="text-lg font-medium mb-3">Facebook Ad Library</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Ad Library URL or Archive ID
              </label>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="https://www.facebook.com/ads/library/?id=1234567890 or just 1234567890"
                className="w-full border rounded-md px-3 py-2 text-sm bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-400"
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="download"
                type="checkbox"
                checked={download}
                onChange={(e) => setDownload(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="download" className="text-sm">
                Save to server storage
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-60"
            >
              {loading ? "Fetching..." : "Get Media"}
            </button>
          </div>
        </form>

        {/* Instagram Reel */}
        <InstagramReelDownloader adId={result?.ad_id} />

        {error && (
          <div className="p-4 border border-red-400/40 bg-red-900/20 text-red-200 rounded-lg">
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Unified Analysis + Generation Tabs now live under the media section inside the result card */}

        {/* Previous Downloads */}
        {history && history.length > 0 && (
          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Previous downloads</h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Showing {((historyPage - 1) * historyPageSize) + 1}-{Math.min(historyPage * historyPageSize, historyTotal)} of {historyTotal} total
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs px-3 py-1.5 border rounded-md border-neutral-700 disabled:opacity-50"
                  onClick={() => loadHistory(historyPage - 1)}
                  disabled={historyPage === 1 || loadingHistory}
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  className="text-xs px-3 py-1.5 border rounded-md border-neutral-700 disabled:opacity-50"
                  onClick={() => loadHistory(historyPage + 1)}
                  disabled={historyPage * historyPageSize >= historyTotal || loadingHistory}
                >
                  Next →
                </button>
              </div>
            </div>
            {loadingHistory ? (
              <div className="text-center py-8 text-neutral-400">Loading history...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.map((h: any) => {
                  const firstMedia = h.media && h.media.length > 0 ? h.media[0] : null;
                  const hasVideoPreview = firstMedia?.type === 'video';
                  return (
                    <div key={h.id} className="border rounded-md p-3 bg-neutral-900/40 border-neutral-800 space-y-2 relative">
                      {/* 3-dot menu */}
                      <div className="absolute top-2 right-2">
                        <button
                          type="button"
                          className="text-neutral-400 hover:text-neutral-200 p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            const menu = e.currentTarget.nextElementSibling as HTMLElement;
                            if (menu) {
                              menu.classList.toggle('hidden');
                            }
                          }}
                        >
                          ⋮
                        </button>
                        <div className="hidden absolute right-0 mt-1 w-48 bg-neutral-800 border border-neutral-700 rounded-md shadow-lg z-10">
                          {h.ad_id && h.analysis_count > 0 && (
                            <button
                              type="button"
                              className="w-full text-left px-4 py-2 text-xs text-orange-400 hover:bg-neutral-700"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const menu = e.currentTarget.parentElement as HTMLElement;
                                if (menu) menu.classList.add('hidden');

                                if (!confirm('Clear all analysis data for this ad? This will delete all analysis versions, prompts, and generated videos.')) {
                                  return;
                                }
                                try {
                                  await adsApi.deleteAdAnalysis(h.ad_id!);
                                  await loadHistory(historyPage);
                                  alert('Analysis cleared successfully');
                                } catch (err: any) {
                                  alert('Failed to clear analysis: ' + (err.message || 'Unknown error'));
                                }
                              }}
                            >
                              Clear Analysis
                            </button>
                          )}
                          <button
                            type="button"
                            className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-neutral-700"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const menu = e.currentTarget.parentElement as HTMLElement;
                              if (menu) menu.classList.add('hidden');

                              if (!confirm(`Delete this download from history?\n\nAd: ${h.title || h.ad_archive_id}\n\nThis will only remove it from history. The ad data in the database will remain.`)) {
                                return;
                              }
                              try {
                                await adsApi.deleteDownloadHistory(h.id);
                                await loadHistory(historyPage);
                              } catch (err: any) {
                                alert('Failed to delete: ' + (err.message || 'Unknown error'));
                              }
                            }}
                          >
                            Delete from History
                          </button>
                        </div>
                      </div>

                      {h.title && (
                        <div className="text-sm font-semibold truncate pr-8" title={h.title}>{h.title}</div>
                      )}
                      <div className="text-xs text-neutral-500 truncate pr-8" title={h.ad_archive_id}>{h.ad_archive_id}</div>
                      <div className="text-xs text-muted-foreground">
                        {h.video_hd_count} HD • {h.video_sd_count} SD • {h.image_count} images
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        {new Date(h.created_at).toLocaleString()}
                      </div>
                      {h.ad_id && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {h.analysis_count > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded border border-blue-600/30">
                              📊 {h.analysis_count} Analysis{h.analysis_count > 1 ? 'es' : ''}
                            </span>
                          )}
                          {h.prompt_count > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-purple-600/20 text-purple-400 rounded border border-purple-600/30">
                              🎬 {h.prompt_count} Prompt{h.prompt_count > 1 ? 's' : ''}
                            </span>
                          )}
                          {h.veo_video_count > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-green-600/20 text-green-400 rounded border border-green-600/30">
                              🎥 {h.veo_video_count} Video{h.veo_video_count > 1 ? 's' : ''}
                            </span>
                          )}
                          {h.merge_count > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-orange-600/20 text-orange-400 rounded border border-orange-600/30">
                              🎞️ {h.merge_count} Merge{h.merge_count > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      )}
                      {h.save_path ? (
                        <div className="text-[11px] text-neutral-400 font-mono truncate" title={h.save_path}>{h.save_path}</div>
                      ) : null}
                      {firstMedia && (
                        <div className="mt-2 rounded-md overflow-hidden border border-neutral-800 bg-black h-40 flex items-center justify-center">
                          {hasVideoPreview ? (
                            <video
                              src={firstMedia.url}
                              className="w-full h-full object-contain"
                              muted
                              controls
                            />
                          ) : (
                            <img
                              src={firstMedia.url}
                              alt="preview"
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          className="px-3 py-1.5 border rounded-md text-xs border-neutral-700 hover:bg-neutral-800"
                          onClick={async () => {
                            // Reset current analysis/chat/merge state so we don't show stale data
                            setAnalysisByUrl({});
                            setEditedPromptsByUrl({});
                            setSelectedAnalysisUrl(null);
                            setChatMessages([]);
                            setChatQuestion("");
                            setChatError(null);
                            setSelectedClipsForMerge({});
                            setMergedVideoUrl(null);
                            setMergedVideoSystemPath(null);
                            setLastMergeSignature(null);
                            setVeoVideoByPromptKey({});
                            setVeoGenerationsByPromptKey({});
                            setArchivedGenerationsByPromptKey({});
                            setActualGenerationTime({});

                            // Transform history item to DownloadFromLibraryResponse format
                            const transformedResult: DownloadFromLibraryResponse = {
                              success: true,
                              ad_archive_id: h.ad_archive_id,
                              ad_id: h.ad_id,
                              page_id: undefined,
                              video_urls: h.video_urls || [],
                              image_urls: h.image_urls || [],
                              video_hd_urls: h.video_hd_urls || [],
                              video_sd_urls: h.video_sd_urls || [],
                              downloaded: [],
                              media: h.media || [],
                              save_path: h.save_path,
                              message: 'Loaded from history'
                            };

                            setResult(transformedResult);
                            const videos = h.media?.filter((m: any) => m.type === 'video') || [];

                            // If we have an ad_id, load ALL related data
                            if (h.ad_id) {
                              try {
                                // Load current analysis
                                const a = await adsApi.getAdAnalysis(h.ad_id);
                                const url = a.used_video_url || (videos[0]?.url ?? null);

                                if (url) {
                                  // Set analysis data
                                  setAnalysisByUrl(prev => ({ ...prev, [url]: a }));
                                  setSelectedAnalysisUrl(url);

                                  // Load prompts from analysis
                                  const basePrompts = a.generation_prompts || [];
                                  setEditedPromptsByUrl(prev => ({ ...prev, [url]: basePrompts }));

                                  // Load analysis history (all versions)
                                  loadAnalysisHistory(h.ad_id);

                                  // Load Veo generations for all prompts
                                  loadVeoGenerationsForAd(h.ad_id);

                                  // Load merge history
                                  loadMergeHistory(h.ad_id);

                                  return;
                                }
                              } catch (err: any) {
                                // Ad was deleted or analysis doesn't exist - this is OK
                                if (err?.status === 404) {
                                  console.log('Ad or analysis not found (may have been deleted) - loading media only');
                                } else {
                                  console.error('Failed to load analysis data:', err);
                                }
                                // Fall through to simple selection
                              }
                            }

                            // Fallback: just select first video
                            if (videos.length > 0) {
                              const firstWithAnalysis = videos.find((v: any) => analysisByUrl[v.url]);
                              const chosen = firstWithAnalysis || videos[0];
                              setSelectedAnalysisUrl(chosen.url);
                            }
                          }}
                        >
                          Open
                        </button>
                        {firstMedia ? (
                          <a
                            className="px-3 py-1.5 border rounded-md text-xs border-neutral-700 hover:bg-neutral-800"
                            href={firstMedia.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="border rounded-md p-4 bg-neutral-900/40 border-neutral-800">
              <div className="text-sm">Ad Archive ID: <span className="font-medium">{result.ad_archive_id}</span></div>
              {result.page_id ? <div className="text-xs text-muted-foreground">Page ID: {result.page_id}</div> : null}
              <div className="text-xs mt-2">
                {result.video_hd_urls.length} HD video(s), {result.video_sd_urls.length} SD video(s), {result.image_urls.length} image(s)
              </div>
              {result.save_path && download ? (
                <div className="text-xs mt-2 font-mono">Save path: {result.save_path}</div>
              ) : null}
            </div>

            {/* Media Grid */}
            {result.media?.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Media ({result.media.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6">
                  {result.media.map((m: MediaItem) => {
                    const isHD = result.video_hd_urls.includes(m.url);
                    const isSD = result.video_sd_urls.includes(m.url);
                    const qualityLabel = isHD ? 'HD' : isSD ? 'SD' : m.quality;
                    return (
                      <div key={m.url} className="border rounded-md overflow-hidden bg-neutral-900/40 border-neutral-800">
                        <div className="p-2 flex items-center justify-between border-b border-neutral-800">
                          <span className="text-[11px] uppercase tracking-wide opacity-70">{m.type}</span>
                          {qualityLabel ? (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">{qualityLabel}</span>
                          ) : null}
                        </div>
                        <div className="bg-black h-64 sm:h-80 lg:h-[28rem]">
                          {m.type === 'video' ? (
                            <video src={m.url} controls className="w-full h-full object-contain" />
                          ) : (
                            <img src={m.url} alt="ad" className="w-full h-full object-contain" />
                          )}
                        </div>
                        <div className="p-2 flex flex-wrap gap-2">
                          <a href={m.url} download className="px-3 py-1.5 border rounded-md text-sm border-neutral-700">Download</a>
                          <a href={m.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 border rounded-md text-sm border-neutral-700">View</a>
                          {m.type === 'video' && (
                            <button
                              type="button"
                              className="px-3 py-1.5 border rounded-md text-sm border-neutral-700 disabled:opacity-60"
                              disabled={analyzing === m.url || !!analysisByUrl[m.url]}
                              onClick={() => {
                                setPendingAnalyzeUrl(m.url);
                                setShowCustomInstructionPopup(true);
                              }}
                            >
                              {analysisByUrl[m.url]
                                ? 'Analyzed'
                                : (analyzing === m.url ? 'Analyzing…' : 'Analyze')}
                            </button>
                          )}
                        </div>
                        {/* Per-card analysis removed; unified analysis appears above */}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedAnalysisUrl && analysisByUrl[selectedAnalysisUrl] && (
              <div className="border rounded-md p-4 bg-neutral-900/40 border-neutral-800">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <h2 className="text-lg font-semibold">Video Analysis</h2>
                    <div className="flex items-center gap-2 text-xs">
                      <button className={`px-3 py-1.5 rounded-md border ${activeTab === 'analysis' ? 'border-blue-500 text-blue-300' : 'border-neutral-700 text-neutral-300'}`} onClick={() => setActiveTab('analysis')}>Analysis</button>
                      <button className={`px-3 py-1.5 rounded-md border ${activeTab === 'prompts' ? 'border-blue-500 text-blue-300' : 'border-neutral-700 text-neutral-300'}`} onClick={() => {
                        setActiveTab('prompts');
                        // Load saved generations when switching to prompts tab
                        const analysis = analysisByUrl[selectedAnalysisUrl];
                        if (analysis?.generation_prompts) {
                          matchGenerationsToPrompts(analysis.generation_prompts, selectedAnalysisUrl);
                        }
                        // Load merge history
                        if (result?.ad_id) {
                          loadMergeHistory(result.ad_id);
                        }

                        // Load Veo generations
                        if (result?.ad_id) {
                          loadVeoGenerationsForAd(result.ad_id);
                        }
                      }}>Gen Prompts</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Token usage and cost summary for current analysis */}
                    {selectedAnalysisUrl && analysisByUrl[selectedAnalysisUrl] && (
                      (() => {
                        const current = analysisByUrl[selectedAnalysisUrl];
                        const usage = current.token_usage;
                        const cost = current.cost;
                        if (!usage && !cost) return null;

                        const totalTokens = usage?.total_tokens ?? (usage && (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0));
                        const nonCached = usage?.non_cached_prompt_tokens ?? usage?.prompt_tokens;
                        const cached = usage?.cached_prompt_tokens;
                        const completion = usage?.completion_tokens;
                        const totalCost = typeof cost?.total === 'number' ? cost.total : undefined;

                        return (
                          <div className="hidden md:flex flex-col text-[10px] text-neutral-400 mr-2 max-w-[260px]">
                            <div className="truncate">
                              {typeof totalTokens === 'number' && (
                                <span>
                                  {totalTokens.toLocaleString()} tokens
                                  {typeof nonCached === 'number' || typeof cached === 'number' || typeof completion === 'number' ? (
                                    <>
                                      {' '}(
                                      {typeof nonCached === 'number' && <span>{nonCached.toLocaleString()} nc</span>}
                                      {typeof cached === 'number' && (
                                        <span>
                                          {typeof nonCached === 'number' && ', '}
                                          {cached.toLocaleString()} c
                                        </span>
                                      )}
                                      {typeof completion === 'number' && (
                                        <span>
                                          {(typeof nonCached === 'number' || typeof cached === 'number') && ', '}
                                          {completion.toLocaleString()} out
                                        </span>
                                      )}
                                      )
                                    </>
                                  ) : null}
                                </span>
                              )}
                            </div>
                            {typeof totalCost === 'number' && (
                              <div className="truncate">
                                Est. cost: ${totalCost.toFixed(6)} {cost?.currency || 'USD'}
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}

                    <div className="hidden sm:block text-[11px] text-neutral-400 truncate max-w-[260px]">{selectedAnalysisUrl}</div>
                    {analysisHistory && analysisHistory.total_count > 1 && (
                      <button
                        type="button"
                        className="px-2 py-1 border rounded-md text-[11px] border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                        onClick={() => setShowAnalysisHistory(!showAnalysisHistory)}
                      >
                        📜 History ({analysisHistory.total_count})
                      </button>
                    )}
                    <button
                      type="button"
                      className="px-2 py-1 border rounded-md text-[11px] border-neutral-700 text-neutral-300"
                      onClick={clearCurrentAnalysis}
                    >
                      Clear Analysis
                    </button>
                  </div>
                </div>

                {/* Analysis History Dropdown */}
                {showAnalysisHistory && analysisHistory && (
                  <div className="mb-3 p-3 border border-neutral-800 rounded-md bg-neutral-900/50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold">Analysis History</h3>
                      <button
                        onClick={() => setShowAnalysisHistory(false)}
                        className="text-xs text-neutral-400 hover:text-neutral-200"
                      >
                        ✕ Close
                      </button>
                    </div>
                    <div className="space-y-2">
                      {analysisHistory.analyses.map((item: any) => (
                        <div
                          key={item.id}
                          className={`p-2 border rounded-md cursor-pointer transition-colors ${item.is_current
                              ? 'border-blue-600 bg-blue-600/10'
                              : 'border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/50'
                            }`}
                          onClick={() => {
                            if (result?.ad_id && selectedAnalysisUrl) {
                              loadAnalysisVersion(result.ad_id, item.version_number, selectedAnalysisUrl);
                              setShowAnalysisHistory(false);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-neutral-400">
                                v{item.version_number}
                              </span>
                              {item.is_current && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-600 text-white rounded">
                                  CURRENT
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-neutral-500">
                              {new Date(item.created_at).toLocaleString()}
                            </span>
                          </div>
                          {item.summary && (
                            <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                              {item.summary}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {activeTab === 'analysis' && (
                  <div className="flex flex-wrap gap-2 justify-end mb-3">
                    <button
                      type="button"
                      className="px-3 py-1.5 border rounded-md text-xs border-neutral-700"
                      onClick={() => handleCopy(selectedAnalysisUrl + ':script', buildScriptFromAnalysis(analysisByUrl[selectedAnalysisUrl]))}
                    >
                      {copiedKey === selectedAnalysisUrl + ':script' ? 'Copied Script' : 'Copy Script (no timestamps)'}
                    </button>
                    {analysisByUrl[selectedAnalysisUrl].transcript && (
                      <button
                        type="button"
                        className="px-3 py-1.5 border rounded-md text-xs border-neutral-700"
                        onClick={() => handleCopy(selectedAnalysisUrl + ':transcript', stripTimestamps(analysisByUrl[selectedAnalysisUrl].transcript || ''))}
                      >
                        {copiedKey === selectedAnalysisUrl + ':transcript' ? 'Copied Transcript' : 'Copy Transcript'}
                      </button>
                    )}
                    {analysisByUrl[selectedAnalysisUrl].text_on_video && (
                      <button
                        type="button"
                        className="px-3 py-1.5 border rounded-md text-xs border-neutral-700"
                        onClick={() => handleCopy(selectedAnalysisUrl + ':text_on_video', analysisByUrl[selectedAnalysisUrl].text_on_video || '')}
                      >
                        {copiedKey === selectedAnalysisUrl + ':text_on_video' ? 'Copied On-screen Text' : 'Copy On-screen Text'}
                      </button>
                    )}
                    {analysisByUrl[selectedAnalysisUrl].voice_over && (
                      <button
                        type="button"
                        className="px-3 py-1.5 border rounded-md text-xs border-neutral-700"
                        onClick={() => handleCopy(selectedAnalysisUrl + ':voice_over', analysisByUrl[selectedAnalysisUrl].voice_over || '')}
                      >
                        {copiedKey === selectedAnalysisUrl + ':voice_over' ? 'Copied Voice-over' : 'Copy Voice-over'}
                      </button>
                    )}
                    {analysisByUrl[selectedAnalysisUrl].storyboard && analysisByUrl[selectedAnalysisUrl].storyboard!.length > 0 && (
                      <button
                        type="button"
                        className="px-3 py-1.5 border rounded-md text-xs border-neutral-700"
                        onClick={() => handleCopy(selectedAnalysisUrl + ':storyboard', (analysisByUrl[selectedAnalysisUrl].storyboard || []).join('\n'))}
                      >
                        {copiedKey === selectedAnalysisUrl + ':storyboard' ? 'Copied Storyboard' : 'Copy Storyboard'}
                      </button>
                    )}
                  </div>
                )}
                {activeTab === 'analysis' && (() => {
                  const analysis = analysisByUrl[selectedAnalysisUrl];
                  return (
                    <div className="space-y-4">
                      {analysis.message && (
                        <div className="text-[11px] text-neutral-400">{analysis.message}</div>
                      )}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {analysis.transcript && (
                          <div className="border border-neutral-800 rounded-md bg-neutral-900/60 p-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1">Transcript</div>
                            <div className="whitespace-pre-wrap text-neutral-200 text-sm leading-relaxed">
                              {analysis.transcript}
                            </div>
                          </div>
                        )}
                        {analysis.text_on_video && (
                          <div className="border border-neutral-800 rounded-md bg-neutral-900/60 p-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1">On-screen Text</div>
                            <ul className="text-neutral-200 text-sm space-y-1">
                              {analysis.text_on_video.split('\n').map((line, idx) => (
                                line.trim() ? (
                                  <li key={idx} className="flex gap-2">
                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500 flex-shrink-0" />
                                    <span className="flex-1 whitespace-pre-wrap">{line}</span>
                                  </li>
                                ) : null
                              ))}
                            </ul>
                          </div>
                        )}
                        {analysis.voice_over && (
                          <div className="border border-neutral-800 rounded-md bg-neutral-900/60 p-3 lg:col-span-2">
                            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1">Voice-over</div>
                            <div className="whitespace-pre-wrap text-neutral-200 text-sm leading-relaxed">
                              {analysis.voice_over}
                            </div>
                          </div>
                        )}
                        {analysis.strengths && analysis.strengths.length > 0 && (
                          <div className="border border-neutral-800 rounded-md bg-neutral-900/60 p-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1">Strengths</div>
                            <ul className="text-sm text-neutral-200 space-y-1 list-disc ml-5">
                              {analysis.strengths.map((s, idx) => (
                                <li key={idx}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {analysis.recommendations && analysis.recommendations.length > 0 && (
                          <div className="border border-neutral-800 rounded-md bg-neutral-900/60 p-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1">Recommendations</div>
                            <ul className="text-sm text-neutral-200 space-y-1 list-disc ml-5">
                              {analysis.recommendations.map((r, idx) => (
                                <li key={idx}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {analysis.storyboard && analysis.storyboard.length > 0 && (
                          <div className="border border-neutral-800 rounded-md bg-neutral-900/60 p-3 lg:col-span-2">
                            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1">Storyboard</div>
                            <ol className="list-decimal ml-5 space-y-1 text-sm text-neutral-200 leading-relaxed">
                              {analysis.storyboard.map((line, idx) => (
                                <li key={idx}>{line}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                      {analysis.beats && analysis.beats.length > 0 && (
                        <div className="border border-neutral-800 rounded-md bg-neutral-900/60 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">Beats & why they work</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {analysis.beats.map((b, i) => (
                              <div key={i} className="border border-neutral-800 rounded-md bg-neutral-900/80 p-3 space-y-1">
                                <div className="text-[11px] uppercase tracking-wide text-neutral-400">
                                  {b.start ? `${b.start}${b.end ? ` → ${b.end}` : ''}` : `Beat ${i + 1}`}
                                </div>
                                <div className="text-sm font-medium text-neutral-100">
                                  {b.summary}
                                </div>
                                {b.why_it_works && (
                                  <div className="text-xs text-neutral-400">
                                    <span className="font-semibold">Why it works: </span>
                                    {b.why_it_works}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {activeTab === 'analysis' && (
                  <div className="mt-6 border-t border-neutral-800 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-200">Ask Gemini about this video</h3>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          Uses cached video + system instruction for ~60% cost savings. Token usage shown per message.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <textarea
                        className="w-full min-h-[60px] max-h-40 text-sm bg-neutral-900 border border-neutral-800 rounded-md text-neutral-100 p-2 resize-y"
                        placeholder="Ask anything about this exact video (e.g. 'What are 3 new hooks I can test?')"
                        value={chatQuestion}
                        onChange={(e) => setChatQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (!chatLoading) askFollowupQuestion();
                          }
                        }}
                      />
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] text-red-400 min-h-[1em]">
                          {chatError}
                        </div>
                        <div className="flex gap-2">
                          {chatMessages.length > 0 && (
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-md text-xs bg-red-600 hover:bg-red-700 disabled:opacity-60"
                              disabled={chatLoading}
                              onClick={async () => {
                                if (!result?.ad_id) {
                                  setChatError("Cannot clear cache: Ad not found");
                                  return;
                                }
                                if (!confirm('Clear chat history and delete cache? This will free up storage but you\'ll lose cost savings on future questions.')) return;
                                try {
                                  setChatLoading(true);
                                  await adsApi.clearAdCache(result.ad_id, selectedAnalysisVersion ?? undefined);
                                  setChatMessages([]);
                                  setChatError(null);
                                  alert('✅ Cache and chat history cleared!');
                                } catch (err: any) {
                                  setChatError(err.message || 'Failed to clear cache');
                                } finally {
                                  setChatLoading(false);
                                }
                              }}
                            >
                              🗑️ Clear Chat & Cache
                            </button>
                          )}
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-md text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                            disabled={chatLoading || !chatQuestion.trim()}
                            onClick={askFollowupQuestion}
                          >
                            {chatLoading ? 'Asking…' : 'Ask Gemini'}
                          </button>
                        </div>
                      </div>
                    </div>
                    {chatMessages.length > 0 && (
                      <div className="mt-2 max-h-64 overflow-y-auto border border-neutral-800 rounded-md bg-neutral-900/60 p-3 space-y-3 text-sm">
                        {chatMessages.map((msg, idx) => (
                          <div key={idx} className="space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-neutral-400">
                                {msg.role === 'user' ? 'You' : 'Gemini'}
                              </span>
                              <div className="flex items-center gap-2">
                                {msg.tokens && msg.role === 'model' && (() => {
                                  const t: any = msg.tokens || {};
                                  const promptTokens = typeof t.promptTokenCount === 'number' ? t.promptTokenCount : 0;
                                  const cachedTokens = typeof t.cachedContentTokenCount === 'number' ? t.cachedContentTokenCount : 0;
                                  const completionTokens = typeof t.candidatesTokenCount === 'number' ? t.candidatesTokenCount : 0;
                                  const totalTokens = typeof t.totalTokenCount === 'number'
                                    ? t.totalTokenCount
                                    : promptTokens + completionTokens;

                                  // Official Google Gemini pricing per 1M tokens (USD) - default to 2.0 Flash if unknown
                                  // Source: https://ai.google.dev/gemini-api/docs/pricing
                                  const modelName = (msg as any).model || 'gemini-2.0-flash-001';
                                  const pricingTable: Record<string, {prompt: number, cached: number, completion: number}> = {
                                    'gemini-3-pro-preview': {prompt: 2.00, cached: 0.20, completion: 12.00},
                                    'gemini-2.5-pro': {prompt: 1.25, cached: 0.125, completion: 10.00},
                                    'gemini-2.5-flash': {prompt: 0.30, cached: 0.03, completion: 2.50},
                                    'gemini-2.5-flash-001': {prompt: 0.30, cached: 0.03, completion: 2.50},
                                    'gemini-2.5-flash-preview-09-2025': {prompt: 0.30, cached: 0.03, completion: 2.50},
                                    'gemini-2.5-flash-lite': {prompt: 0.10, cached: 0.01, completion: 0.40},
                                    'gemini-2.5-flash-lite-preview-09-2025': {prompt: 0.10, cached: 0.01, completion: 0.40},
                                    'gemini-2.0-flash': {prompt: 0.10, cached: 0.025, completion: 0.40},
                                    'gemini-2.0-flash-001': {prompt: 0.10, cached: 0.025, completion: 0.40},
                                    'gemini-2.0-flash-lite': {prompt: 0.075, cached: 0.075, completion: 0.30},
                                  };
                                  const pricing = pricingTable[modelName] || pricingTable['gemini-2.0-flash-001'];
                                  const promptPerMillion = pricing.prompt;
                                  const cachedPerMillion = pricing.cached;
                                  const completionPerMillion = pricing.completion;

                                  const nonCachedPrompt = Math.max(promptTokens - cachedTokens, 0);
                                  const promptCost = (nonCachedPrompt / 1_000_000) * promptPerMillion;
                                  const cachedCost = (cachedTokens / 1_000_000) * cachedPerMillion;
                                  const completionCost = (completionTokens / 1_000_000) * completionPerMillion;
                                  const totalCost = promptCost + cachedCost + completionCost;

                                  return (
                                    <span className="text-[10px] text-green-400 font-mono">
                                      {totalTokens.toLocaleString()} tokens
                                      {cachedTokens > 0 && (
                                        <span className="text-emerald-400 ml-1">
                                          ({cachedTokens.toLocaleString()} cached)
                                        </span>
                                      )}
                                      {totalCost > 0 && (
                                        <span className="ml-2 text-[10px] text-blue-300">
                                          ${totalCost.toFixed(6)} USD
                                        </span>
                                      )}
                                    </span>
                                  );
                                })()}
                                <span className="text-[10px] text-neutral-500">
                                  {new Date(msg.at).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                            <div className="text-neutral-100 whitespace-pre-wrap">{msg.text}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'prompts' && (() => {
                  const analysis = analysisByUrl[selectedAnalysisUrl];
                  // Always use AI-generated prompts from backend (no manual fallback)
                  const rawPrompts = analysis?.generation_prompts || [];
                  const prompts = editedPromptsByUrl[selectedAnalysisUrl] && editedPromptsByUrl[selectedAnalysisUrl].length === rawPrompts.length
                    ? editedPromptsByUrl[selectedAnalysisUrl]
                    : rawPrompts;
                  const allJoined = prompts.join('\n\n---\n\n');
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex flex-col">
                          <div className="font-medium">Generation Prompts (8s segments)</div>
                          {analysis.generated_at && (
                            <div className="text-[11px] text-neutral-500">
                              Last generated: {new Date(analysis.generated_at).toLocaleString()} {analysis.source ? `(${analysis.source})` : ''}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1.5 border rounded-md text-xs border-neutral-700"
                            onClick={() => handleCopy(selectedAnalysisUrl + ':all_prompts', allJoined)}
                          >
                            {copiedKey === selectedAnalysisUrl + ':all_prompts' ? 'Copied All' : 'Copy All'}
                          </button>
                          <button
                            className="px-3 py-1.5 border rounded-md text-xs border-neutral-700 disabled:opacity-60"
                            disabled={!!analyzing}
                            onClick={regeneratePrompts}
                            title="Re-run backend analysis to create new prompts"
                          >
                            {analyzing ? 'Regenerating…' : 'Regenerate Prompts'}
                          </button>
                          <button
                            className="px-3 py-1.5 border rounded-md text-xs border-blue-600 bg-blue-600/10 text-blue-400 disabled:opacity-60"
                            disabled={!!analyzing}
                            onClick={() => setShowCustomInstructionPopup(true)}
                            title="Regenerate with custom instructions (e.g., change Bali to Dubai)"
                          >
                            ✨ Regenerate with Instructions
                          </button>
                          <button
                            className="px-3 py-1.5 border rounded-md text-xs border-green-600 bg-green-600/10 text-green-400 disabled:opacity-60"
                            disabled={prompts.length === 0}
                            onClick={async () => {
                              if (!veoModels.length) {
                                alert('Please wait for Veo models to load');
                                return;
                              }
                              const defaultModel = veoModels[0]?.key;
                              if (!defaultModel) {
                                alert('No Veo models available');
                                return;
                              }

                              // Generate all prompts simultaneously using Promise.all
                              const estimatedSeconds = veoModels[0]?.videoGenerationTimeSeconds || 120;

                              console.log(`🎬 Starting batch generation of ${prompts.length} videos...`);

                              // Create array of generation promises
                              const generationPromises = prompts.map((promptText, i) => {
                                const promptKey = `${selectedAnalysisUrl}:prompt:${i + 1}`;

                                return (async () => {
                                  console.log(`🚀 Launching generation ${i + 1}/${prompts.length} - ${promptKey}`);
                                  try {
                                    setVeoGeneratingKeys(prev => new Set([...prev, promptKey]));
                                    setVeoErrorByPromptKey(prev => ({ ...prev, [promptKey]: null }));

                                    const startTime = Date.now();
                                    setGenerationStartTime(prev => ({ ...prev, [promptKey]: startTime }));
                                    setGenerationTimeRemaining(prev => ({ ...prev, [promptKey]: estimatedSeconds }));

                                    const countdownInterval = setInterval(() => {
                                      const elapsed = Math.floor((Date.now() - startTime) / 1000);
                                      const remaining = Math.max(0, estimatedSeconds - elapsed);
                                      setGenerationTimeRemaining(prev => ({ ...prev, [promptKey]: remaining }));
                                      if (remaining <= 0) clearInterval(countdownInterval);
                                    }, 1000);

                                    setGenerationIntervals(prev => ({ ...prev, [promptKey]: countdownInterval }));

                                    // This API call runs in parallel with others!
                                    console.log(`📡 API call starting for ${promptKey} at ${new Date().toISOString()}`);
                                    const res = await adsApi.generateVeoVideo({
                                      prompt: promptText,
                                      aspect_ratio: aspectRatio,
                                      video_model_key: defaultModel,
                                      seed: seed + i, // Different seed for each
                                    });

                                    if (!res.success || !res.video_url) {
                                      const msg = res.error || "Veo generation failed";
                                      setVeoErrorByPromptKey(prev => ({ ...prev, [promptKey]: msg }));
                                      return;
                                    }

                                    setVeoVideoByPromptKey(prev => ({ ...prev, [promptKey]: res.video_url || null }));
                                    const actualTime = Math.floor((Date.now() - startTime) / 1000);
                                    setActualGenerationTime(prev => ({ ...prev, [promptKey]: actualTime }));

                                    clearInterval(countdownInterval);
                                    setGenerationTimeRemaining(prev => ({ ...prev, [promptKey]: 0 }));
                                  } catch (err: any) {
                                    setVeoErrorByPromptKey(prev => ({ ...prev, [promptKey]: err.message || 'Generation failed' }));
                                  } finally {
                                    setVeoGeneratingKeys(prev => {
                                      const next = new Set(prev);
                                      next.delete(promptKey);
                                      return next;
                                    });
                                  }
                                })();
                              });

                              // Execute all generations in parallel
                              Promise.all(generationPromises).then(() => {
                                console.log('All Veo generations completed!');
                              });
                            }}
                            title="Generate videos for all prompts simultaneously with default settings"
                          >
                            🎬 Generate All ({prompts.length})
                          </button>
                        </div>
                      </div>
                      <ol className="list-decimal ml-5 space-y-3">
                        {prompts.map((p: string, i: number) => (
                          <li key={i} className="space-y-2 border border-neutral-800 rounded-md p-3 bg-neutral-900/60">
                            <div className="flex items-center justify-between mb-2 text-xs text-neutral-400">
                              <span>Prompt {i + 1}</span>
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const promptKey = `${selectedAnalysisUrl}:prompt:${i + 1}`;
                                  return (
                                    <>
                                      <button
                                        className="px-3 py-1 border rounded-md text-xs border-neutral-700"
                                        onClick={() => handleCopy(promptKey, p)}
                                      >
                                        {copiedKey === promptKey ? 'Copied' : 'Copy'}
                                      </button>
                                      <button
                                        className="px-3 py-1 border rounded-md text-xs border-neutral-700"
                                        onClick={() => {
                                          setSavedPromptKey(promptKey);
                                          setTimeout(() => setSavedPromptKey(null), 1200);
                                        }}
                                      >
                                        {savedPromptKey === promptKey ? 'Saved' : 'Save'}
                                      </button>
                                      <button
                                        className="px-3 py-1 border rounded-md text-xs border-neutral-700 disabled:opacity-60"
                                        disabled={veoGeneratingKeys.has(promptKey)}
                                        onClick={(e) => {
                                          // Shift+Click to generate directly without modal
                                          if (e.shiftKey && veoModels.length > 0) {
                                            const defaultModel = veoModels[0]?.key;
                                            if (!defaultModel) return;

                                            const estimatedSeconds = veoModels[0]?.videoGenerationTimeSeconds || 120;

                                            (async () => {
                                              try {
                                                setVeoGeneratingKeys(prev => new Set([...prev, promptKey]));
                                                setVeoErrorByPromptKey(prev => ({ ...prev, [promptKey]: null }));

                                                const startTime = Date.now();
                                                setGenerationStartTime(prev => ({ ...prev, [promptKey]: startTime }));
                                                setGenerationTimeRemaining(prev => ({ ...prev, [promptKey]: estimatedSeconds }));

                                                const countdownInterval = setInterval(() => {
                                                  const elapsed = Math.floor((Date.now() - startTime) / 1000);
                                                  const remaining = Math.max(0, estimatedSeconds - elapsed);
                                                  setGenerationTimeRemaining(prev => ({ ...prev, [promptKey]: remaining }));
                                                  if (remaining <= 0) clearInterval(countdownInterval);
                                                }, 1000);

                                                setGenerationIntervals(prev => ({ ...prev, [promptKey]: countdownInterval }));

                                                const res = await adsApi.generateVeoVideo({
                                                  prompt: p,
                                                  aspect_ratio: aspectRatio,
                                                  video_model_key: defaultModel,
                                                  seed: seed,
                                                });

                                                if (!res.success || !res.video_url) {
                                                  const msg = res.error || "Veo generation failed";
                                                  setVeoErrorByPromptKey(prev => ({ ...prev, [promptKey]: msg }));
                                                  return;
                                                }

                                                setVeoVideoByPromptKey(prev => ({ ...prev, [promptKey]: res.video_url || null }));
                                                const actualTime = Math.floor((Date.now() - startTime) / 1000);
                                                setActualGenerationTime(prev => ({ ...prev, [promptKey]: actualTime }));

                                                clearInterval(countdownInterval);
                                                setGenerationTimeRemaining(prev => ({ ...prev, [promptKey]: 0 }));
                                              } catch (err: any) {
                                                setVeoErrorByPromptKey(prev => ({ ...prev, [promptKey]: err.message || 'Generation failed' }));
                                              } finally {
                                                setVeoGeneratingKeys(prev => {
                                                  const next = new Set(prev);
                                                  next.delete(promptKey);
                                                  return next;
                                                });
                                              }
                                            })();
                                          } else {
                                            openVeoModal(p, promptKey);
                                          }
                                        }}
                                        title="Click to customize settings, Shift+Click to generate with defaults"
                                      >
                                        {veoGeneratingKeys.has(promptKey) ? (
                                          <span className="flex items-center gap-1.5">
                                            <span className="animate-spin">⏳</span>
                                            {generationTimeRemaining[promptKey] !== undefined && generationTimeRemaining[promptKey] > 0 ? (
                                              <span>{Math.floor(generationTimeRemaining[promptKey] / 60)}:{String(generationTimeRemaining[promptKey] % 60).padStart(2, '0')} left</span>
                                            ) : (
                                              <span>Finalizing...</span>
                                            )}
                                          </span>
                                        ) : 'Generate using Veo 3'}
                                      </button>
                                    </>
                                  );
                                })()}
                              </div>
                              {/* Progress bar for generation */}
                              {(() => {
                                const promptKey = `${selectedAnalysisUrl}:prompt:${i + 1}`;
                                const timeRemaining = generationTimeRemaining[promptKey];
                                const startTime = generationStartTime[promptKey];
                                if (veoGeneratingKeys.has(promptKey) || timeRemaining === undefined) return null;

                                const selectedModelData = veoModels.find(m => m.key === selectedModel);
                                const totalSeconds = selectedModelData?.videoGenerationTimeSeconds || 120;
                                const elapsed = totalSeconds - timeRemaining;
                                const progress = Math.min(100, (elapsed / totalSeconds) * 100);

                                return (
                                  <div className="mt-2 space-y-1">
                                    <div className="flex items-center justify-between text-[10px] text-neutral-500">
                                      <span>Generating video...</span>
                                      <span>{Math.round(progress)}%</span>
                                    </div>
                                    <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className="bg-gradient-to-r from-photon-500 to-photon-600 h-full transition-all duration-1000 ease-linear"
                                        style={{ width: `${progress}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                            <textarea
                              className="w-full min-h-[260px] text-xs leading-relaxed bg-neutral-900 border border-neutral-800 rounded-md text-neutral-100 font-mono p-2 whitespace-pre-wrap"
                              value={p}
                              onChange={(e) => {
                                const nextVal = e.target.value;
                                setEditedPromptsByUrl(prev => {
                                  const currentForUrl = prev[selectedAnalysisUrl] && prev[selectedAnalysisUrl].length === prompts.length
                                    ? prev[selectedAnalysisUrl]
                                    : prompts;
                                  const nextForUrl = [...currentForUrl];
                                  nextForUrl[i] = nextVal;
                                  return { ...prev, [selectedAnalysisUrl]: nextForUrl };
                                });
                              }}
                            />
                            {(() => {
                              const promptKey = `${selectedAnalysisUrl}:prompt:${i + 1}`;
                              const videoUrl = veoVideoByPromptKey[promptKey];
                              const errMsg = veoErrorByPromptKey[promptKey];
                              const currentGen = veoGenerationsByPromptKey[promptKey];
                              const archivedGens = archivedGenerationsByPromptKey[currentGen?.prompt_hash] || [];

                              console.log('Prompt:', prompt, 'currentGen:', currentGen, 'prompt_hash:', currentGen?.prompt_hash, 'archivedGens:', archivedGens.length);

                              if (!videoUrl && !errMsg) return null;
                              return (
                                <div className="mt-2 space-y-2">
                                  {errMsg && (
                                    <div className="text-[11px] text-red-400 border border-red-500/40 rounded-md p-2 bg-red-500/5">
                                      {errMsg}
                                    </div>
                                  )}
                                  {videoUrl && (
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            checked={selectedClipsForMerge[i] === videoUrl}
                                            onChange={() => toggleClipSelection(i, videoUrl)}
                                            className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-photon-500 focus:ring-photon-500 focus:ring-offset-0"
                                          />
                                          <div className="text-[11px] text-neutral-400">
                                            Veo 3 Preview
                                            {currentGen && (
                                              <span className="ml-2 px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px]">
                                                v{currentGen.version_number} (current)
                                              </span>
                                            )}
                                            {actualGenerationTime[promptKey] !== undefined && (
                                              <span className="ml-2 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px]">
                                                Generated in {Math.floor(actualGenerationTime[promptKey] / 60)}:{String(actualGenerationTime[promptKey] % 60).padStart(2, '0')}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        {archivedGens.length > 0 && (
                                          <button
                                            onClick={() => setShowArchivedGenerations(!showArchivedGenerations)}
                                            className="text-[10px] text-neutral-500 hover:text-neutral-300 underline"
                                          >
                                            {showArchivedGenerations ? 'Hide' : 'Show'} {archivedGens.length} older version{archivedGens.length > 1 ? 's' : ''}
                                          </button>
                                        )}
                                      </div>
                                      <video
                                        src={videoUrl}
                                        controls
                                        className="w-full max-h-80 rounded-md border border-neutral-800 bg-black"
                                      />
                                      <a
                                        href={videoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] text-blue-400 underline break-all"
                                      >
                                        Open in new tab
                                      </a>

                                      {/* Archived Versions */}
                                      {showArchivedGenerations && archivedGens.length > 0 && (
                                        <div className="mt-3 space-y-2 border-t border-neutral-800 pt-2">
                                          <div className="text-[11px] text-neutral-400 font-medium">Previous Versions:</div>
                                          {archivedGens.map((gen: any) => (
                                            <div key={gen.id} className="bg-neutral-800/50 rounded-md p-2 space-y-1">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <input
                                                    type="checkbox"
                                                    checked={selectedClipsForMerge[i] === gen.video_url}
                                                    onChange={() => toggleClipSelection(i, gen.video_url)}
                                                    className="w-3 h-3 rounded border-neutral-700 bg-neutral-800 text-photon-500 focus:ring-photon-500 focus:ring-offset-0"
                                                  />
                                                  <span className="text-[10px] text-neutral-500">
                                                    Version {gen.version_number} • {new Date(gen.created_at).toLocaleString()}
                                                  </span>
                                                </div>
                                                <span className="text-[10px] text-neutral-600">{gen.model_key}</span>
                                              </div>
                                              <video
                                                src={gen.video_url}
                                                controls
                                                className="w-full max-h-60 rounded border border-neutral-700 bg-black"
                                              />
                                              <a
                                                href={gen.video_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[10px] text-blue-400 underline break-all"
                                              >
                                                Open in new tab
                                              </a>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </li>
                        ))}
                      </ol>

                      {/* Generate Full Video Button */}
                      {Object.keys(selectedClipsForMerge).length > 0 && (
                        <div className="mt-6 border-t border-neutral-800 pt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-semibold">Merge Selected Clips</h3>
                              <p className="text-xs text-neutral-500 mt-1">
                                {Object.keys(selectedClipsForMerge).length} clip{Object.keys(selectedClipsForMerge).length > 1 ? 's' : ''} selected (in prompt order)
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleDownloadSelectedClips}
                                disabled={downloadingClips || Object.keys(selectedClipsForMerge).length === 0}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-medium"
                              >
                                {downloadingClips
                                  ? (downloadProgress
                                    ? `Downloading ${downloadProgress.current}/${downloadProgress.total}...`
                                    : 'Downloading...')
                                  : '📥 Download All'}
                              </button>
                              <button
                                onClick={() => {
                                  // Prepare clips data for editor
                                  const analysis = analysisByUrl[selectedAnalysisUrl];
                                  const prompts = analysis?.generation_prompts || [];
                                  const clipsData = Object.entries(selectedClipsForMerge)
                                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                    .map(([idx, url]) => ({
                                      url,
                                      prompt: prompts[parseInt(idx)] ? `Prompt ${parseInt(idx) + 1}` : `Clip ${parseInt(idx) + 1}`,
                                      duration: 10, // Will be detected in editor
                                    }));

                                  // Store in localStorage to avoid URL length limits
                                  localStorage.setItem('videoEditorClips', JSON.stringify(clipsData));

                                  // Navigate to editor
                                  router.push('/video-editor');
                                }}
                                disabled={Object.keys(selectedClipsForMerge).length === 0}
                                className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-medium"
                              >
                                Open in Editor
                              </button>
                              <button
                                onClick={handleMergeSelectedClips}
                                disabled={mergingVideos || Object.keys(selectedClipsForMerge).length < 2}
                                className="px-4 py-2 bg-gradient-to-r from-photon-500 to-photon-600 hover:from-photon-600 hover:to-photon-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-medium"
                              >
                                {mergingVideos ? 'Merging...' : 'Quick Merge'}
                              </button>
                            </div>
                          </div>

                          {downloadedFolder && (
                            <div className="bg-green-500/10 border border-green-500/40 rounded-md p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className="text-sm font-semibold text-green-400">
                                    {downloadInfo?.reused ? '✓ Existing Folder Found' : '✓ Clips Downloaded'} {downloadInfo && `(${downloadInfo.adName})`}
                                  </h4>
                                  <p className="text-xs text-neutral-400 mt-1">
                                    {downloadInfo?.reused
                                      ? `${Object.keys(selectedClipsForMerge).length} clips already in folder (no download needed)`
                                      : `${Object.keys(selectedClipsForMerge).length} clips saved to folder`}
                                  </p>
                                  <p className="text-xs text-blue-400 mt-1 font-mono break-all">
                                    {downloadedFolder}
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    // Open folder using file:// protocol
                                    const folderUrl = `file:///${downloadedFolder.replace(/\\/g, '/')}`;
                                    window.open(folderUrl, '_blank');
                                  }}
                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-xs font-medium whitespace-nowrap ml-3"
                                >
                                  📂 Open Folder
                                </button>
                              </div>
                            </div>
                          )}

                          {mergeError && (
                            <div className="text-xs text-red-400 border border-red-500/40 rounded-md p-2 bg-red-500/5">
                              {mergeError}
                            </div>
                          )}

                          {mergedVideoUrl && (
                            <div className="bg-neutral-800/50 border border-neutral-700 rounded-md p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-green-400">✓ Full Video Generated</h4>
                                <span className="text-xs text-neutral-500">{Object.keys(selectedClipsForMerge).length} clips merged</span>
                              </div>
                              <video
                                src={mergedVideoUrl}
                                controls
                                className="w-full max-h-96 rounded-md border border-neutral-700 bg-black"
                              />
                              <a
                                href={mergedVideoSystemPath || mergedVideoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 underline break-all"
                              >
                                Open in new tab
                              </a>
                            </div>
                          )}

                          {/* Merge History */}
                          {mergeHistory.length > 0 && (
                            <div className="mt-4 border-t border-neutral-800 pt-4">
                              <button
                                onClick={() => setShowMergeHistory(!showMergeHistory)}
                                className="text-sm font-semibold text-neutral-300 hover:text-white flex items-center gap-2"
                              >
                                <span>Merge History ({mergeHistory.length})</span>
                                <span className="text-xs">{showMergeHistory ? '▼' : '▶'}</span>
                              </button>

                              {showMergeHistory && (
                                <div className="mt-3 space-y-3">
                                  {mergeHistory.map((merge: any) => (
                                    <div key={merge.id} className="bg-neutral-800/50 border border-neutral-700 rounded-md p-3 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="text-xs text-neutral-400">
                                          <span className="font-medium text-neutral-300">{merge.clip_count} clips merged</span>
                                          <span className="mx-2">•</span>
                                          <span>{new Date(merge.created_at).toLocaleString()}</span>
                                        </div>
                                        {merge.file_size && (
                                          <span className="text-xs text-neutral-500">
                                            {(merge.file_size / 1024 / 1024).toFixed(1)} MB
                                          </span>
                                        )}
                                      </div>
                                      <video
                                        src={merge.video_url}
                                        controls
                                        className="w-full max-h-80 rounded border border-neutral-700 bg-black"
                                      />
                                      <a
                                        href={merge.video_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-400 underline break-all"
                                      >
                                        Open in new tab
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {download && result.downloaded && result.downloaded.length > 0 && (
              <div className="border rounded-md p-4">
                <h2 className="text-lg font-semibold mb-2">Downloaded Files ({result.downloaded.length})</h2>
                <ul className="space-y-1">
                  {result.downloaded.map((f: DownloadedFileInfo) => (
                    <li key={f.url} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 truncate">{f.local_path || 'File'}</span>
                      {typeof f.file_size === "number" && (
                        <span className="text-xs opacity-70">{(f.file_size / 1024 / 1024).toFixed(2)} MB</span>
                      )}
                      {f.public_url && (
                        <a href={f.public_url} download className="px-2 py-1 border rounded">Saved</a>
                      )}
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="px-2 py-1 border rounded">Source</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Veo Generation Settings Modal */}
      {showVeoModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowVeoModal(false)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                    <p className="text-xs text-neutral-500">Auto-detected from prompt</p>
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
                      {currentPromptForModal?.text.substring(0, 500)}...
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
                      onClick={handleGenerateVeoFromPrompt}
                      disabled={!selectedModel}
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

      {/* Custom Instruction Popup */}
      {showCustomInstructionPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => {
          setShowCustomInstructionPopup(false);
          setPendingAnalyzeUrl(null);
        }}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">
              {pendingAnalyzeUrl ? 'Analyze Video' : 'Regenerate with Custom Instructions'}
            </h2>
            <p className="text-sm text-neutral-400 mb-4">
              {pendingAnalyzeUrl
                ? 'Add optional custom instructions for analysis (or skip to analyze normally). For example: "Focus on Dubai real estate" or "Analyze for luxury market".'
                : 'Provide instructions to modify the prompts. For example: "Change all mentions of Bali to Dubai" or "Make it about luxury real estate instead of business".'
              }
            </p>
            <textarea
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder={pendingAnalyzeUrl
                ? "Optional: Add custom instructions or leave empty to analyze normally..."
                : "Example: Keep the same script structure but change the location from Bali to Dubai..."
              }
              className="w-full h-32 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowCustomInstructionPopup(false);
                  setCustomInstruction('');
                  setPendingAnalyzeUrl(null);
                }}
                className="px-4 py-2 border border-neutral-700 rounded-md text-sm hover:bg-neutral-800"
              >
                Cancel
              </button>
              {pendingAnalyzeUrl && (
                <button
                  onClick={() => {
                    handleAnalyze(pendingAnalyzeUrl);
                    setShowCustomInstructionPopup(false);
                    setCustomInstruction('');
                    setPendingAnalyzeUrl(null);
                  }}
                  disabled={analyzing === pendingAnalyzeUrl}
                  className="px-4 py-2 border border-neutral-700 rounded-md text-sm hover:bg-neutral-800"
                >
                  Skip & Analyze
                </button>
              )}
              <button
                onClick={() => {
                  if (pendingAnalyzeUrl) {
                    handleAnalyze(pendingAnalyzeUrl, customInstruction);
                    setShowCustomInstructionPopup(false);
                    setCustomInstruction('');
                    setPendingAnalyzeUrl(null);
                  } else {
                    regenerateWithCustomInstruction();
                  }
                }}
                disabled={pendingAnalyzeUrl ? (analyzing === pendingAnalyzeUrl) : (!customInstruction.trim() || regeneratingWithInstruction)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pendingAnalyzeUrl
                  ? (analyzing === pendingAnalyzeUrl ? 'Analyzing...' : '✨ Analyze with Instructions')
                  : (regeneratingWithInstruction ? 'Regenerating...' : '✨ Regenerate Prompts')
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
