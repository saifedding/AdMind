'use client';

import { useVeoGenerator } from './hooks/useVeoGenerator';
import { DashboardLayout } from '@/components/dashboard';
import { VeoSidebar } from './components/VeoSidebar';
import { VeoFeed } from './components/VeoFeed';
import { VeoGenerationModal } from './components/VeoGenerationModal';

export default function VeoPage() {
  const veo = useVeoGenerator();

  return (
    <DashboardLayout>
      <div className="flex h-full overflow-hidden">
        <VeoSidebar
          script={veo.script}
          setScript={veo.setScript}
          availableStyles={veo.availableStyles}
          selectedStyles={veo.selectedStyles}
          handleStyleToggle={veo.handleStyleToggle}
          characterPresets={veo.characterPresets}
          selectedCharacter={veo.selectedCharacter}
          setSelectedCharacter={veo.setSelectedCharacter}
          geminiModel={veo.geminiModel}
          setGeminiModel={veo.setGeminiModel}
          isGenerating={veo.isGenerating}
          handleGenerateBriefs={veo.handleGenerateBriefs}
          videoStyleUrl={veo.videoStyleUrl}
          setVideoStyleUrl={veo.setVideoStyleUrl}
          videoStyleName={veo.videoStyleName}
          setVideoStyleName={veo.setVideoStyleName}
          videoStyleDescription={veo.videoStyleDescription}
          setVideoStyleDescription={veo.setVideoStyleDescription}
          analyzingVideo={veo.analyzingVideo}
          handleAnalyzeVideo={veo.handleAnalyzeVideo}
          styleLibrary={veo.styleLibrary}
          selectedStyleTemplateId={veo.selectedStyleTemplateId}
          setSelectedStyleTemplateId={veo.setSelectedStyleTemplateId}
          handleDeleteStyleTemplate={veo.handleDeleteStyleTemplate}
          showStyleLibrary={veo.showStyleLibrary}
          setShowStyleLibrary={veo.setShowStyleLibrary}
          veoModels={veo.veoModels}
          veoModelsLoading={veo.veoModelsLoading}
          selectedModel={veo.selectedModel}
          setSelectedModel={veo.setSelectedModel}
          aspectRatio={veo.aspectRatio}
          setAspectRatio={veo.setAspectRatio}
          loadSession={veo.loadSession}
          currentSessionId={veo.currentSession?.id}
        />

        <VeoFeed
          generatedVariations={veo.generatedVariations}
          veoGeneratingKeys={veo.veoGeneratingKeys}
          veoVideoByPromptKey={veo.veoVideoByPromptKey}
          veoErrorByPromptKey={veo.veoErrorByPromptKey}
          generationTimeRemaining={veo.generationTimeRemaining}
          generationStartTime={veo.generationStartTime}
          actualGenerationTime={veo.actualGenerationTime}
          openVeoModal={veo.openVeoModal}
          handleCopy={veo.handleCopy}
          copiedKey={veo.copiedKey}
          selectedClipsForMerge={veo.selectedClipsForMerge}
          toggleClipSelection={veo.toggleClipSelection}
          handleMergeClips={veo.handleMergeClips}
          mergingStyles={veo.mergingStyles}
          mergedVideoByStyle={veo.mergedVideoByStyle}
          mergeErrorByStyle={veo.mergeErrorByStyle}
          aspectRatio={veo.aspectRatio}
        />
      </div>

      <VeoGenerationModal
        open={veo.showVeoModal}
        onOpenChange={veo.setShowVeoModal}
        prompt={veo.currentPromptForModal}
        handleGenerateVideo={veo.handleGenerateVideo}
      />
    </DashboardLayout>
  );
}
