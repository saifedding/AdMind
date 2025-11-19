'use client';

import { Player } from '@remotion/player';
import { useCallback, useState } from 'react';
import { AbsoluteFill, Sequence, Video, useCurrentFrame, useVideoConfig } from 'remotion';

type VideoClip = {
  id: string;
  url: string;
  prompt: string;
  startTime: number;
  endTime: number;
  duration: number;
};

type RemotionEditorProps = {
  clips: VideoClip[];
  onExport: (clips: VideoClip[]) => void;
};

// Remotion Composition Component
const VideoComposition: React.FC<{ clips: VideoClip[] }> = ({ clips }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  let currentTimeInSeconds = frame / fps;
  let accumulatedTime = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {clips.map((clip, index) => {
        const clipDuration = clip.endTime - clip.startTime;
        const clipDurationInFrames = Math.floor(clipDuration * fps);
        const startFrame = Math.floor(accumulatedTime * fps);
        
        accumulatedTime += clipDuration;

        return (
          <Sequence
            key={clip.id}
            from={startFrame}
            durationInFrames={clipDurationInFrames}
          >
            <Video
              src={clip.url}
              startFrom={Math.floor(clip.startTime * fps)}
              endAt={Math.floor(clip.endTime * fps)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export function RemotionEditor({ clips, onExport }: RemotionEditorProps) {
  const [selectedClipIndex, setSelectedClipIndex] = useState<number | null>(null);
  const [localClips, setLocalClips] = useState(clips);

  // Calculate total duration
  const totalDuration = localClips.reduce(
    (sum, clip) => sum + (clip.endTime - clip.startTime),
    0
  );
  const fps = 30;
  const durationInFrames = Math.floor(totalDuration * fps);

  const updateClip = (index: number, updates: Partial<VideoClip>) => {
    setLocalClips(prev => 
      prev.map((clip, i) => (i === index ? { ...clip, ...updates } : clip))
    );
  };

  const removeClip = (index: number) => {
    setLocalClips(prev => prev.filter((_, i) => i !== index));
  };

  const moveClip = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === localClips.length - 1)
    ) {
      return;
    }

    setLocalClips(prev => {
      const newClips = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newClips[index], newClips[targetIndex]] = [newClips[targetIndex], newClips[index]];
      return newClips;
    });
  };

  const handleExport = () => {
    onExport(localClips);
  };

  return (
    <div className="space-y-4">
      {/* Video Player */}
      <div className="bg-black rounded-lg overflow-hidden border border-neutral-700">
        <Player
          component={VideoComposition}
          inputProps={{ clips: localClips }}
          durationInFrames={durationInFrames}
          fps={fps}
          compositionWidth={1920}
          compositionHeight={1080}
          style={{
            width: '100%',
            aspectRatio: '16/9',
          }}
          controls
          loop
        />
      </div>

      {/* Timeline Info */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Timeline</h3>
          <div className="text-xs text-neutral-400">
            Total Duration: {totalDuration.toFixed(2)}s ({localClips.length} clips)
          </div>
        </div>

        {/* Clips List */}
        <div className="space-y-2">
          {localClips.map((clip, index) => (
            <div
              key={clip.id}
              className={`border rounded-lg p-3 transition-colors ${
                selectedClipIndex === index
                  ? 'border-photon-500 bg-photon-500/10'
                  : 'border-neutral-700 bg-neutral-800/50'
              }`}
              onClick={() => setSelectedClipIndex(index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{clip.prompt}</div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {clip.startTime.toFixed(1)}s → {clip.endTime.toFixed(1)}s
                    <span className="mx-2">•</span>
                    Duration: {(clip.endTime - clip.startTime).toFixed(1)}s
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveClip(index, 'up');
                    }}
                    disabled={index === 0}
                    className="p-1 hover:bg-neutral-700 rounded disabled:opacity-30"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveClip(index, 'down');
                    }}
                    disabled={index === localClips.length - 1}
                    className="p-1 hover:bg-neutral-700 rounded disabled:opacity-30"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeClip(index);
                    }}
                    className="p-1 hover:bg-red-500/20 text-red-400 rounded"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Trim Controls */}
              {selectedClipIndex === index && (
                <div className="mt-3 pt-3 border-t border-neutral-700 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-500 block mb-1">Start Time (s)</label>
                    <input
                      type="number"
                      min={0}
                      max={clip.duration}
                      step={0.1}
                      value={clip.startTime}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value < clip.endTime) {
                          updateClip(index, { startTime: value });
                        }
                      }}
                      className="w-full px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 block mb-1">End Time (s)</label>
                    <input
                      type="number"
                      min={0}
                      max={clip.duration}
                      step={0.1}
                      value={clip.endTime}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value > clip.startTime) {
                          updateClip(index, { endTime: value });
                        }
                      }}
                      className="w-full px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={localClips.length < 2}
        className="w-full py-3 bg-gradient-to-r from-photon-500 to-photon-600 hover:from-photon-600 hover:to-photon-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium"
      >
        Export & Merge {localClips.length} Clips
      </button>
    </div>
  );
}
