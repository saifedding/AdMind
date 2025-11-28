import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Video, Loader2, Wand2, Trash2 } from 'lucide-react';
import { VideoStyleTemplate, API_BASE_URL } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface VeoStyleAnalyzerProps {
    videoStyleUrl: string;
    setVideoStyleUrl: (s: string) => void;
    videoStyleName: string;
    setVideoStyleName: (s: string) => void;
    analyzingVideo: boolean;
    handleAnalyzeVideo: () => void;
    reanalyzeStyleTemplate: (t: VideoStyleTemplate) => void;
    styleLibrary: VideoStyleTemplate[];
    selectedStyleTemplateId: number | null;
    setSelectedStyleTemplateId: (id: number | null) => void;
    handleDeleteStyleTemplate: (id: number) => void;
    showStyleLibrary: boolean;
    setShowStyleLibrary: (show: boolean) => void;
}

export function VeoStyleAnalyzer({
    videoStyleUrl,
    setVideoStyleUrl,
    videoStyleName,
    setVideoStyleName,
    analyzingVideo,
    handleAnalyzeVideo,
    reanalyzeStyleTemplate,
    styleLibrary,
    selectedStyleTemplateId,
    setSelectedStyleTemplateId,
    handleDeleteStyleTemplate,
    showStyleLibrary,
    setShowStyleLibrary
}: VeoStyleAnalyzerProps) {
    const [detailsTemplate, setDetailsTemplate] = React.useState<VideoStyleTemplate | null>(null);

    const getThumbnailUrl = (url?: string) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return `${API_BASE_URL}${url}`;
    };

    return (
        <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/50 backdrop-blur-sm">
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
                <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {styleLibrary.map((template) => (
                        <div
                            key={template.id}
                            onClick={() => setSelectedStyleTemplateId(selectedStyleTemplateId === template.id ? null : template.id)}
                            className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center gap-3 justify-between transition-all ${selectedStyleTemplateId === template.id
                                ? 'bg-purple-900/20 border-purple-500/50 text-purple-200'
                                : 'bg-slate-950/30 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900/50'
                                }`}
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center">
                                    {template.thumbnail_url ? (
                                        <img src={getThumbnailUrl(template.thumbnail_url)} alt={`Style thumbnail for ${template.name}`} className="w-full h-full object-cover" />
                                    ) : (
                                        <Video className="w-5 h-5 text-slate-500" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-medium text-slate-200 truncate">{template.name}</div>
                                    {template.description && (
                                        <div className="text-[10px] text-slate-500 truncate">{template.description}</div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-slate-400 hover:text-white text-[10px]"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDetailsTemplate(template);
                                    }}
                                >
                                    Details
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-slate-600 hover:text-red-400"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteStyleTemplate(template.id);
                                    }}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="space-y-3 p-3 rounded-lg bg-slate-950/30 border border-slate-800/50">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                    <div className="w-full">
                        <Input
                            placeholder="Video URL to analyze..."
                            value={videoStyleUrl}
                            onChange={(e) => setVideoStyleUrl(e.target.value)}
                            className="h-9 text-xs bg-slate-950 border-slate-800 focus:border-blue-500/50"
                        />
                    </div>
                    <div className="w-full">
                        <Input
                            placeholder="Style Name"
                            value={videoStyleName}
                            onChange={(e) => setVideoStyleName(e.target.value)}
                            className="h-9 text-xs bg-slate-950 border-slate-800 focus:border-blue-500/50"
                        />
                    </div>
                    <div className="w-full md:w-auto">
                        <Button
                            size="sm"
                            variant="secondary"
                            className="w-full h-9 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                            onClick={handleAnalyzeVideo}
                            disabled={analyzingVideo}
                        >
                            {analyzingVideo ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Wand2 className="w-3 h-3 mr-2" />}
                            Analyze Style
                        </Button>
                    </div>
                </div>
            </div>

            <Dialog open={!!detailsTemplate} onOpenChange={(o) => !o && setDetailsTemplate(null)}>
                <DialogContent className="sm:max-w-2xl bg-slate-950 border-slate-800">
                    {detailsTemplate && (
                        <div className="space-y-4">
                            <DialogHeader>
                                <DialogTitle className="text-slate-200">{detailsTemplate.name}</DialogTitle>
                                {detailsTemplate.description && (
                                    <DialogDescription className="text-slate-400">{detailsTemplate.description}</DialogDescription>
                                )}
                            </DialogHeader>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1">
                                    <div className="w-full aspect-square rounded-md overflow-hidden bg-slate-900 border border-slate-800">
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
                                    <a href={detailsTemplate.video_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 break-all hover:underline">
                                        {detailsTemplate.video_url}
                                    </a>
                                    <div className="text-sm text-slate-400 mt-3">Analysis</div>
                                    <div className="max-h-64 overflow-auto rounded-md border border-slate-800 p-3 bg-slate-900/50 text-xs text-slate-300 space-y-1 custom-scrollbar">
                                        {Object.entries(detailsTemplate.style_characteristics || {}).map(([k, v]) => (
                                            <div key={k}>
                                                <span className="font-semibold text-slate-200 mr-1">{k}:</span>
                                                <span>{typeof v === 'string' ? v : JSON.stringify(v)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 mt-3 justify-end">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-200"
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
                                            className="bg-blue-600 hover:bg-blue-500"
                                            disabled={analyzingVideo}
                                            onClick={() => reanalyzeStyleTemplate(detailsTemplate)}
                                        >
                                            {analyzingVideo ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                            Re-Analyze
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-slate-400 hover:text-white"
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
