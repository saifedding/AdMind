import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Sparkles, Loader2 } from 'lucide-react';

interface VeoSettingsPanelProps {
    geminiModel: string;
    setGeminiModel: (m: string) => void;
    aspectRatio: string;
    setAspectRatio: (r: string) => void;
    veoModels: any[];
    veoModelsLoading: boolean;
    selectedModel: string;
    setSelectedModel: (m: string) => void;
    isGenerating: boolean;
    handleGenerateBriefs: () => void;
    script: string;
    hasSelectedStyle: boolean;
}

export function VeoSettingsPanel({
    geminiModel,
    setGeminiModel,
    aspectRatio,
    setAspectRatio,
    veoModels,
    veoModelsLoading,
    selectedModel,
    setSelectedModel,
    isGenerating,
    handleGenerateBriefs,
    script,
    hasSelectedStyle
}: VeoSettingsPanelProps) {
    return (
        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800/50 backdrop-blur-sm h-fit">
            <div className="flex items-center gap-2 mb-6 text-slate-200 font-medium">
                <Settings className="w-4 h-4 text-slate-400" />
                Settings
            </div>

            <div className="space-y-5">
                <div className="space-y-2">
                    <Label className="text-xs text-slate-400 font-medium">Brief Generation Model</Label>
                    <Select value={geminiModel} onValueChange={setGeminiModel}>
                        <SelectTrigger className="bg-slate-950/50 border-slate-800 text-slate-300 h-10">
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
                            {/* OpenRouter Models */}
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
                    <Label className="text-xs text-slate-400 font-medium">Aspect Ratio</Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                        <SelectTrigger className="bg-slate-950/50 border-slate-800 text-slate-300 h-10">
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



                <div className="space-y-2">
                    <Label className="text-xs text-slate-400 font-medium">Video Generation Model</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                        <SelectTrigger className="bg-slate-950/50 border-slate-800 text-slate-300 h-10">
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
                    <div className="text-[10px] text-slate-500 text-right">
                        Text to Video • 10 credits • Current
                    </div>
                </div>

                <Button
                    onClick={handleGenerateBriefs}
                    disabled={isGenerating || !script.trim() || !hasSelectedStyle}
                    className="w-full h-12 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-medium shadow-lg shadow-purple-900/20 transition-all duration-300"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-5 w-5" />
                            Generate Briefs
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
