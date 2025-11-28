import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { adsApi, VeoModel, VeoSessionResponse, VeoBriefResponse, VeoSegmentResponse, type VideoStyleTemplate, API_BASE_URL, API_PREFIX } from '@/lib/api';

export interface Style {
    id: string;
    name: string;
    description: string;
    example_use_case: string;
}

export interface CharacterPreset {
    id: string;
    name: string;
    age: string;
    gender: string;
    ethnicity: string;
    features: string;
    wardrobe: string;
    energy: string;
}

export interface CreativeBriefVariation {
    style: string;
    segments: string[];
}

export interface VeoVideoData {
    url: string;
    prompt: string;
}

export function useVeoGenerator() {
    const [script, setScript] = useState('');
    const [availableStyles, setAvailableStyles] = useState<Style[]>([]);
    const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
    const [characterPresets, setCharacterPresets] = useState<CharacterPreset[]>([]);
    const [selectedCharacter, setSelectedCharacter] = useState<string>('none');
    const [isGenerating, setIsGenerating] = useState(false);
    const [useCustomInstruction, setUseCustomInstruction] = useState<boolean>(false);
    const [customInstruction, setCustomInstruction] = useState<string>('');
    const [generatedVariations, setGeneratedVariations] = useState<CreativeBriefVariation[]>([]);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [veoGeneratingKeys, setVeoGeneratingKeys] = useState<Set<string>>(new Set());
    const [veoVideoByPromptKey, setVeoVideoByPromptKey] = useState<Record<string, VeoVideoData[]>>({});
    const [veoErrorByPromptKey, setVeoErrorByPromptKey] = useState<Record<string, string | null>>({});
    const [generationTimeRemaining, setGenerationTimeRemaining] = useState<Record<string, number>>({});
    const [generationStartTime, setGenerationStartTime] = useState<Record<string, number>>({});
    const [generationIntervals, setGenerationIntervals] = useState<Record<string, NodeJS.Timeout>>({});
    const [actualGenerationTime, setActualGenerationTime] = useState<Record<string, number>>({});

    // Session state - NEW
    const [currentSession, setCurrentSession] = useState<VeoSessionResponse | null>(null);
    const [segmentIdByKey, setSegmentIdByKey] = useState<Record<string, number>>({}); // Map promptKey -> segmentId

    // Merge state
    const [selectedClipsForMerge, setSelectedClipsForMerge] = useState<Record<string, string[]>>({}); // style -> [urls]
    const [mergingStyles, setMergingStyles] = useState<Set<string>>(new Set());
    const [mergedVideoByStyle, setMergedVideoByStyle] = useState<Record<string, string>>({});
    const [mergeErrorByStyle, setMergeErrorByStyle] = useState<Record<string, string | null>>({});

    // Veo generation modal state
    const [showVeoModal, setShowVeoModal] = useState(false);
    const [currentPromptForModal, setCurrentPromptForModal] = useState<{ text: string; key: string; segmentId: number | null } | null>(null);
    const [veoModels, setVeoModels] = useState<VeoModel[]>([]);
    const [veoModelsLoading, setVeoModelsLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState<string>('veo_3_1_t2v_portrait');
    const [aspectRatio, setAspectRatio] = useState<string>('VIDEO_ASPECT_RATIO_PORTRAIT');
    const [seed, setSeed] = useState<number>(9831);
    const [geminiModel, setGeminiModel] = useState<string>('gemini-2.0-flash-lite');

    // Video Style Analyzer state
    const [videoStyleUrl, setVideoStyleUrl] = useState<string>('');
    const [videoStyleName, setVideoStyleName] = useState<string>('');
    const [videoStyleDescription, setVideoStyleDescription] = useState<string>('');
    const [analyzingVideo, setAnalyzingVideo] = useState(false);
    const [styleLibrary, setStyleLibrary] = useState<VideoStyleTemplate[]>([]);
    const [selectedStyleTemplateId, setSelectedStyleTemplateId] = useState<number | null>(null);
    const [showStyleLibrary, setShowStyleLibrary] = useState(true);

    // Load initial data
    useEffect(() => {
        loadAvailableStyles();
        loadCharacterPresets();
        loadVeoModels();
        loadStyleLibrary();
    }, []);

    const loadAvailableStyles = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo/available-styles`);
            const data = await response.json();
            setAvailableStyles(data.styles || []);
        } catch (error) {
            console.error('Failed to load styles:', error);
            toast.error('Failed to load available styles');
        }
    };

    const loadCharacterPresets = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo/character-presets`);
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
            setVeoModels(models);
            // Auto-select best model for default aspect ratio
            const bestModel = findBestModel(models, aspectRatio);
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

    const loadStyleLibrary = async () => {
        try {
            const res = await adsApi.getStyleLibrary();
            const templates = (res.templates || []).map(t => ({
                ...t,
                thumbnail_url: t.thumbnail_url
                    ? (t.thumbnail_url.startsWith('http://') || t.thumbnail_url.startsWith('https://')
                        ? t.thumbnail_url
                        : `${API_BASE_URL}${t.thumbnail_url}`)
                    : t.thumbnail_url
            }));
            setStyleLibrary(templates);
        } catch (error) {
            console.error('Failed to load style library:', error);
        }
    };

    const handleAnalyzeVideo = async () => {
        if (!videoStyleUrl.trim()) {
            toast.error('Please enter a video URL');
            return;
        }
        if (!videoStyleName.trim()) {
            toast.error('Please enter a style name');
            return;
        }

        setAnalyzingVideo(true);
        try {
            const res = await adsApi.analyzeVideoStyle({
                video_url: videoStyleUrl,
                style_name: videoStyleName,
                description: videoStyleDescription || undefined,
            });

            if (res.success) {
                toast.success(`✅ Style "${videoStyleName}" analyzed and saved!`);
                setVideoStyleUrl('');
                setVideoStyleName('');
                setVideoStyleDescription('');
                await loadStyleLibrary(); // Reload library
            } else {
                toast.error(res.error || 'Failed to analyze video');
            }
        } catch (error: any) {
            console.error('Failed to analyze video:', error);
            toast.error('Failed to analyze video: ' + error.message);
        } finally {
            setAnalyzingVideo(false);
        }
    };

    const reanalyzeStyleTemplate = async (template: VideoStyleTemplate) => {
        setAnalyzingVideo(true);
        try {
            const res = await adsApi.analyzeVideoStyle({
                video_url: template.video_url,
                style_name: template.name,
                description: template.description || undefined,
            });
            if (res.success) {
                toast.success(`Style "${template.name}" re-analyzed and saved`);
                await loadStyleLibrary();
            } else {
                toast.error(res.error || 'Failed to re-analyze video');
            }
        } catch (error: any) {
            console.error('Failed to re-analyze video:', error);
            toast.error('Failed to re-analyze video: ' + error.message);
        } finally {
            setAnalyzingVideo(false);
        }
    };

    const handleDeleteStyleTemplate = async (templateId: number) => {
        if (!confirm('Are you sure you want to delete this style template?')) return;

        try {
            await adsApi.deleteStyleTemplate(templateId);
            toast.success('Style template deleted');
            await loadStyleLibrary();
            if (selectedStyleTemplateId === templateId) {
                setSelectedStyleTemplateId(null);
            }
        } catch (error: any) {
            console.error('Failed to delete style template:', error);
            toast.error('Failed to delete style template');
        }
    };

    const handleStyleToggle = (style: string) => {
        if (style === 'none') {
            setSelectedStyles([]);
        } else {
            setSelectedStyles([style]);
        }
    };

    const handleGenerateBriefs = async () => {
        if (!script.trim()) {
            toast.error('Please enter a script');
            return;
        }

        if (selectedStyles.length === 0 && !selectedStyleTemplateId) {
            toast.error('Please select at least one style');
            return;
        }

        try {
            setIsGenerating(true);

            // Get character object if selected
            const selectedPreset = characterPresets.find(p => p.id === selectedCharacter);
            const character = selectedPreset ? {
                id: selectedPreset.id,
                name: selectedPreset.name,
                age: selectedPreset.age,
                gender: selectedPreset.gender,
                ethnicity: selectedPreset.ethnicity,
                features: selectedPreset.features,
                wardrobe: selectedPreset.wardrobe,
                energy: selectedPreset.energy,
            } : undefined;

            // Create session via new API
            const session = await adsApi.createVeoSession({
                script,
                styles: selectedStyles,
                character,
                model: geminiModel,
                aspect_ratio: aspectRatio,
                video_model_key: selectedModel,
                style_template_id: selectedStyleTemplateId || undefined,
                custom_instruction: useCustomInstruction && customInstruction.trim() ? customInstruction.trim() : undefined,
            });

            // Store session
            setCurrentSession(session);

            // Convert to legacy format for UI compatibility
            const variations: CreativeBriefVariation[] = session.briefs.map(brief => ({
                style: brief.style_id,
                segments: brief.segments.map(seg => seg.current_prompt),
            }));

            setGeneratedVariations(variations);

            // Map segment IDs for video generation
            const segmentMapping: Record<string, number> = {};
            session.briefs.forEach(brief => {
                brief.segments.forEach((segment, idx) => {
                    const promptKey = `${brief.style_id}:prompt:${idx + 1}`;
                    segmentMapping[promptKey] = segment.id;

                    // Load existing videos if any
                    if (segment.videos && segment.videos.length > 0) {
                        setVeoVideoByPromptKey(prev => ({
                            ...prev,
                            [promptKey]: segment.videos.map(v => ({ url: v.video_url, prompt: v.prompt_used })),
                        }));
                    }
                });
            });

            setSegmentIdByKey(segmentMapping);
            toast.success(`✨ Generated ${variations.length} creative brief variations!`);
        } catch (error: any) {
            console.error('Failed to generate briefs:', error);
            toast.error('Failed to generate briefs');
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

    const openVeoModal = (promptText: string, promptKey: string) => {
        const segmentId = segmentIdByKey[promptKey] || null;
        setCurrentPromptForModal({ text: promptText, key: promptKey, segmentId });
        setShowVeoModal(true);
    };

    const saveEditedPrompt = async (promptKey: string, newText: string) => {
        try {
            const segmentId = segmentIdByKey[promptKey];
            if (!segmentId) {
                toast.error('Segment ID not found for this prompt');
                return false;
            }
            const res = await adsApi.updateSegmentPrompt(segmentId, newText);
            // Update generatedVariations in place
            setGeneratedVariations(prev => {
                const next = prev.map(variation => {
                    const styleId = variation.style;
                    const matchPrefix = `${styleId}:prompt:`;
                    if (promptKey.startsWith(matchPrefix)) {
                        const idxStr = promptKey.slice(matchPrefix.length);
                        const segIdx = Math.max(0, parseInt(idxStr) - 1);
                        const segments = [...variation.segments];
                        segments[segIdx] = res.current_prompt || newText;
                        return { ...variation, segments };
                    }
                    return variation;
                });
                return next;
            });
            toast.success('Prompt updated');
            return true;
        } catch (error: any) {
            console.error('Failed to update prompt:', error);
            toast.error(error.message || 'Failed to update prompt');
            return false;
        }
    };

    const handleGenerateVideo = async () => {
        if (!currentPromptForModal || !selectedModel) return;
        const { text: promptText, key: promptKey, segmentId } = currentPromptForModal;

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

            // Store interval reference
            setGenerationIntervals(prev => ({ ...prev, [promptKey]: countdownInterval }));

            // Start async video generation
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
                        clearInterval(pollInterval);

                        // Save to state
                        setVeoVideoByPromptKey(prev => ({
                            ...prev,
                            [promptKey]: [...(prev[promptKey] || []), { url: status.result!.video_url!, prompt: promptText }]
                        }));

                        const actualTime = Math.floor((Date.now() - startTime) / 1000);
                        setActualGenerationTime(prev => ({ ...prev, [promptKey]: actualTime }));

                        // Save to backend if segmentId exists
                        if (segmentId) {
                            try {
                                await adsApi.saveVideoToSegment(segmentId, {
                                    video_url: status.result!.video_url!,
                                    prompt_used: promptText,
                                    model_key: selectedModel,
                                    aspect_ratio: aspectRatio,
                                    seed: seed,
                                    generation_time_seconds: actualTime
                                });
                                console.log('Video saved to backend segment', segmentId);
                            } catch (err) {
                                console.error('Failed to save video to backend:', err);
                            }
                        }

                        // Clear timers
                        setGenerationIntervals(prev => {
                            if (prev[promptKey]) clearInterval(prev[promptKey]);
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
                } catch (pollErr: any) {
                    console.error('Polling error:', pollErr);
                    clearInterval(pollInterval);
                    const msg = (pollErr && pollErr.status === 0)
                        ? 'Network error while polling task status'
                        : (pollErr?.message || 'Polling failed');
                    setVeoErrorByPromptKey(prev => ({ ...prev, [promptKey]: msg }));
                    setVeoGeneratingKeys(prev => { const next = new Set(prev); next.delete(promptKey); return next; });
                    toast.error(msg);
                }
            }, 3000);

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

    const generateVideoForPrompt = async (promptText: string, promptKey: string) => {
        if (!selectedModel) return;
        const segmentId = segmentIdByKey[promptKey] || null;

        const selectedModelData = veoModels.find(m => m.key === selectedModel);
        const estimatedSeconds = selectedModelData?.videoGenerationTimeSeconds || 120;

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

            const pollInterval = setInterval(async () => {
                try {
                    const status = await adsApi.getVeoTaskStatus(asyncRes.task_id);
                    if (status.state === 'SUCCESS' && status.result?.video_url) {
                        clearInterval(pollInterval);
                        setVeoVideoByPromptKey(prev => ({
                            ...prev,
                            [promptKey]: [...(prev[promptKey] || []), { url: status.result!.video_url!, prompt: promptText }]
                        }));

                        const actualTime = Math.floor((Date.now() - startTime) / 1000);
                        setActualGenerationTime(prev => ({ ...prev, [promptKey]: actualTime }));

                        if (segmentId) {
                            try {
                                await adsApi.saveVideoToSegment(segmentId, {
                                    video_url: status.result!.video_url!,
                                    prompt_used: promptText,
                                    model_key: selectedModel,
                                    aspect_ratio: aspectRatio,
                                    seed: seed,
                                    generation_time_seconds: actualTime
                                });
                            } catch (err) {
                                console.error('Failed to save video to backend:', err);
                            }
                        }

                        setGenerationIntervals(prev => { if (prev[promptKey]) clearInterval(prev[promptKey]); const next = { ...prev }; delete next[promptKey]; return next; });
                        setGenerationTimeRemaining(prev => { const next = { ...prev }; delete next[promptKey]; return next; });
                        setVeoGeneratingKeys(prev => { const next = new Set(prev); next.delete(promptKey); return next; });
                        toast.success('Video generated successfully!');
                    } else if (status.state === 'FAILURE') {
                        clearInterval(pollInterval);
                        const msg = (status.result as any)?.error || 'Video generation failed';
                        setVeoErrorByPromptKey(prev => ({ ...prev, [promptKey]: msg }));
                        setVeoGeneratingKeys(prev => { const next = new Set(prev); next.delete(promptKey); return next; });
                        toast.error(msg);
                    }
                } catch (pollErr) {
                    console.error('Polling error:', pollErr);
                }
            }, 3000);
        } catch (err: any) {
            const msg = err.message || 'Generation failed';
            setVeoErrorByPromptKey(prev => ({ ...prev, [promptKey]: msg }));
            toast.error(msg);
            setVeoGeneratingKeys(prev => { const next = new Set(prev); next.delete(promptKey); return next; });
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
            const response = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo/merge-videos`, {
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

            const fullUrl = data.public_url.startsWith('/media')
                ? `${API_BASE_URL}${data.public_url}`
                : data.public_url;
            setMergedVideoByStyle(prev => ({ ...prev, [style]: fullUrl }));
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

    const loadSession = (session: VeoSessionResponse) => {
        setScript(session.script);
        setSelectedStyles(session.selected_styles);
        if (session.character_preset_id) setSelectedCharacter(session.character_preset_id);
        setGeminiModel(session.gemini_model);
        setAspectRatio(session.aspect_ratio);
        setSelectedModel(session.video_model_key);
        setCurrentSession(session);

        // Restore variations
        const variations: CreativeBriefVariation[] = session.briefs.map(brief => ({
            style: brief.style_id,
            segments: brief.segments.map(seg => seg.current_prompt),
        }));
        setGeneratedVariations(variations);

        // Restore segment mapping and videos
        const segmentMapping: Record<string, number> = {};
        const videoMapping: Record<string, VeoVideoData[]> = {};

        session.briefs.forEach(brief => {
            brief.segments.forEach((segment, idx) => {
                const promptKey = `${brief.style_id}:prompt:${idx + 1}`;
                segmentMapping[promptKey] = segment.id;

                if (segment.videos && segment.videos.length > 0) {
                    videoMapping[promptKey] = segment.videos.map(v => ({ url: v.video_url, prompt: v.prompt_used }));
                }
            });
        });

        setSegmentIdByKey(segmentMapping);
        setVeoVideoByPromptKey(videoMapping);

        toast.success(`Loaded session #${session.id}`);
    };

    return {
        script, setScript,
        availableStyles,
        selectedStyles, setSelectedStyles,
        characterPresets,
        selectedCharacter, setSelectedCharacter,
        geminiModel, setGeminiModel,
        isGenerating,
        generatedVariations,
        copiedKey,
        veoGeneratingKeys,
        veoVideoByPromptKey,
        veoErrorByPromptKey,
        generationTimeRemaining,
        generationStartTime,
        actualGenerationTime,
        openVeoModal,
        handleCopy,
        selectedClipsForMerge,
        toggleClipSelection,
        handleMergeClips,
        mergingStyles,
        mergedVideoByStyle,
        mergeErrorByStyle,
        aspectRatio, setAspectRatio,
        showVeoModal, setShowVeoModal,
        currentPromptForModal,
        handleGenerateVideo,
        generateVideoForPrompt,
        saveEditedPrompt,
        veoModels,
        veoModelsLoading,
        selectedModel, setSelectedModel,
        seed, setSeed,
        handleGenerateBriefs,
        handleStyleToggle,
        videoStyleUrl, setVideoStyleUrl,
        videoStyleName, setVideoStyleName,
        videoStyleDescription, setVideoStyleDescription,
        analyzingVideo,
        handleAnalyzeVideo,
        reanalyzeStyleTemplate,
        styleLibrary,
        selectedStyleTemplateId, setSelectedStyleTemplateId,
        handleDeleteStyleTemplate,
        showStyleLibrary, setShowStyleLibrary,
        currentSession,
        segmentIdByKey,
        loadSession,
        useCustomInstruction, setUseCustomInstruction,
        customInstruction, setCustomInstruction,
    };
}
