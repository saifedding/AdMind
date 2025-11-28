'use client';

import React, { useState } from 'react';
import { useVeoGenerator } from './hooks/useVeoGenerator';
import { DashboardLayout } from '@/components/dashboard';
import { VeoFeed } from './components/VeoFeed';
import { VeoScriptInput } from './components/VeoScriptInput';
import { VeoStyleSelector } from './components/VeoStyleSelector';
import { VeoStyleAnalyzer } from './components/VeoStyleAnalyzer';
import { VeoSettingsPanel } from './components/VeoSettingsPanel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { VeoHistory } from './components/VeoHistory';

export default function VeoPage() {
  const veo = useVeoGenerator();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
        <ScrollArea className="flex-1">
          <div className="p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-8">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  VEO Studio
                </h1>
                <p className="text-sm text-slate-400 mt-1">AI Video Generation Suite</p>
              </div>
              <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800">
                    <History className="w-4 h-4 mr-2" />
                    History
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[400px] bg-slate-950 border-r border-slate-800 p-0">
                  <SheetHeader className="p-6 border-b border-slate-800">
                    <SheetTitle className="text-slate-200">Session History</SheetTitle>
                  </SheetHeader>
                  <div className="h-[calc(100vh-80px)]">
                    <VeoHistory
                      onSelectSession={(session) => {
                        veo.loadSession(session);
                        setIsHistoryOpen(false);
                      }}
                      currentSessionId={veo.currentSession?.id}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
              {/* Left Column: Inputs */}
              <div className="space-y-6 min-w-0">
                <VeoScriptInput
                  script={veo.script}
                  setScript={veo.setScript}
                  useCustomInstruction={veo.useCustomInstruction}
                  setUseCustomInstruction={veo.setUseCustomInstruction}
                  customInstruction={veo.customInstruction}
                  setCustomInstruction={veo.setCustomInstruction}
                />

                <VeoStyleSelector
                  availableStyles={veo.availableStyles}
                  selectedStyles={veo.selectedStyles}
                  handleStyleToggle={veo.handleStyleToggle}
                  characterPresets={veo.characterPresets}
                  selectedCharacter={veo.selectedCharacter}
                  setSelectedCharacter={veo.setSelectedCharacter}
                />

                <VeoStyleAnalyzer
                  videoStyleUrl={veo.videoStyleUrl}
                  setVideoStyleUrl={veo.setVideoStyleUrl}
                  videoStyleName={veo.videoStyleName}
                  setVideoStyleName={veo.setVideoStyleName}
                  analyzingVideo={veo.analyzingVideo}
                  handleAnalyzeVideo={veo.handleAnalyzeVideo}
                  reanalyzeStyleTemplate={veo.reanalyzeStyleTemplate}
                  styleLibrary={veo.styleLibrary}
                  selectedStyleTemplateId={veo.selectedStyleTemplateId}
                  setSelectedStyleTemplateId={veo.setSelectedStyleTemplateId}
                  handleDeleteStyleTemplate={veo.handleDeleteStyleTemplate}
                  showStyleLibrary={veo.showStyleLibrary}
                  setShowStyleLibrary={veo.setShowStyleLibrary}
                />
              </div>

              {/* Right Column: Settings */}
              <div className="xl:sticky xl:top-0">
                <VeoSettingsPanel
                  geminiModel={veo.geminiModel}
                  setGeminiModel={veo.setGeminiModel}
                  aspectRatio={veo.aspectRatio}
                  setAspectRatio={veo.setAspectRatio}

                  veoModels={veo.veoModels}
                  veoModelsLoading={veo.veoModelsLoading}
                  selectedModel={veo.selectedModel}
                  setSelectedModel={veo.setSelectedModel}
                  isGenerating={veo.isGenerating}
                  handleGenerateBriefs={veo.handleGenerateBriefs}
                  script={veo.script}
                  hasSelectedStyle={veo.selectedStyles.length > 0 || !!veo.selectedStyleTemplateId}
                />
              </div>
            </div>

            {/* Feed / Gallery Section - Full Width */}
            <div className="pt-4">
              <VeoFeed
                generatedVariations={veo.generatedVariations}
                veoGeneratingKeys={veo.veoGeneratingKeys}
                veoVideoByPromptKey={veo.veoVideoByPromptKey}
                veoErrorByPromptKey={veo.veoErrorByPromptKey}
                generationTimeRemaining={veo.generationTimeRemaining}
                generationStartTime={veo.generationStartTime}
                actualGenerationTime={veo.actualGenerationTime}
                generateVideoForPrompt={veo.generateVideoForPrompt}
                handleCopy={veo.handleCopy}
                copiedKey={veo.copiedKey}
                selectedClipsForMerge={veo.selectedClipsForMerge}
                toggleClipSelection={veo.toggleClipSelection}
                handleMergeClips={veo.handleMergeClips}
                mergingStyles={veo.mergingStyles}
                mergedVideoByStyle={veo.mergedVideoByStyle}
                mergeErrorByStyle={veo.mergeErrorByStyle}
                aspectRatio={veo.aspectRatio}

                saveEditedPrompt={veo.saveEditedPrompt}
              />
            </div>

          </div>
        </ScrollArea>
      </div>
    </DashboardLayout>
  );
}
