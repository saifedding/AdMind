'use client';

import { Player } from '@remotion/player';
import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { AbsoluteFill, Sequence, Video, useCurrentFrame, useVideoConfig } from 'remotion';

type VideoClip = {
  id: string;
  url: string;
  prompt: string;
  startTime: number;
  endTime: number;
  duration: number;
};

type EnhancedRemotionEditorProps = {
  clips: VideoClip[];
  onExport: (clips: VideoClip[]) => void;
};

// Remotion Composition Component
const VideoComposition: React.FC<{ clips: VideoClip[] }> = ({ clips }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  let accumulatedTime = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {clips.map((clip, index) => {
        const clipDuration = clip.endTime - clip.startTime;
        const clipDurationInFrames = Math.max(1, Math.floor(clipDuration * fps));
        const startFrame = Math.floor(accumulatedTime * fps);
        
        accumulatedTime += clipDuration;

        // Skip clips with invalid durations
        if (clipDurationInFrames <= 0 || !clip.url) {
          return null;
        }

        return (
          <Sequence
            key={`${clip.id}-${index}`}
            from={startFrame}
            durationInFrames={clipDurationInFrames}
          >
            <Video
              src={clip.url}
              startFrom={Math.floor(clip.startTime * fps)}
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

export function EnhancedRemotionEditor({ clips, onExport }: EnhancedRemotionEditorProps) {
  const [selectedClipIndex, setSelectedClipIndex] = useState<number | null>(null);
  const [localClips, setLocalClips] = useState(clips);
  const [activeTab, setActiveTab] = useState<'video' | 'audio' | 'text'>('video');
  const [cutMode, setCutMode] = useState(false);
  const [draggingHandle, setDraggingHandle] = useState<{ clipIndex: number; type: 'start' | 'end'; time: number } | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<any>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement>>({});
  const timelineRef = useRef<HTMLDivElement>(null);

  // Calculate total duration
  const totalDuration = localClips.reduce(
    (sum, clip) => sum + (clip.endTime - clip.startTime),
    0
  );
  const fps = 30;
  const durationInFrames = Math.max(1, Math.floor(totalDuration * fps)); // Ensure at least 1 frame
  
  // Check if all clips have loaded their durations
  const allClipsLoaded = localClips.length > 0 && localClips.every(clip => clip.duration > 0);
  
  // Debug logging
  useEffect(() => {
    console.log('Clips state:', localClips.map(c => ({
      id: c.id,
      duration: c.duration,
      startTime: c.startTime,
      endTime: c.endTime,
      url: c.url.substring(0, 50) + '...'
    })));
    console.log('All clips loaded:', allClipsLoaded);
    console.log('Total duration:', totalDuration, 'Duration in frames:', durationInFrames);
  }, [localClips, allClipsLoaded]);
  
  // Track playback position - DISABLED for now to prevent performance issues
  // TODO: Re-enable with better optimization later
  /*
  useEffect(() => {
    let animationFrameId: number;
    let lastUpdateTime = 0;
    const updateInterval = 200;
    
    const updatePlayhead = (timestamp: number) => {
      if (timestamp - lastUpdateTime >= updateInterval) {
        if (playerRef.current) {
          try {
            const frame = playerRef.current.getCurrentFrame();
            if (frame !== undefined && frame !== currentFrame) {
              setCurrentFrame(frame);
              setCurrentTime(frame / fps);
            }
          } catch (err) {
            // Player not ready yet
          }
        }
        lastUpdateTime = timestamp;
      }
      animationFrameId = requestAnimationFrame(updatePlayhead);
    };
    
    animationFrameId = requestAnimationFrame(updatePlayhead);
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [fps, currentFrame]);
  */

  const updateClip = (index: number, updates: Partial<VideoClip>) => {
    setLocalClips(prev => 
      prev.map((clip, i) => {
        if (i === index) {
          const updated = { ...clip, ...updates };
          // Ensure startTime < endTime
          if (updated.startTime >= updated.endTime) {
            updated.startTime = Math.max(0, updated.endTime - 0.5);
          }
          if (updated.endTime <= updated.startTime) {
            updated.endTime = Math.min(updated.duration, updated.startTime + 0.5);
          }
          return updated;
        }
        return clip;
      })
    );
  };
  
  // Load actual video durations
  const handleVideoLoad = (clipId: string, video: HTMLVideoElement) => {
    const clipIndex = localClips.findIndex(c => c.id === clipId);
    if (clipIndex !== -1 && video.duration && !isNaN(video.duration) && video.duration > 0) {
      const actualDuration = video.duration;
      console.log(`Loaded video ${clipId}: ${actualDuration.toFixed(2)}s`);
      
      // Only update if duration is not already set or is different
      const currentClip = localClips[clipIndex];
      if (currentClip.duration === 0 || Math.abs(currentClip.duration - actualDuration) > 0.1) {
        updateClip(clipIndex, {
          duration: actualDuration,
          endTime: actualDuration
        });
      }
    }
  };
  
  // Fallback: If videos don't load metadata after 5 seconds, use default duration
  useEffect(() => {
    const timeout = setTimeout(() => {
      const unloadedClips = localClips.filter(c => c.duration === 0);
      if (unloadedClips.length > 0) {
        console.warn(`${unloadedClips.length} videos failed to load metadata, using default 8s duration`);
        setLocalClips(prev => prev.map(clip => 
          clip.duration === 0 
            ? { ...clip, duration: 8, endTime: 8 }
            : clip
        ));
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [localClips]);

  const removeClip = (index: number) => {
    setLocalClips(prev => prev.filter((_, i) => i !== index));
    if (selectedClipIndex === index) {
      setSelectedClipIndex(null);
    }
  };

  const moveClip = (index: number, direction: 'left' | 'right') => {
    if (
      (direction === 'left' && index === 0) ||
      (direction === 'right' && index === localClips.length - 1)
    ) {
      return;
    }

    setLocalClips(prev => {
      const newClips = [...prev];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      [newClips[index], newClips[targetIndex]] = [newClips[targetIndex], newClips[index]];
      return newClips;
    });
  };

  const splitClip = (index: number, cutTime: number) => {
    const clip = localClips[index];
    if (!clip) return;

    // Calculate the actual cut time within the clip
    const clipStart = clip.startTime;
    const clipEnd = clip.endTime;
    
    // Ensure cut is within bounds
    if (cutTime <= clipStart || cutTime >= clipEnd) return;

    // Create two new clips
    const firstClip: VideoClip = {
      ...clip,
      id: `${clip.id}-part1`,
      endTime: cutTime,
    };

    const secondClip: VideoClip = {
      ...clip,
      id: `${clip.id}-part2`,
      startTime: cutTime,
    };

    // Replace the original clip with two new clips
    setLocalClips(prev => {
      const newClips = [...prev];
      newClips.splice(index, 1, firstClip, secondClip);
      return newClips;
    });

    // Select the first part
    setSelectedClipIndex(index);
  };

  const handleTimelineClick = (clipIndex: number, relativeX: number, clipWidth: number) => {
    const clip = localClips[clipIndex];
    const clipDuration = clip.endTime - clip.startTime;
    
    // Calculate the time position based on click position
    const clickRatio = Math.max(0, Math.min(1, relativeX / clipWidth));
    const timeInClip = clipDuration * clickRatio;

    if (cutMode) {
      // Split the clip at this time
      const cutTime = clip.startTime + timeInClip;
      splitClip(clipIndex, cutTime);
      // Exit cut mode
      setCutMode(false);
    } else {
      // Seek to this time in the player
      seekToTime(clipIndex, timeInClip);
    }
  };
  
  const seekToTime = (clipIndex: number, timeInClip: number) => {
    if (!playerRef.current) return;
    
    // Calculate the accumulated time before this clip
    let accumulatedTime = 0;
    for (let i = 0; i < clipIndex; i++) {
      const prevClip = localClips[i];
      accumulatedTime += prevClip.endTime - prevClip.startTime;
    }
    
    // Add the time within the clicked clip
    accumulatedTime += timeInClip;
    
    // Convert to frame and seek
    const frame = Math.floor(accumulatedTime * fps);
    console.log(`Seeking to frame ${frame} (${accumulatedTime.toFixed(2)}s)`);
    
    try {
      playerRef.current.seekTo(frame);
    } catch (err) {
      console.error('Seek error:', err);
    }
  };

  const handleExport = () => {
    onExport(localClips);
  };

  // Handle mouse move for dragging trim handles
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingHandle) return;

      const { clipIndex, type } = draggingHandle;
      const clip = localClips[clipIndex];
      if (!clip) return;

      // Calculate time change based on mouse movement
      const deltaX = e.movementX;
      const pixelsPerSecond = 50; // Same as timeline width calculation
      const deltaTime = deltaX / pixelsPerSecond;

      if (type === 'start') {
        const newStartTime = Math.max(0, Math.min(clip.endTime - 0.5, clip.startTime + deltaTime));
        updateClip(clipIndex, { startTime: newStartTime });
        setDraggingHandle({ clipIndex, type, time: newStartTime });
      } else {
        const newEndTime = Math.max(clip.startTime + 0.5, Math.min(clip.duration, clip.endTime + deltaTime));
        updateClip(clipIndex, { endTime: newEndTime });
        setDraggingHandle({ clipIndex, type, time: newEndTime });
      }
    };

    const handleMouseUp = () => {
      setDraggingHandle(null);
    };

    if (draggingHandle) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingHandle, localClips]);

  const selectedClip = selectedClipIndex !== null ? localClips[selectedClipIndex] : null;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-neutral-950">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-neutral-800 rounded" title="Undo">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button className="p-2 hover:bg-neutral-800 rounded" title="Redo">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
            </svg>
          </button>
          <div className="w-px h-6 bg-neutral-700 mx-2" />
          <button 
            onClick={() => setCutMode(!cutMode)}
            className={`p-2 rounded transition-colors ${
              cutMode 
                ? 'bg-photon-500 text-white' 
                : 'hover:bg-neutral-800'
            }`}
            title={cutMode ? "Cut mode active - Click on timeline to split" : "Enable cut mode"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
            </svg>
          </button>
          {cutMode && (
            <span className="text-xs text-photon-400 animate-pulse ml-2">
              Click on timeline to cut
            </span>
          )}
          <button className="p-2 hover:bg-neutral-800 rounded" title="Delete">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">{totalDuration.toFixed(2)}s</span>
          <button
            onClick={handleExport}
            disabled={localClips.length < 2}
            className="px-4 py-1.5 bg-photon-500 hover:bg-photon-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium"
          >
            Export
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Clips Library */}
        <div className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col">
          <div className="p-3 border-b border-neutral-800">
            <h3 className="text-sm font-semibold">Media</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {localClips.map((clip, index) => (
              <div
                key={clip.id}
                onClick={() => setSelectedClipIndex(index)}
                className={`relative group cursor-pointer rounded overflow-hidden border-2 transition-colors ${
                  selectedClipIndex === index
                    ? 'border-photon-500'
                    : 'border-transparent hover:border-neutral-600'
                }`}
              >
                <div className="aspect-video bg-black">
                  <video
                    ref={(el) => {
                      if (el) {
                        videoRefs.current[clip.id] = el;
                        // Force load metadata
                        el.load();
                      }
                    }}
                    src={clip.url}
                    className="w-full h-full object-cover"
                    onLoadedMetadata={(e) => handleVideoLoad(clip.id, e.currentTarget)}
                    onError={(e) => {
                      console.error(`Failed to load video ${clip.id}:`, {
                        url: clip.url,
                        error: e.currentTarget.error,
                        networkState: e.currentTarget.networkState,
                        readyState: e.currentTarget.readyState
                      });
                      // Set default duration on error
                      const clipIndex = localClips.findIndex(c => c.id === clip.id);
                      if (clipIndex !== -1 && localClips[clipIndex].duration === 0) {
                        updateClip(clipIndex, { duration: 8, endTime: 8 });
                      }
                    }}
                    preload="metadata"
                    muted
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-xs text-white truncate">{clip.prompt}</p>
                    <p className="text-[10px] text-neutral-400">
                      {(clip.endTime - clip.startTime).toFixed(1)}s
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center - Video Player */}
        <div className="flex-1 flex flex-col bg-black">
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden border border-neutral-800">
              {!allClipsLoaded ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <div className="text-lg font-semibold">Loading videos...</div>
                    <div className="text-sm text-neutral-400 mt-2">
                      Detecting video durations ({localClips.filter(c => c.duration > 0).length}/{localClips.length})
                    </div>
                  </div>
                </div>
              ) : (
                <Player
                  ref={playerRef}
                  component={VideoComposition}
                  inputProps={{ clips: localClips }}
                  durationInFrames={durationInFrames}
                  fps={fps}
                  compositionWidth={1920}
                  compositionHeight={1080}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                  controls
                  loop
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-80 bg-neutral-900 border-l border-neutral-800 flex flex-col">
          <div className="flex border-b border-neutral-800">
            <button
              onClick={() => setActiveTab('video')}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === 'video'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Video
            </button>
            <button
              onClick={() => setActiveTab('audio')}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === 'audio'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Audio
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === 'text'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Text
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {selectedClip ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Clip Properties</h4>
                  <p className="text-xs text-neutral-400 mb-3">{selectedClip.prompt}</p>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-2">Trim</label>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-neutral-500 block mb-1">Start Time</label>
                      <input
                        type="number"
                        min={0}
                        max={selectedClip.duration}
                        step={0.1}
                        value={selectedClip.startTime.toFixed(1)}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (value < selectedClip.endTime && selectedClipIndex !== null) {
                            updateClip(selectedClipIndex, { startTime: value });
                          }
                        }}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 block mb-1">End Time</label>
                      <input
                        type="number"
                        min={0}
                        max={selectedClip.duration}
                        step={0.1}
                        value={selectedClip.endTime.toFixed(1)}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (value > selectedClip.startTime && selectedClipIndex !== null) {
                            updateClip(selectedClipIndex, { endTime: value });
                          }
                        }}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-2">Duration</label>
                  <div className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm">
                    {(selectedClip.endTime - selectedClip.startTime).toFixed(2)}s
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-800">
                  <button
                    onClick={() => selectedClipIndex !== null && removeClip(selectedClipIndex)}
                    className="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm font-medium"
                  >
                    Remove Clip
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
                Select a clip to edit properties
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Timeline */}
      <div className="h-48 bg-neutral-900 border-t border-neutral-800 relative">
        <div className="h-full overflow-x-auto overflow-y-hidden" ref={timelineRef}>
          <div className="flex items-center h-full px-4 gap-2 min-w-max relative">
            {localClips.map((clip, index) => {
              const clipDuration = clip.endTime - clip.startTime;
              const widthInPixels = Math.max(clipDuration * 50, 100); // 50px per second, min 100px
              
              return (
                <div
                  key={clip.id}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const relativeX = e.clientX - rect.left;
                    
                    if (cutMode) {
                      handleTimelineClick(index, relativeX, widthInPixels);
                    } else {
                      // Show tooltip with clicked position - 1 second
                      const clipDuration = clip.endTime - clip.startTime;
                      const clickRatio = Math.max(0, Math.min(1, relativeX / widthInPixels));
                      const clickedTime = clip.startTime + (clipDuration * clickRatio);
                      const previewTime = Math.max(0, clickedTime - 1);
                      
                      // Set dragging handle state to show tooltip
                      setDraggingHandle({ 
                        clipIndex: index, 
                        type: 'start', // Use 'start' as default type
                        time: clickedTime 
                      });
                      
                      // Hide tooltip after 2 seconds
                      setTimeout(() => setDraggingHandle(null), 2000);
                      
                      // Seek to clicked position
                      handleTimelineClick(index, relativeX, widthInPixels);
                      setSelectedClipIndex(index);
                    }
                  }}
                  className={`relative group rounded overflow-hidden border-2 transition-all ${
                    cutMode 
                      ? 'cursor-crosshair border-photon-400' 
                      : selectedClipIndex === index
                        ? 'border-photon-500 shadow-lg shadow-photon-500/20 cursor-pointer'
                        : 'border-neutral-700 hover:border-neutral-600 cursor-pointer'
                  }`}
                  style={{ width: `${widthInPixels}px`, height: '120px' }}
                >
                  {/* Video thumbnail filmstrip */}
                  <div className="absolute inset-0 flex bg-neutral-950">
                    {(() => {
                      const frameCount = Math.ceil(widthInPixels / 60); // One frame every 60px
                      return [...Array(frameCount)].map((_, frameIndex) => {
                        // Calculate which time in the clip this frame represents
                        const frameRatio = frameIndex / Math.max(1, frameCount - 1);
                        const frameTime = clip.startTime + (clipDuration * frameRatio);
                        
                        return (
                          <div 
                            key={frameIndex} 
                            className="flex-shrink-0 h-full bg-black border-r border-neutral-800"
                            style={{ width: '60px' }}
                          >
                            <video
                              src={clip.url}
                              className="w-full h-full object-cover"
                              preload="metadata"
                              muted
                              onLoadedData={(e) => {
                                e.currentTarget.currentTime = frameTime;
                              }}
                            />
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Overlay info */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
                    <div className="absolute bottom-1 left-1 right-1">
                      <p className="text-[10px] text-white truncate font-medium">
                        {clip.prompt}
                      </p>
                      <p className="text-[9px] text-neutral-300">
                        {clipDuration.toFixed(1)}s
                      </p>
                    </div>
                  </div>

                  {/* Draggable Trim handles (only show when not in cut mode) */}
                  {!cutMode && (
                    <>
                      {/* Start handle (green) */}
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-2 bg-green-500 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity cursor-ew-resize z-10"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggingHandle({ clipIndex: index, type: 'start', time: clip.startTime });
                        }}
                        title="Drag to trim start"
                      >
                        <div className="absolute inset-y-0 left-0 w-1 bg-green-400" />
                      </div>
                      
                      {/* End handle (red) */}
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-2 bg-red-500 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity cursor-ew-resize z-10"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggingHandle({ clipIndex: index, type: 'end', time: clip.endTime });
                        }}
                        title="Drag to trim end"
                      >
                        <div className="absolute inset-y-0 right-0 w-1 bg-red-400" />
                      </div>
                    </>
                  )}
                  
                  {/* Cut line indicator (only show in cut mode) */}
                  {cutMode && (
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        left: '50%',
                        transform: 'translateX(-50%)',
                        boxShadow: '0 0 10px rgba(250, 204, 21, 0.5)'
                      }}
                    />
                  )}

                  {/* Trim time tooltip (show when dragging this clip) */}
                  {draggingHandle && draggingHandle.clipIndex === index && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-photon-500 text-white text-xs px-2 py-1.5 rounded shadow-lg z-30 whitespace-nowrap pointer-events-none">
                      <div className="text-center">
                        <div className="font-semibold">
                          {draggingHandle.type === 'start' ? 'Start: ' : 'End: '}
                          {draggingHandle.time.toFixed(2)}s
                        </div>
                        <div className="text-xs opacity-80 mt-0.5">
                          Preview at: {Math.max(0, draggingHandle.time - 1).toFixed(2)}s
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveClip(index, 'left');
                      }}
                      disabled={index === 0}
                      className="p-1 bg-black/80 hover:bg-black rounded disabled:opacity-30"
                      title="Move left"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveClip(index, 'right');
                      }}
                      disabled={index === localClips.length - 1}
                      className="p-1 bg-black/80 hover:bg-black rounded disabled:opacity-30"
                      title="Move right"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
