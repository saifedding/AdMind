'use client';

import { useEffect, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

type VideoClip = {
  id: string;
  url: string;
  prompt: string;
  startTime: number;
  endTime: number;
  duration: number;
};

type FFmpegEditorProps = {
  clips: VideoClip[];
  onMergeComplete: (videoUrl: string) => void;
  onProgress?: (progress: number) => void;
};

export function FFmpegEditor({ clips, onMergeComplete, onProgress }: FFmpegEditorProps) {
  const ffmpegRef = useRef(new FFmpeg());
  const [loaded, setLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFFmpeg();
  }, []);

  const loadFFmpeg = async () => {
    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      const ffmpeg = ffmpegRef.current;
      
      ffmpeg.on('log', ({ message }) => {
        console.log(message);
      });
      
      ffmpeg.on('progress', ({ progress: p }) => {
        const percent = Math.round(p * 100);
        setProgress(percent);
        onProgress?.(percent);
      });

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      setLoaded(true);
      console.log('FFmpeg loaded successfully');
    } catch (err) {
      console.error('Failed to load FFmpeg:', err);
      setError('Failed to load video editor. Please refresh the page.');
    }
  };

  const trimAndMergeClips = async () => {
    if (!loaded || clips.length === 0) return;

    setProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const ffmpeg = ffmpegRef.current;
      const trimmedFiles: string[] = [];

      // Download and trim each clip
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const inputName = `input_${i}.mp4`;
        const outputName = `trimmed_${i}.mp4`;

        // Fetch video file
        const videoData = await fetchFile(clip.url);
        await ffmpeg.writeFile(inputName, videoData);

        // Trim video using FFmpeg
        const duration = clip.endTime - clip.startTime;
        await ffmpeg.exec([
          '-i', inputName,
          '-ss', clip.startTime.toString(),
          '-t', duration.toString(),
          '-c:v', 'libx264',
          '-c:a', 'aac',
          '-strict', 'experimental',
          outputName
        ]);

        trimmedFiles.push(outputName);
        
        // Update progress
        const clipProgress = ((i + 1) / clips.length) * 50; // First 50% for trimming
        setProgress(Math.round(clipProgress));
        onProgress?.(Math.round(clipProgress));
      }

      // Create concat file
      const concatContent = trimmedFiles.map(f => `file '${f}'`).join('\n');
      await ffmpeg.writeFile('concat.txt', new TextEncoder().encode(concatContent));

      // Merge all trimmed clips
      await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat.txt',
        '-c', 'copy',
        'output.mp4'
      ]);

      // Read the output file
      const data = await ffmpeg.readFile('output.mp4');
      // @ts-ignore - FFmpeg.wasm type compatibility
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      setProgress(100);
      onProgress?.(100);
      onMergeComplete(url);

      // Cleanup
      for (const file of trimmedFiles) {
        await ffmpeg.deleteFile(file);
      }
      await ffmpeg.deleteFile('concat.txt');
      await ffmpeg.deleteFile('output.mp4');

    } catch (err: any) {
      console.error('FFmpeg processing error:', err);
      setError(`Processing failed: ${err.message || 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {!loaded && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="animate-spin">⏳</div>
            <span>Loading professional video editor...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {loaded && !processing && (
        <button
          onClick={trimAndMergeClips}
          disabled={clips.length < 2}
          className="w-full py-3 bg-gradient-to-r from-photon-500 to-photon-600 hover:from-photon-600 hover:to-photon-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium"
        >
          Trim & Merge {clips.length} Clips (Professional Processing)
        </button>
      )}

      {processing && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Processing with FFmpeg...</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-photon-500 to-photon-600 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-neutral-500 text-center">
            {progress < 50 ? 'Trimming clips...' : 'Merging videos...'}
          </div>
        </div>
      )}
    </div>
  );
}
