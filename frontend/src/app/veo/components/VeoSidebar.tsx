import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, Sparkles, Video, Settings2, Palette, User, Wand2, Trash2, History } from 'lucide-react';
import { Style, CharacterPreset } from '../hooks/useVeoGenerator';
import type { VideoStyleTemplate } from '@/lib/api';
import { VeoHistory } from './VeoHistory';
import { VeoSessionResponse } from '@/lib/api';

interface VeoSidebarProps {
    script: string;
    setScript: (s: string) => void;
    availableStyles: Style[];
    selectedStyles: string[];
    handleStyleToggle: (id: string) => void;
    characterPresets: CharacterPreset[];
    selectedCharacter: string;
    setSelectedCharacter: (id: string) => void;
    geminiModel: string;
    setGeminiModel: (m: string) => void;
    isGenerating: boolean;
    handleGenerateBriefs: () => void;
    // Video Analyzer Props
    videoStyleUrl: string;
    setVideoStyleUrl: (s: string) => void;
    videoStyleName: string;
    setVideoStyleName: (s: string) => void;
    videoStyleDescription: string;
    setVideoStyleDescription: (s: string) => void;
    analyzingVideo: boolean;
    handleAnalyzeVideo: () => void;
    styleLibrary: VideoStyleTemplate[];
    selectedStyleTemplateId: number | null;
    setSelectedStyleTemplateId: (id: number | null) => void;
    handleDeleteStyleTemplate: (id: number) => void;
    showStyleLibrary: boolean;
    setShowStyleLibrary: (show: boolean) => void;
    // Video Generation Props
    veoModels: any[];
    veoModelsLoading: boolean;
    selectedModel: string;
    setSelectedModel: (m: string) => void;
    aspectRatio: string;
    setAspectRatio: (r: string) => void;
    loadSession: (session: VeoSessionResponse) => void;
    currentSessionId?: number;
}

export function VeoSidebar({
    script, setScript,
    availableStyles, selectedStyles, handleStyleToggle,
    characterPresets, selectedCharacter, setSelectedCharacter,
    geminiModel, setGeminiModel,
    isGenerating, handleGenerateBriefs,
    videoStyleUrl, setVideoStyleUrl,
    videoStyleName, setVideoStyleName,
    videoStyleDescription, setVideoStyleDescription,
    analyzingVideo, handleAnalyzeVideo,
    styleLibrary, selectedStyleTemplateId, setSelectedStyleTemplateId,
    handleDeleteStyleTemplate,
    showStyleLibrary, setShowStyleLibrary,
    veoModels, veoModelsLoading, selectedModel, setSelectedModel, aspectRatio, setAspectRatio,
    loadSession, currentSessionId
}: VeoSidebarProps) {
    const [showHistory, setShowHistory] = React.useState(false);

    return (
        <div className="w-[400px] border-r border-slate-800 bg-slate-950/50 backdrop-blur-xl flex flex-col h-full">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        VEO Studio
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">AI Video Generation Suite</p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className={`text-slate-400 hover:text-purple-400 ${showHistory ? 'bg-purple-500/10 text-purple-400' : ''}`}
                    onClick={() => setShowHistory(!showHistory)}
                    title="Session History"
                >
                    <History className="w-5 h-5" />
                </Button>
            </div>

            {showHistory ? (
                <VeoHistory
                    onSelectSession={(session) => {
                        loadSession(session);
                        setShowHistory(false);
                    }}
                    currentSessionId={currentSessionId}
                />
            ) : (
                <>
                    <ScrollArea className="flex-1 px-6 py-4">
                        <div className="space-y-8 pb-10">

                            {/* Script Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                                    <Settings2 className="w-4 h-4 text-purple-400" />
                                    Script / Voice-Over
                                </div>
                                <Textarea
                                    placeholder="Enter your script here..."
                                    value={script}
                                    onChange={(e) => setScript(e.target.value)}
                                    className="min-h-[150px] bg-slate-900/50 border-slate-800 focus:border-purple-500/50 resize-none text-sm"
                                />
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>{script.split(/\s+/).filter(Boolean).length} words</span>
                                    <span>~{Math.ceil(script.split(/\s+/).filter(Boolean).length / 3)}s duration</span>
                                </div>
                            </div>

                            <Separator className="bg-slate-800" />

                            {/* Style Selection */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm font-medium text-slate-200">
                                    <div className="flex items-center gap-2">
                                        <Palette className="w-4 h-4 text-pink-400" />
                                        Visual Styles
                                    </div>
                                    <span className="text-xs text-slate-500">{selectedStyles.length} selected</span>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {availableStyles.map((style) => (
                                        <div
                                            key={style.id}
                                            onClick={() => handleStyleToggle(style.id)}
                                            className={`
                            group relative p-3 rounded-lg border cursor-pointer transition-all duration-200
                            ${selectedStyles.includes(style.id)
                                                    ? 'bg-purple-500/10 border-purple-500/50'
                                                    : 'bg-slate-900/30 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'}
                          `}
                                        >
                                            <div className="flex items-start gap-3">
                                                <Checkbox
                                                    checked={selectedStyles.includes(style.id)}
                                                    className="mt-1 data-[state=checked]:bg-purple-500 border-slate-600"
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-slate-200 group-hover:text-purple-300 transition-colors">
                                                        {style.name}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                                        {style.description}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Separator className="bg-slate-800" />

                            {/* Video Analyzer */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm font-medium text-slate-200">
                                    <div className="flex items-center gap-2">
                                        <Video className="w-4 h-4 text-blue-400" />
                                        Style Analyzer
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs text-slate-400 hover:text-white"
                                        onClick={() => setShowStyleLibrary(!showStyleLibrary)}
                                    >
                                        {showStyleLibrary ? 'Hide Library' : 'Show Library'}
                                    </Button>
                                </div>

                                {showStyleLibrary && styleLibrary.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        {styleLibrary.map((template) => (
                                            <div
                                                key={template.id}
                                                onClick={() => setSelectedStyleTemplateId(selectedStyleTemplateId === template.id ? null : template.id)}
                                                className={`p-2 rounded border text-xs cursor-pointer flex items-center gap-3 justify-between ${selectedStyleTemplateId === template.id
                                                    ? 'bg-purple-900/20 border-purple-500/50 text-purple-200'
                                                    : 'bg-slate-900/30 border-slate-800 text-slate-400 hover:border-slate-700'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className="w-12 h-12 rounded-md overflow-hidden bg-slate-800 flex items-center justify-center">
                                                        {template.thumbnail_url ? (
                                                            <img src={template.thumbnail_url} alt={`Style thumbnail for ${template.name}`} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Video className="w-6 h-6 text-slate-500" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-slate-200 truncate">{template.name}</div>
                                                        {template.description && (
                                                            <div className="text-[11px] text-slate-500 truncate">{template.description}</div>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 text-slate-600 hover:text-red-400"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteStyleTemplate(template.id);
                                                    }}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="space-y-2 p-3 rounded-lg bg-slate-900/30 border border-slate-800">
                                    <Input
                                        placeholder="Video URL to analyze..."
                                        value={videoStyleUrl}
                                        onChange={(e) => setVideoStyleUrl(e.target.value)}
                                        className="h-8 text-xs bg-slate-950 border-slate-800"
                                    />
                                    <Input
                                        placeholder="Style Name"
                                        value={videoStyleName}
                                        onChange={(e) => setVideoStyleName(e.target.value)}
                                        className="h-8 text-xs bg-slate-950 border-slate-800"
                                    />
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="w-full h-8 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
                                        onClick={handleAnalyzeVideo}
                                        disabled={analyzingVideo}
                                    >
                                        {analyzingVideo ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Wand2 className="w-3 h-3 mr-2" />}
                                        Analyze Style
                                    </Button>
                                </div>
                            </div>

                            <Separator className="bg-slate-800" />

                            {/* Character & Model */}
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Character Preset</Label>
                                    <Select value={selectedCharacter} onValueChange={setSelectedCharacter}>
                                        <SelectTrigger className="bg-slate-900/50 border-slate-800 text-slate-300">
                                            <SelectValue placeholder="Select character..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                            <SelectItem value="none">None (AI Decide)</SelectItem>
                                            {characterPresets.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Brief Generation Model</Label>
                                    <Select value={geminiModel} onValueChange={setGeminiModel}>
                                        <SelectTrigger className="bg-slate-900/50 border-slate-800 text-slate-300">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                            {/* Gemini 2.0 Models */}
                                            <SelectItem value="gemini-2.0-flash-001">✨ Gemini 2.0 Flash (Gemini)</SelectItem>
                                            <SelectItem value="gemini-2.0-flash-lite">⚡ Gemini 2.0 Flash-Lite (Gemini)</SelectItem>

                                            {/* Gemini 2.5 Models */}
                                            <SelectItem value="gemini-2.5-flash-001">🚀 Gemini 2.5 Flash (Gemini)</SelectItem>
                                            <SelectItem value="gemini-2.5-flash-preview-09-2025">🧪 Gemini 2.5 Flash Preview (Gemini)</SelectItem>
                                            <SelectItem value="gemini-2.5-flash-lite">⚡ Gemini 2.5 Flash-Lite (Gemini)</SelectItem>
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
                                </div>

                                <Separator className="bg-slate-800" />

                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Aspect Ratio</Label>
                                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                                        <SelectTrigger className="bg-slate-900/50 border-slate-800 text-slate-300">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                            {(() => {
                                                // 1. Filter for relevant models (Text-to-Video)
                                                const relevantModels = veoModels.filter(m =>
                                                    m.capabilities?.includes('VIDEO_MODEL_CAPABILITY_TEXT')
                                                );

                                                // 2. Extract unique aspect ratios
                                                const uniqueRatios = Array.from(new Set(
                                                    relevantModels.flatMap(m => m.supportedAspectRatios || [])
                                                ));

                                                // 3. Map to labels
                                                const RATIO_LABELS: Record<string, string> = {
                                                    'VIDEO_ASPECT_RATIO_LANDSCAPE': 'Landscape (16:9)',
                                                    'VIDEO_ASPECT_RATIO_PORTRAIT': 'Portrait (9:16)',
                                                    'VIDEO_ASPECT_RATIO_SQUARE': 'Square (1:1)',
                                                };

                                                return uniqueRatios.map(ratio => (
                                                    <SelectItem key={ratio} value={ratio}>
                                                        {RATIO_LABELS[ratio] || ratio.replace('VIDEO_ASPECT_RATIO_', '').toLowerCase()}
                                                    </SelectItem>
                                                ));
                                            })()}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Video Generation Model</Label>
                                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                                        <SelectTrigger className="bg-slate-900/50 border-slate-800 text-slate-300">
                                            <SelectValue placeholder="Select Video Model" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-300 max-h-[300px]">
                                            {veoModelsLoading ? (
                                                <div className="p-2 text-xs text-center text-slate-500">Loading...</div>
                                            ) : (
                                                veoModels
                                                    .filter(m => {
                                                        const hasTextCapability = m.capabilities?.includes('VIDEO_MODEL_CAPABILITY_TEXT');
                                                        const matchesAspectRatio = !aspectRatio || m.supportedAspectRatios.includes(aspectRatio);
                                                        return hasTextCapability && matchesAspectRatio;
                                                    })
                                                    .sort((a, b) => {
                                                        // Sort non-deprecated first
                                                        if (a.modelStatus === 'MODEL_STATUS_DEPRECATED' && b.modelStatus !== 'MODEL_STATUS_DEPRECATED') return 1;
                                                        if (a.modelStatus !== 'MODEL_STATUS_DEPRECATED' && b.modelStatus === 'MODEL_STATUS_DEPRECATED') return -1;
                                                        return 0;
                                                    })
                                                    .map(m => {
                                                        const isDeprecated = m.modelStatus === 'MODEL_STATUS_DEPRECATED';
                                                        const capabilities = m.capabilities || [];
                                                        let type = "Standard";
                                                        if (capabilities.includes('VIDEO_MODEL_CAPABILITY_TEXT')) type = "Text-to-Video";
                                                        else if (capabilities.includes('VIDEO_MODEL_CAPABILITY_START_IMAGE')) type = "Image-to-Video";
                                                        else if (capabilities.includes('VIDEO_MODEL_CAPABILITY_VIDEO_EXTENSION')) type = "Extension";

                                                        const cost = m.creditCost ? `${m.creditCost} credits` : '';
                                                        const details = [type, cost, isDeprecated ? 'Deprecated' : ''].filter(Boolean).join(' • ');

                                                        return (
                                                            <SelectItem key={m.key} value={m.key} disabled={isDeprecated} className="py-2">
                                                                <div className="flex flex-col text-left">
                                                                    <span className={isDeprecated ? "text-slate-500 line-through" : ""}>
                                                                        {m.displayName || m.key}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-500">
                                                                        {details}
                                                                    </span>
                                                                </div>
                                                            </SelectItem>
                                                        );
                                                    })
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                        </div>
                    </ScrollArea>

                    <div className="p-6 border-t border-slate-800 bg-slate-950/80 backdrop-blur-xl">
                        <Button
                            onClick={handleGenerateBriefs}
                            disabled={isGenerating || !script.trim() || (selectedStyles.length === 0 && !selectedStyleTemplateId)}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-900/20"
                            size="lg"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate Briefs
                                </>
                            )}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
