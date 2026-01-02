'use client';

import { useState } from 'react';
import { AppLayout, PageType } from '@/components/layout';
import { VideoReplicator } from '@/components/VideoReplicator';
import { ScriptToVideo } from '@/components/ScriptToVideo';
import { SettingsPage } from '@/components/pages';

export default function Home() {
  const [aspectRatio, setAspectRatio] = useState('VIDEO_ASPECT_RATIO_PORTRAIT');

  const renderPage = (currentPage: PageType) => {
    switch (currentPage) {
      case 'video-replicator':
        return (
          <div className="p-6 max-w-5xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white">Video Replicator</h1>
              <p className="text-sm text-slate-400 mt-1">
                Analyze videos and generate VEO prompts for exact recreation
              </p>
            </div>
            <VideoReplicator aspectRatio={aspectRatio} />
          </div>
        );
      
      case 'script-to-video':
        return (
          <div className="p-6 max-w-5xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white">Script to Video</h1>
              <p className="text-sm text-slate-400 mt-1">
                Generate creative video concepts from your script
              </p>
            </div>
            <ScriptToVideo aspectRatio={aspectRatio} />
          </div>
        );
      
      case 'settings':
        return (
          <SettingsPage
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      {(currentPage) => renderPage(currentPage)}
    </AppLayout>
  );
}
