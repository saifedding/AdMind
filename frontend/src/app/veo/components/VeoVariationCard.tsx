import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Video, Loader2, Plus, Film, Edit2, X } from 'lucide-react';
import { CreativeBriefVariation, VeoVideoData } from '../hooks/useVeoGenerator';
import { VeoVideoPlayer } from './VeoVideoPlayer';

interface VeoVariationCardProps {
    variation: CreativeBriefVariation;
    index: number;
    veoGeneratingKeys: Set<string>;
    veoVideoByPromptKey: Record<string, VeoVideoData[]>;
    veoErrorByPromptKey: Record<string, string | null>;
    generationTimeRemaining: Record<string, number>;
    generationStartTime: Record<string, number>;
    actualGenerationTime: Record<string, number>;
    openVeoModal: (text: string, key: string) => void;
    handleCopy: (key: string, text: string) => void;
    copiedKey: string | null;
    selectedClipsForMerge: Record<string, string[]>;
    toggleClipSelection: (style: string, url: string) => void;
    handleMergeClips: (style: string) => void;
    mergingStyles: Set<string>;
    mergedVideoByStyle: Record<string, string>;
    mergeErrorByStyle: Record<string, string | null>;
    aspectRatio: string;
}

// Helper component for individual segments
function VeoVariationSegment({
    segment,
    segIdx,
    styleId,
    veoGeneratingKeys,
    veoVideoByPromptKey,
    veoErrorByPromptKey,
    generationTimeRemaining,
    actualGenerationTime,
    openVeoModal,
    handleCopy,
    copiedKey,
    selectedClips,
    toggleClipSelection,
    aspectRatio
}: {
    segment: string;
    segIdx: number;
    styleId: string;
    veoGeneratingKeys: Set<string>;
    veoVideoByPromptKey: Record<string, VeoVideoData[]>;
    veoErrorByPromptKey: Record<string, string | null>;
    generationTimeRemaining: Record<string, number>;
    actualGenerationTime: Record<string, number>;
    openVeoModal: (text: string, key: string) => void;
    handleCopy: (key: string, text: string) => void;
    copiedKey: string | null;
    selectedClips: string[];
    toggleClipSelection: (style: string, url: string) => void;
    aspectRatio: string;
}) {
    const [text, setText] = React.useState(segment);
    const [isEditing, setIsEditing] = React.useState(false);

    const promptKey = `${styleId}:prompt:${segIdx + 1}`;
    const videoDataList = veoVideoByPromptKey[promptKey] || [];
    const [versionIndex, setVersionIndex] = React.useState(0);

    // Auto-switch to latest video when new one is added
    React.useEffect(() => {
        if (videoDataList.length > 0) {
            setVersionIndex(videoDataList.length - 1);
        }
    }, [videoDataList.length]);

    const currentVideoData = videoDataList[versionIndex];
    const currentVideoUrl = currentVideoData?.url;
    const currentVideoPrompt = currentVideoData?.prompt;

    // Display prompt for the current video version if not editing, otherwise show draft text
    const displayedText = (videoDataList.length > 0 && !isEditing && currentVideoPrompt) ? currentVideoPrompt : text;
    const isGenerating = veoGeneratingKeys.has(promptKey);
    const error = veoErrorByPromptKey[promptKey];
    const remaining = generationTimeRemaining[promptKey];
    const isSelected = selectedClips.includes(currentVideoUrl || '');

    // Calculate dimensions
    let widthPx = 320;
    let heightPx = 180;
    let aspectRatioClass = "aspect-video";

    if (aspectRatio === 'VIDEO_ASPECT_RATIO_PORTRAIT') {
        widthPx = 180;
        heightPx = 320;
        aspectRatioClass = "aspect-[9/16]";
    } else if (aspectRatio === 'VIDEO_ASPECT_RATIO_SQUARE') {
        widthPx = 240;
        heightPx = 240;
        aspectRatioClass = "aspect-square";
    }

    const handleSave = () => {
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setText(segment);
        setIsEditing(false);
    };

    return (
        <div className="p-4 hover:bg-slate-800/20 transition-colors group">
            <div className="flex gap-6 items-start">
                {/* Left: Prompt Text */}
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-mono text-slate-500 shrink-0 mt-0.5">
                            {String(segIdx + 1).padStart(2, '0')}
                        </span>

                        <div
                            className={`flex-1 bg-slate-950/50 border border-slate-800 p-4 rounded-lg overflow-hidden transition-all ${isEditing ? 'ring-1 ring-purple-500/50 border-purple-500/30' : ''}`}
                            style={{ height: `${heightPx}px` }}
                        >
                            {isEditing ? (
                                <textarea
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    className="w-full h-full bg-transparent border-none resize-none focus:outline-none text-sm text-slate-300 leading-relaxed font-light custom-scrollbar"
                                    autoFocus
                                />
                            ) : (
                                <div className="h-full overflow-y-auto custom-scrollbar pr-2">
                                    <p className="text-sm text-slate-300 leading-relaxed font-light whitespace-pre-wrap">
                                        {displayedText}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-600 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleCopy(promptKey, displayedText)}
                            >
                                {copiedKey === promptKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </Button>
                            {!isGenerating && (
                                <>
                                    {isEditing ? (
                                        <>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-green-400 opacity-100"
                                                onClick={handleSave}
                                            >
                                                <Check className="w-3 h-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-red-400 opacity-100"
                                                onClick={handleCancelEdit}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-slate-600 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => {
                                                setText(displayedText);
                                                setIsEditing(true);
                                            }}
                                        >
                                            <Edit2 className="w-3 h-3" />
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Action Area */}
                    <div className="pl-6">
                        {!isGenerating && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs border-slate-700 bg-slate-900/50 hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/50 transition-all"
                                onClick={() => openVeoModal(displayedText, promptKey)}
                                disabled={isEditing}
                            >
                                <Video className="w-3 h-3 mr-2" />
                                {videoDataList.length > 0 ? 'Generate New Version' : 'Generate Video'}
                            </Button>
                        )}

                        {isGenerating && (
                            <div className="flex items-center gap-3 text-xs text-purple-400 bg-purple-500/5 p-2 rounded border border-purple-500/20 w-fit">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Generating... {remaining > 0 ? `~${remaining}s` : ''}</span>
                            </div>
                        )}

                        {error && (
                            <div className="text-xs text-red-400 bg-red-950/20 p-2 rounded border border-red-500/20">
                                Error: {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Video Preview or Placeholder */}
                <div className="shrink-0 flex flex-col gap-2" style={{ width: `${widthPx}px` }}>
                    {isGenerating ? (
                        <div className={`${aspectRatioClass} bg-slate-900 border border-slate-800 rounded-lg flex flex-col items-center justify-center relative overflow-hidden`}>
                            <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 via-transparent to-transparent animate-pulse" />
                            <div className="z-10 flex flex-col items-center gap-3 w-full px-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full" />
                                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin relative z-10" />
                                </div>
                                <div className="text-center space-y-1">
                                    <span className="text-xs font-medium text-slate-300">Creating Video...</span>
                                    <p className="text-[10px] text-slate-500">Estimated time: {remaining}s</p>
                                </div>
                                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-1000 ease-linear"
                                        style={{ width: `${Math.max(5, Math.min(100, 100 - ((remaining || 20) / 20) * 100))}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : currentVideoUrl ? (
                        <>
                            <VeoVideoPlayer src={currentVideoUrl} className={`${aspectRatioClass} bg-black/40 shadow-lg rounded-lg overflow-hidden`} />

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {videoDataList.length > 1 && (
                                        <div className="flex items-center bg-slate-900/50 rounded-md border border-slate-800/50">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-slate-400 hover:text-white"
                                                disabled={versionIndex === 0}
                                                onClick={() => setVersionIndex(prev => Math.max(0, prev - 1))}
                                            >
                                                <span className="text-xs">←</span>
                                            </Button>
                                            <span className="text-[10px] text-slate-500 px-1 font-mono">
                                                {versionIndex + 1}/{videoDataList.length}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-slate-400 hover:text-white"
                                                disabled={versionIndex === videoDataList.length - 1}
                                                onClick={() => setVersionIndex(prev => Math.min(videoDataList.length - 1, prev + 1))}
                                            >
                                                <span className="text-xs">→</span>
                                            </Button>
                                        </div>
                                    )}
                                    <span className="text-[10px] text-slate-500">
                                        {actualGenerationTime[promptKey] ? `${actualGenerationTime[promptKey]}s` : ''}
                                    </span>
                                </div>

                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className={`h-6 text-[10px] px-2 ${isSelected ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-indigo-300'}`}
                                    onClick={() => toggleClipSelection(styleId, currentVideoUrl)}
                                >
                                    {isSelected ? <Check className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                                    {isSelected ? 'Selected' : 'Merge'}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className={`${aspectRatioClass} bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-lg flex flex-col items-center justify-center text-slate-700 gap-3 p-4 text-center relative overflow-hidden group-hover:border-slate-700 transition-colors`}>
                            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>
                            <Film className="w-8 h-8 opacity-20 mb-2" />
                            <div className="z-10 max-w-full px-2">
                                <p className="text-[10px] text-slate-500 line-clamp-4 font-medium italic leading-relaxed">
                                    "{text}"
                                </p>
                            </div>
                            <div className="absolute bottom-2 right-2">
                                <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-slate-800 text-slate-500">
                                    {aspectRatio === 'VIDEO_ASPECT_RATIO_PORTRAIT' ? '9:16' :
                                        aspectRatio === 'VIDEO_ASPECT_RATIO_SQUARE' ? '1:1' : '16:9'}
                                </Badge>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function VeoVariationCard({
    variation,
    index,
    veoGeneratingKeys,
    veoVideoByPromptKey,
    veoErrorByPromptKey,
    generationTimeRemaining,
    generationStartTime,
    actualGenerationTime,
    openVeoModal,
    handleCopy,
    copiedKey,
    selectedClipsForMerge,
    toggleClipSelection,
    handleMergeClips,
    mergingStyles,
    mergedVideoByStyle,
    mergeErrorByStyle,
    aspectRatio
}: VeoVariationCardProps) {

    const styleId = variation.style;
    const selectedClips = selectedClipsForMerge[styleId] || [];
    const isMerging = mergingStyles.has(styleId);
    const mergedVideo = mergedVideoByStyle[styleId];
    const mergeError = mergeErrorByStyle[styleId];

    return (
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-slate-800/50 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 capitalize">
                            {variation.style.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-slate-500">{variation.segments.length} segments</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedClips.length >= 2 && (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleMergeClips(styleId)}
                                disabled={isMerging}
                                className="h-7 text-xs bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30"
                            >
                                {isMerging ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Film className="w-3 h-3 mr-1" />}
                                Merge {selectedClips.length} Clips
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-slate-400 hover:text-white"
                            onClick={() => handleCopy(`${styleId}:all`, variation.segments.join('\n\n---\n\n'))}
                        >
                            {copiedKey === `${styleId}:all` ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                            Copy All
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {mergedVideo && (
                    <div className="p-4 bg-indigo-950/20 border-b border-indigo-500/20">
                        <h4 className="text-sm font-medium text-indigo-300 mb-2 flex items-center gap-2">
                            <Film className="w-4 h-4" /> Merged Video Sequence
                        </h4>
                        <VeoVideoPlayer src={mergedVideo} className="aspect-video bg-black/50" />
                    </div>
                )}

                {mergeError && (
                    <div className="p-3 bg-red-950/20 border-b border-red-500/20 text-xs text-red-400">
                        Merge Error: {mergeError}
                    </div>
                )}

                <div className="divide-y divide-slate-800/50">
                    {variation.segments.map((segment, segIdx) => (
                        <VeoVariationSegment
                            key={segIdx}
                            segment={segment}
                            segIdx={segIdx}
                            styleId={styleId}
                            veoGeneratingKeys={veoGeneratingKeys}
                            veoVideoByPromptKey={veoVideoByPromptKey}
                            veoErrorByPromptKey={veoErrorByPromptKey}
                            generationTimeRemaining={generationTimeRemaining}
                            actualGenerationTime={actualGenerationTime}
                            openVeoModal={openVeoModal}
                            handleCopy={handleCopy}
                            copiedKey={copiedKey}
                            selectedClips={selectedClips}
                            toggleClipSelection={toggleClipSelection}
                            aspectRatio={aspectRatio}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
