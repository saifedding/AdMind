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
import { VeoSessionResponse, API_BASE_URL } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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
    reanalyzeStyleTemplate: (t: VideoStyleTemplate) => void;
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
    useCustomInstruction: boolean;
    setUseCustomInstruction: (v: boolean) => void;
    customInstruction: string;
    setCustomInstruction: (s: string) => void;
    layout?: 'sidebar' | 'row';
    portraitColumns: number;
    setPortraitColumns: (n: number) => void;
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
    analyzingVideo, handleAnalyzeVideo, reanalyzeStyleTemplate,
    styleLibrary, selectedStyleTemplateId, setSelectedStyleTemplateId,
    handleDeleteStyleTemplate,
    showStyleLibrary, setShowStyleLibrary,
    veoModels, veoModelsLoading, selectedModel, setSelectedModel, aspectRatio, setAspectRatio,
    loadSession, currentSessionId,
    useCustomInstruction, setUseCustomInstruction,
    customInstruction, setCustomInstruction,
    layout = 'sidebar'
    , portraitColumns, setPortraitColumns
}: VeoSidebarProps) {
    const [showHistory, setShowHistory] = React.useState(false);
    const [showSettings, setShowSettings] = React.useState(false);
    const [detailsTemplate, setDetailsTemplate] = React.useState<VideoStyleTemplate | null>(null);
    const getThumbnailUrl = (url?: string) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return `${API_BASE_URL}${url}`;
    };

    const containerClass = layout === 'row'
        ? 'w-full border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl flex flex-col'
        : 'flex-none w-full sm:w-[300px] md:w-[340px] lg:w-[380px] xl:w-[400px] max-w-[95vw] border-r border-slate-800 bg-slate-950/50 backdrop-blur-xl flex flex-col h-full';

    return (
        <div className={containerClass}>
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

                            {/* Script & Instruction */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                                        <Settings2 className="w-4 h-4 text-purple-400" />
                                        Script / Voice-Over
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="custom-inst-toggle" className="text-xs text-slate-400 cursor-pointer select-none">Custom Instruction</Label>
                                        <Checkbox
                                            id="custom-inst-toggle"
                                            checked={useCustomInstruction}
                                            onCheckedChange={(c) => setUseCustomInstruction(!!c)}
                                            className="data-[state=checked]:bg-purple-500 border-slate-600"
                                        />
                                    </div>
                                </div>
                                <div className={`grid grid-cols-1 ${useCustomInstruction ? 'lg:grid-cols-2' : ''} gap-4`}>
                                    <div className="space-y-3">
                                        <Textarea
                                            placeholder="Enter your script here..."
                                            value={script}
                                            onChange={(e) => setScript(e.target.value)}
                                            className="min-h-[180px] bg-slate-900/50 border-slate-800 focus:border-purple-500/50 resize-none text-sm"
                                        />
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>{script.split(/\s+/).filter(Boolean).length} words</span>
                                            <span>~{Math.ceil(script.split(/\s+/).filter(Boolean).length / 3)}s duration</span>
                                        </div>
                                    </div>
                                    {useCustomInstruction && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-300">
                                            <Textarea
                                                placeholder="Enter your custom instruction (e.g. 'Use a cinematic style with slow pans')..."
                                                value={customInstruction}
                                                onChange={(e) => setCustomInstruction(e.target.value)}
                                                className="min-h-[180px] bg-slate-900/50 border-slate-800 focus:border-purple-500/50 resize-none text-xs"
                                            />
                                            <div className="text-xs text-slate-500 text-right">
                                                Overrides default style prompts
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Separator className="bg-slate-800" />

                            {/* Style & Character (optional) */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                                    <Palette className="w-4 h-4 text-pink-400" />
                                    Style & Character (optional)
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    <div className="space-y-2 w-[240px]">
                                        <Label className="text-xs text-slate-400">Visual Styles</Label>
                                        <Select value={selectedStyles[0] || 'none'} onValueChange={handleStyleToggle}>
                                            <SelectTrigger className="bg-slate-900/50 border-slate-800 text-slate-300">
                                                <SelectValue placeholder="Select a visual style..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                                <SelectItem value="none">None</SelectItem>
                                                {availableStyles.map(style => (
                                                    <SelectItem key={style.id} value={style.id}>{style.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 w-[240px]">
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
                                                            <img src={getThumbnailUrl(template.thumbnail_url)} alt={`Style thumbnail for ${template.name}`} className="w-full h-full object-cover" />
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
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-slate-400 hover:text-white"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDetailsTemplate(template);
                                                    }}
                                                >
                                                    Details
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-slate-400 hover:text-white"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        reanalyzeStyleTemplate(template);
                                                    }}
                                                    disabled={analyzingVideo}
                                                >
                                                    Re-Analyze
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="space-y-3 p-3 rounded-lg bg-slate-900/30 border border-slate-800">
                                    <div className="flex flex-wrap gap-3 items-end">
                                        <div className="flex-1 min-w-[200px] max-w-[400px]">
                                            <Input
                                                placeholder="Video URL to analyze..."
                                                value={videoStyleUrl}
                                                onChange={(e) => setVideoStyleUrl(e.target.value)}
                                                className="h-9 text-xs bg-slate-950 border-slate-800"
                                            />
                                        </div>
                                        <div className="w-[200px]">
                                            <Input
                                                placeholder="Style Name"
                                                value={videoStyleName}
                                                onChange={(e) => setVideoStyleName(e.target.value)}
                                                className="h-9 text-xs bg-slate-950 border-slate-800"
                                            />
                                        </div>
                                        <div className="w-[140px]">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="w-full h-9 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
                                                onClick={handleAnalyzeVideo}
                                                disabled={analyzingVideo}
                                            >
                                                {analyzingVideo ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Wand2 className="w-3 h-3 mr-2" />}
                                                Analyze Style
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator className="bg-slate-800" />

                            {/* Settings */}
                            <div className="grid grid-cols-1 gap-4">

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs text-slate-400">Settings</Label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs text-slate-400 hover:text-white"
                                            onClick={() => setShowSettings(prev => !prev)}
                                        >
                                            {showSettings ? 'Hide' : 'Show'}
                                        </Button>
                                    </div>
                                    {showSettings && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs text-slate-400">Brief Generation Model</Label>
                                                <Select value={geminiModel} onValueChange={setGeminiModel}>
                                                    <SelectTrigger className="w-full bg-slate-900/50 border-slate-800 text-slate-300">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                                        <SelectItem value="gemini-2.0-flash-001">✨ Gemini 2.0 Flash (Gemini)</SelectItem>
                                                        <SelectItem value="gemini-2.0-flash-lite">⚡ Gemini 2.0 Flash-Lite (Gemini)</SelectItem>
                                                        <SelectItem value="gemini-2.5-flash-001">🚀 Gemini 2.5 Flash (Gemini)</SelectItem>
                                                        <SelectItem value="gemini-2.5-flash-preview-09-2025">🧪 Gemini 2.5 Flash Preview (Gemini)</SelectItem>
                                                        <SelectItem value="gemini-2.5-flash-lite">⚡ Gemini 2.5 Flash-Lite (Gemini)</SelectItem>
                                                        <SelectItem value="gemini-2.5-flash-lite-preview-09-2025">🌟 Gemini 2.5 Flash-Lite Preview (Gemini)</SelectItem>
                                                        <SelectItem value="gemini-2.5-pro">🎯 Gemini 2.5 Pro (Gemini)</SelectItem>
                                                        <SelectItem value="gemini-3-pro-preview">👑 Gemini 3 Pro Preview (Gemini)</SelectItem>

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

                                            <div className="space-y-2">
                                                <Label className="text-xs text-slate-400">Aspect Ratio</Label>
                                                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                                                    <SelectTrigger className="w-full bg-slate-900/50 border-slate-800 text-slate-300">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                                        {(() => {
                                                            const relevantModels = veoModels.filter(m =>
                                                                m.capabilities?.includes('VIDEO_MODEL_CAPABILITY_TEXT')
                                                            );
                                                            const uniqueRatios = Array.from(new Set(
                                                                relevantModels.flatMap(m => m.supportedAspectRatios || [])
                                                            ));
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

                                            {aspectRatio === 'VIDEO_ASPECT_RATIO_PORTRAIT' && (
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-slate-400">Prompt Columns (9:16)</Label>
                                                    <Select value={String(portraitColumns)} onValueChange={(v) => setPortraitColumns(parseInt(v))}>
                                                        <SelectTrigger className="w-full bg-slate-900/50 border-slate-800 text-slate-300">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                                            <SelectItem value="1">1</SelectItem>
                                                            <SelectItem value="2">2</SelectItem>
                                                            <SelectItem value="3">3</SelectItem>
                                                            <SelectItem value="4">4</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label className="text-xs text-slate-400">Video Generation Model</Label>
                                                <Select value={selectedModel} onValueChange={setSelectedModel}>
                                                    <SelectTrigger className="w-full bg-slate-900/50 border-slate-800 text-slate-300">
                                                        <SelectValue placeholder="Select Video Model" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-300 max-h-[300px]">
                                                        {veoModelsLoading ? (
                                                            <div className="p-2 text-xs text-center text-slate-500">Loading...</div>
                                                        ) : (
                                                            (() => {
                                                                const textModels = veoModels.filter(m => (m.capabilities || []).includes('VIDEO_MODEL_CAPABILITY_TEXT'));
                                                                const current = veoModels.find(m => m.key === selectedModel);
                                                                const list = current && !textModels.some(m => m.key === current.key)
                                                                    ? [current, ...textModels]
                                                                    : textModels;
                                                                return list.map(m => {
                                                                    const cost = m.creditCost ? `${m.creditCost} credits` : '';
                                                                    const details = [
                                                                        'Text-to-Video',
                                                                        cost,
                                                                        m.key === selectedModel ? 'Current' : '',
                                                                        m.modelStatus === 'MODEL_STATUS_DEPRECATED' ? 'Deprecated' : ''
                                                                    ].filter(Boolean).join(' • ');
                                                                    return (
                                                                        <SelectItem key={m.key} value={m.key} className="py-2">
                                                                            <div className="flex flex-col text-left">
                                                                                <span>{m.displayName || m.key}</span>
                                                                                <span className="text-[10px] text-slate-500">{details}</span>
                                                                            </div>
                                                                        </SelectItem>
                                                                    );
                                                                });
                                                            })()
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    )}
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
            <Dialog open={!!detailsTemplate} onOpenChange={(o) => !o && setDetailsTemplate(null)}>
                <DialogContent className="sm:max-w-2xl">
                    {detailsTemplate && (
                        <div className="space-y-4">
                            <DialogHeader>
                                <DialogTitle>{detailsTemplate.name}</DialogTitle>
                                {detailsTemplate.description && (
                                    <DialogDescription>{detailsTemplate.description}</DialogDescription>
                                )}
                            </DialogHeader>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1">
                                    <div className="w-full aspect-square rounded-md overflow-hidden bg-slate-800">
                                        {detailsTemplate.thumbnail_url ? (
                                            <img src={getThumbnailUrl(detailsTemplate.thumbnail_url)} alt={detailsTemplate.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Video className="w-6 h-6 text-slate-500" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <div className="text-sm text-slate-400">Source</div>
                                    <a href={detailsTemplate.video_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 break-all">
                                        {detailsTemplate.video_url}
                                    </a>
                                    <div className="text-sm text-slate-400 mt-3">Analysis</div>
                                    <div className="max-h-64 overflow-auto rounded-md border border-slate-800 p-3 bg-slate-900/30 text-xs text-slate-300 space-y-1">
                                        {Object.entries(detailsTemplate.style_characteristics || {}).map(([k, v]) => (
                                            <div key={k}>
                                                <span className="font-semibold text-slate-200 mr-1">{k}:</span>
                                                <span>{typeof v === 'string' ? v : JSON.stringify(v)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedStyleTemplateId(detailsTemplate.id);
                                                setDetailsTemplate(null);
                                            }}
                                        >
                                            Select
                                        </Button>
                                        <Button
                                            variant="default"
                                            size="sm"
                                            disabled={analyzingVideo}
                                            onClick={() => reanalyzeStyleTemplate(detailsTemplate)}
                                        >
                                            {analyzingVideo ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                            Re-Analyze
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDetailsTemplate(null)}
                                        >
                                            Close
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
