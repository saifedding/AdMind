import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Video } from 'lucide-react';
import { CreativeBriefVariation, VeoVideoData } from '../hooks/useVeoGenerator';
import { VeoVariationCard } from './VeoVariationCard';

interface VeoFeedProps {
    generatedVariations: CreativeBriefVariation[];
    // Props passed down to Card
    veoGeneratingKeys: Set<string>;
    veoVideoByPromptKey: Record<string, VeoVideoData[]>;
    veoErrorByPromptKey: Record<string, string | null>;
    generationTimeRemaining: Record<string, number>;
    generationStartTime: Record<string, number>;
    actualGenerationTime: Record<string, number>;
    generateVideoForPrompt: (text: string, key: string) => void;
    handleCopy: (key: string, text: string) => void;
    copiedKey: string | null;
    selectedClipsForMerge: Record<string, string[]>;
    toggleClipSelection: (style: string, url: string) => void;
    handleMergeClips: (style: string) => void;
    mergingStyles: Set<string>;
    mergedVideoByStyle: Record<string, string>;
    mergeErrorByStyle: Record<string, string | null>;
    aspectRatio: string;

    saveEditedPrompt: (promptKey: string, newText: string) => Promise<boolean> | boolean;
}

export function VeoFeed({
    generatedVariations,
    veoGeneratingKeys,
    veoVideoByPromptKey,
    veoErrorByPromptKey,
    generationTimeRemaining,
    generationStartTime,
    actualGenerationTime,
    generateVideoForPrompt,
    handleCopy,
    copiedKey,
    selectedClipsForMerge,
    toggleClipSelection,
    handleMergeClips,
    mergingStyles,
    mergedVideoByStyle,
    mergeErrorByStyle,
    aspectRatio,

    saveEditedPrompt,
}: VeoFeedProps) {
    return (
        <div className="w-full space-y-8">
            {generatedVariations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <div className="w-20 h-20 rounded-full bg-slate-900/50 flex items-center justify-center mb-6 border border-slate-800">
                        <Video className="w-10 h-10 opacity-50" />
                    </div>
                    <h3 className="text-xl font-medium text-slate-300 mb-2">Ready to Create</h3>
                    <p className="max-w-md text-center text-sm">
                        Enter your script and select styles above to generate AI-powered creative briefs and videos.
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-slate-200">Generated Variations</h2>
                        <span className="text-sm text-slate-500">{generatedVariations.length} styles created</span>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                        {generatedVariations.map((variation, idx) => (
                            <VeoVariationCard
                                key={idx}
                                variation={variation}
                                index={idx}
                                veoGeneratingKeys={veoGeneratingKeys}
                                veoVideoByPromptKey={veoVideoByPromptKey}
                                veoErrorByPromptKey={veoErrorByPromptKey}
                                generationTimeRemaining={generationTimeRemaining}
                                generationStartTime={generationStartTime}
                                actualGenerationTime={actualGenerationTime}
                                generateVideoForPrompt={generateVideoForPrompt}
                                handleCopy={handleCopy}
                                copiedKey={copiedKey}
                                selectedClipsForMerge={selectedClipsForMerge}
                                toggleClipSelection={toggleClipSelection}
                                handleMergeClips={handleMergeClips}
                                mergingStyles={mergingStyles}
                                mergedVideoByStyle={mergedVideoByStyle}
                                mergeErrorByStyle={mergeErrorByStyle}
                                aspectRatio={aspectRatio}

                                saveEditedPrompt={saveEditedPrompt}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
