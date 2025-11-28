'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2, Play, Image as ImageIcon } from 'lucide-react';
import { uploadImageForVideo, generateVideoFromImages } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VeoImageToVideoProps {
  aspectRatio: 'VIDEO_ASPECT_RATIO_PORTRAIT' | 'VIDEO_ASPECT_RATIO_LANDSCAPE' | 'VIDEO_ASPECT_RATIO_SQUARE';
}

export function VeoImageToVideo({ aspectRatio }: VeoImageToVideoProps) {
  const [startImage, setStartImage] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<string | null>(null);
  const [startMediaId, setStartMediaId] = useState<string | null>(null);
  const [endMediaId, setEndMediaId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);

  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File, isStart: boolean) => {
    setError(null);
    setIsUploading(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        // Set preview
        if (isStart) {
          setStartImage(base64);
        } else {
          setEndImage(base64);
        }

        // Upload to get mediaId
        const result = await uploadImageForVideo({
          image_base64: base64,
          aspect_ratio: aspectRatio === 'VIDEO_ASPECT_RATIO_PORTRAIT' ? 'IMAGE_ASPECT_RATIO_PORTRAIT' 
            : aspectRatio === 'VIDEO_ASPECT_RATIO_LANDSCAPE' ? 'IMAGE_ASPECT_RATIO_LANDSCAPE'
            : 'IMAGE_ASPECT_RATIO_SQUARE'
        });

        if (result.success && result.media_id) {
          if (isStart) {
            setStartMediaId(result.media_id);
          } else {
            setEndMediaId(result.media_id);
          }
        } else {
          throw new Error(result.error || 'Failed to upload image');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isStart: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      handleImageUpload(file, isStart);
    }
  };

  const handleGenerateVideo = async () => {
    if (!startMediaId || !endMediaId || !prompt.trim()) {
      setError('Please upload both images and enter a prompt');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setVideoUrl(null);
    setGenerationTime(null);

    try {
      const result = await generateVideoFromImages({
        start_image_media_id: startMediaId,
        end_image_media_id: endMediaId,
        prompt: prompt.trim(),
        aspect_ratio: aspectRatio,
        video_model_key: 'veo_3_1_i2v_s_fast_portrait_ultra_fl',
        timeout_sec: 600,
        poll_interval_sec: 5
      });

      if (result.success && result.video_url) {
        setVideoUrl(result.video_url);
        setGenerationTime(result.generation_time_seconds || null);
      } else {
        throw new Error(result.error || 'Failed to generate video');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate video');
    } finally {
      setIsGenerating(false);
    }
  };

  const clearImage = (isStart: boolean) => {
    if (isStart) {
      setStartImage(null);
      setStartMediaId(null);
      if (startInputRef.current) startInputRef.current.value = '';
    } else {
      setEndImage(null);
      setEndMediaId(null);
      if (endInputRef.current) endInputRef.current.value = '';
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-xl text-slate-200 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-purple-400" />
          Image-to-Video Generation
        </CardTitle>
        <CardDescription className="text-slate-400">
          Create videos by animating between two images with AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Image Uploads */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Frame */}
          <div className="space-y-2">
            <Label className="text-slate-300">Start Frame</Label>
            <div className="relative">
              {startImage ? (
                <div className="relative group">
                  <img 
                    src={startImage} 
                    alt="Start frame" 
                    className="w-full h-48 object-cover rounded-lg border border-slate-700"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => clearImage(true)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  {startMediaId && (
                    <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                      Uploaded ✓
                    </div>
                  )}
                </div>
              ) : (
                <div 
                  className="w-full h-48 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-slate-600 transition-colors"
                  onClick={() => startInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-slate-500 mb-2" />
                  <p className="text-sm text-slate-400">Click to upload start frame</p>
                </div>
              )}
              <input
                ref={startInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, true)}
                disabled={isUploading}
              />
            </div>
          </div>

          {/* End Frame */}
          <div className="space-y-2">
            <Label className="text-slate-300">End Frame</Label>
            <div className="relative">
              {endImage ? (
                <div className="relative group">
                  <img 
                    src={endImage} 
                    alt="End frame" 
                    className="w-full h-48 object-cover rounded-lg border border-slate-700"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => clearImage(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  {endMediaId && (
                    <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                      Uploaded ✓
                    </div>
                  )}
                </div>
              ) : (
                <div 
                  className="w-full h-48 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-slate-600 transition-colors"
                  onClick={() => endInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-slate-500 mb-2" />
                  <p className="text-sm text-slate-400">Click to upload end frame</p>
                </div>
              )}
              <input
                ref={endInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, false)}
                disabled={isUploading}
              />
            </div>
          </div>
        </div>

        {/* Prompt */}
        <div className="space-y-2">
          <Label className="text-slate-300">Animation Prompt</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe how the video should animate from start to end frame..."
            className="bg-slate-800/50 border-slate-700 text-slate-200 min-h-[100px]"
            disabled={isGenerating}
          />
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerateVideo}
          disabled={!startMediaId || !endMediaId || !prompt.trim() || isGenerating || isUploading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Video... (this may take several minutes)
            </>
          ) : isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading Image...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Generate Video
            </>
          )}
        </Button>

        {/* Generated Video */}
        {videoUrl && (
          <div className="space-y-2 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">Generated Video</Label>
              {generationTime && (
                <span className="text-xs text-slate-400">
                  Generated in {generationTime}s
                </span>
              )}
            </div>
            <video
              src={videoUrl}
              controls
              autoPlay
              loop
              className="w-full rounded-lg border border-slate-700"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
