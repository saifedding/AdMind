'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { adsApi } from '@/lib/api';

// Dynamically import Enhanced Remotion Editor to avoid SSR issues
const EnhancedRemotionEditor = dynamic(
  () => import('@/components/video-editor/EnhancedRemotionEditor').then(mod => ({ default: mod.EnhancedRemotionEditor })),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <div className="text-lg font-semibold">Loading Professional Video Editor...</div>
          <div className="text-sm text-neutral-400 mt-2">Preparing CapCut-style interface</div>
        </div>
      </div>
    )
  }
);

type VideoClip = {
  id: string;
  url: string;
  prompt: string;
  startTime: number;
  endTime: number;
  duration: number;
};

function VideoEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergedVideoUrl, setMergedVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRefs = useRef<Record<string, HTMLVideoElement>>({});
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Load clips from localStorage
    try {
      const storedClips = localStorage.getItem('videoEditorClips');
      console.log('Stored clips:', storedClips);
      
      if (storedClips) {
        const parsedClips = JSON.parse(storedClips);
        console.log('Parsed clips:', parsedClips);
        
        setClips(parsedClips.map((clip: any, idx: number) => ({
          id: `clip-${idx}`,
          url: clip.url,
          prompt: clip.prompt || `Clip ${idx + 1}`,
          startTime: 0,
          endTime: 0, // Will be set when video loads
          duration: 0, // Will be set when video loads
        })));
        
        // Clear localStorage after loading
        localStorage.removeItem('videoEditorClips');
      }
    } catch (err) {
      console.error('Failed to load clips:', err);
    }
  }, []);

  const handleVideoLoad = (clipId: string, video: HTMLVideoElement) => {
    const clip = clips.find(c => c.id === clipId);
    if (clip && video.duration) {
      setClips(prev => prev.map(c => 
        c.id === clipId 
          ? { ...c, duration: video.duration, endTime: video.duration }
          : c
      ));
    }
  };

  const updateClipTime = (clipId: string, field: 'startTime' | 'endTime', value: number) => {
    setClips(prev => prev.map(c => {
      if (c.id === clipId) {
        const newClip = { ...c, [field]: value };
        // Ensure startTime < endTime
        if (field === 'startTime' && value >= c.endTime) {
          newClip.endTime = Math.min(value + 1, c.duration);
        }
        if (field === 'endTime' && value <= c.startTime) {
          newClip.startTime = Math.max(value - 1, 0);
        }
        
        // Update preview video time if this is the selected clip
        if (clipId === selectedClipId && previewVideoRef.current) {
          if (field === 'startTime') {
            previewVideoRef.current.currentTime = value;
            setCurrentTime(value);
          }
        }
        
        return newClip;
      }
      return c;
    }));
  };
  
  const handlePlayPause = () => {
    if (!previewVideoRef.current || !selectedClipId) return;
    
    const video = previewVideoRef.current;
    const clip = clips.find(c => c.id === selectedClipId);
    if (!clip) return;
    
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      // If at end, restart from beginning
      if (video.currentTime >= clip.endTime) {
        video.currentTime = clip.startTime;
      }
      video.play();
      setIsPlaying(true);
    }
  };
  
  const handleTimeUpdate = () => {
    if (!previewVideoRef.current || !selectedClipId) return;
    
    const video = previewVideoRef.current;
    const clip = clips.find(c => c.id === selectedClipId);
    if (!clip) return;
    
    const time = video.currentTime;
    setCurrentTime(time);
    
    // Stop at end time
    if (time >= clip.endTime) {
      video.pause();
      setIsPlaying(false);
      video.currentTime = clip.endTime;
    }
  };
  
  const handleSeek = (time: number) => {
    if (!previewVideoRef.current) return;
    previewVideoRef.current.currentTime = time;
    setCurrentTime(time);
  };
  
  const selectClip = (clipId: string) => {
    setSelectedClipId(clipId);
    setIsPlaying(false);
    
    const clip = clips.find(c => c.id === clipId);
    if (clip && previewVideoRef.current) {
      previewVideoRef.current.currentTime = clip.startTime;
      setCurrentTime(clip.startTime);
    }
  };

  const moveClip = (clipId: string, direction: 'up' | 'down') => {
    const index = clips.findIndex(c => c.id === clipId);
    if (index === -1) return;
    
    const newClips = [...clips];
    if (direction === 'up' && index > 0) {
      [newClips[index], newClips[index - 1]] = [newClips[index - 1], newClips[index]];
    } else if (direction === 'down' && index < clips.length - 1) {
      [newClips[index], newClips[index + 1]] = [newClips[index + 1], newClips[index]];
    }
    setClips(newClips);
  };

  const removeClip = (clipId: string) => {
    setClips(prev => prev.filter(c => c.id !== clipId));
  };

  const handleMerge = async () => {
    if (clips.length === 0) return;
    
    setMerging(true);
    try {
      const videoUrls = clips.map(c => c.url);
      const trimTimes = clips.map(c => ({
        startTime: c.startTime,
        endTime: c.endTime
      }));
      
      const res = await adsApi.mergeVeoVideos({
        video_urls: videoUrls,
        trim_times: trimTimes,
      });
      
      if (res.success && res.public_url) {
        setMergedVideoUrl(res.public_url);
      }
    } catch (err: any) {
      console.error('Merge failed:', err);
      alert('Failed to merge videos: ' + (err?.message || 'Unknown error'));
    } finally {
      setMerging(false);
    }
  };

  const totalDuration = clips.reduce((sum, c) => sum + (c.endTime - c.startTime), 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Video Editor</h1>
            <p className="text-sm text-neutral-400 mt-1">
              Trim and arrange your clips, then merge into one video
            </p>
          </div>
          <button
            onClick={() => router.push('/download-ads')}
            className="px-4 py-2 border border-neutral-700 rounded-md hover:bg-neutral-800"
          >
            ← Back to Analysis
          </button>
        </div>

        {clips.length === 0 ? (
          <div className="border border-neutral-800 rounded-lg p-12 text-center">
            <p className="text-neutral-400">No clips loaded. Please go back and select clips to edit.</p>
          </div>
        ) : (
          <>
            {/* Enhanced Remotion Professional Editor */}
            <EnhancedRemotionEditor
              clips={clips}
              onExport={async (exportedClips: VideoClip[]) => {
                setClips(exportedClips);
                await handleMerge();
              }}
            />
            
            {/* Merged Video Result */}
            {mergedVideoUrl && (
              <div className="bg-neutral-900 border border-green-500/30 rounded-lg p-4 mt-6">
                <h3 className="text-lg font-semibold text-green-400 mb-3">✓ Video Merged Successfully!</h3>
                <video
                  src={mergedVideoUrl}
                  controls
                  className="w-full rounded-lg border border-neutral-700 bg-black"
                />
                <a
                  href={mergedVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 underline mt-2 inline-block"
                >
                  Open in new tab
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function VideoEditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Loading Video Editor...</div>
          <div className="text-sm text-neutral-400">Preparing your clips</div>
        </div>
      </div>
    }>
      <VideoEditorContent />
    </Suspense>
  );
}
