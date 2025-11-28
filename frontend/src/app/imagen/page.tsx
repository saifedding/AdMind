'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ImageIcon, Download, Copy, Sparkles, Upload, X } from 'lucide-react';
import { generateImages, ImageGenerateRequest, ImageGenerateResponse, uploadImageForVideo, ImageUploadRequest, ImageUploadResponse, saveImage, SaveImageRequest } from '@/lib/api';
import { toast } from 'sonner';

interface GeneratedImageData {
  id: string;
  encodedImage: string;
  prompt: string;
  aspectRatio: string;
  model: string;
  mediaId?: string;
  fifeUrl?: string;
  saved?: boolean;
}

export default function ImagenPage() {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'IMAGE_ASPECT_RATIO_PORTRAIT' | 'IMAGE_ASPECT_RATIO_LANDSCAPE' | 'IMAGE_ASPECT_RATIO_SQUARE'>('IMAGE_ASPECT_RATIO_PORTRAIT');
  const [numImages, setNumImages] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageData[]>([]);
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [inputImageFile, setInputImageFile] = useState<File | null>(null);
  const [referenceMediaId, setReferenceMediaId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setInputImage(base64String);
      setInputImageFile(file);
      setReferenceMediaId(null);
      setIsUploading(true);
      try {
        const uploadReq: ImageUploadRequest = {
          image_base64: base64String,
          aspect_ratio: aspectRatio,
        };
        const uploadRes: ImageUploadResponse = await uploadImageForVideo(uploadReq);
        if (uploadRes.success && uploadRes.media_id) {
          setReferenceMediaId(uploadRes.media_id);
          toast.success('Image uploaded to Google (media ready)');
        } else {
          toast.error(uploadRes.error || 'Failed to upload image to Google');
        }
      } catch (e: any) {
        toast.error(e.message || 'Failed to upload image to Google');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearInputImage = () => {
    setInputImage(null);
    setInputImageFile(null);
    setReferenceMediaId(null);
    toast.info('Input image cleared');
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    try {
      const request: ImageGenerateRequest = {
        prompt: prompt.trim(),
        aspect_ratio: aspectRatio,
        image_model_name: 'GEM_PIX_2',
        num_images: numImages,
        input_image_base64: referenceMediaId ? undefined : (inputImage || undefined),
        reference_media_id: referenceMediaId || undefined,
        project_id: undefined,
      };

      const response: ImageGenerateResponse = await generateImages(request);

      if (response.success && response.images) {
        const newImages: GeneratedImageData[] = response.images.map((img: any, index: number) => {
          const id = img.name || `${Date.now()}-${index}`;
          const encoded = img.image?.generatedImage?.encodedImage || '';
          const mediaId = img.mediaGenerationId 
            || img.name 
            || img.image?.mediaGenerationId 
            || img.image?.generatedImage?.mediaGenerationId 
            || undefined;
          return {
            id,
            encodedImage: encoded,
            prompt: response.prompt || prompt,
            aspectRatio: response.aspect_ratio || aspectRatio,
            model: response.model || 'GEM_PIX_2',
            mediaId,
            fifeUrl: img.fifeUrl || undefined,
            saved: false,
          };
        });

        setGeneratedImages([...newImages, ...generatedImages]);
        toast.success(`Generated ${newImages.length} images successfully!`);
      } else {
        toast.error(response.error || 'Failed to generate images');
      }
    } catch (error: any) {
      console.error('Image generation error:', error);
      toast.error(error.message || 'Failed to generate images');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (image: GeneratedImageData) => {
    try {
      const link = document.createElement('a');
      link.href = `data:image/jpeg;base64,${image.encodedImage}`;
      link.download = `imagen-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Image downloaded!');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  const handleSave = async (image: GeneratedImageData) => {
    if (!image.mediaId) {
      toast.error('Missing media id');
      return;
    }
    const idKey = image.id;
    setSavingIds((prev) => new Set(prev).add(idKey));
    try {
      const req: SaveImageRequest = {
        media_id: image.mediaId,
        name: image.id,
        prompt: image.prompt,
        model: image.model,
        aspect_ratio: image.aspectRatio,
        encoded_image: image.encodedImage,
        fife_url: image.fifeUrl,
      };
      await saveImage(req);
      setGeneratedImages((prev) => prev.map((i) => (i.id === image.id ? { ...i, saved: true } : i)));
      toast.success('Saved to library');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(idKey);
        return next;
      });
    }
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success('Prompt copied to clipboard!');
  };

  const getAspectRatioLabel = (ratio: string) => {
    switch (ratio) {
      case 'IMAGE_ASPECT_RATIO_PORTRAIT':
        return 'Portrait (9:16)';
      case 'IMAGE_ASPECT_RATIO_LANDSCAPE':
        return 'Landscape (16:9)';
      case 'IMAGE_ASPECT_RATIO_SQUARE':
        return 'Square (1:1)';
      default:
        return ratio;
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Imagen Studio
                </h1>
                <p className="text-sm text-slate-400 mt-1">AI Image Generation Suite</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
              {/* Left Column: Prompt Input */}
              <div className="space-y-6">
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-200 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-400" />
                      Image Prompt
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="prompt" className="text-slate-300">
                        Describe the image you want to generate
                      </Label>
                      <Textarea
                        id="prompt"
                        placeholder="E.g., create for me solo podcast hijabi girl with modern setup and warm lighting..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={6}
                        className="mt-2 bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500 resize-none"
                      />
                    </div>

                    {/* Input Image Upload */}
                    <div>
                      <Label className="text-slate-300 mb-2 block">
                        Input Image (Optional)
                      </Label>
                      {!inputImage ? (
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="image-upload"
                          />
                          <label
                            htmlFor="image-upload"
                            className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-slate-800/30 transition-colors"
                          >
                            <Upload className="w-5 h-5 text-slate-400" />
                            <span className="text-sm text-slate-400">
                              Click to upload reference image
                            </span>
                          </label>
                        </div>
                      ) : (
                        <div className="relative rounded-lg overflow-hidden border border-slate-700">
                          <img
                            src={inputImage}
                            alt="Input reference"
                            className="w-full h-48 object-cover"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleClearInputImage}
                            className="absolute top-2 right-2"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-white truncate">{inputImageFile?.name}</p>
                      {isUploading ? (
                        <span className="text-xs text-blue-300 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</span>
                      ) : referenceMediaId ? (
                        <span className="text-xs text-green-300">Ready</span>
                      ) : (
                        <span className="text-xs text-yellow-300">Local only</span>
                      )}
                    </div>
                        </div>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        Upload an image to use as reference for generation (image-to-image)
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="aspect-ratio" className="text-slate-300">
                          Aspect Ratio
                        </Label>
                        <Select
                          value={aspectRatio}
                          onValueChange={(value: any) => setAspectRatio(value)}
                        >
                          <SelectTrigger className="mt-2 bg-slate-800/50 border-slate-700 text-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="IMAGE_ASPECT_RATIO_PORTRAIT">Portrait (9:16)</SelectItem>
                            <SelectItem value="IMAGE_ASPECT_RATIO_LANDSCAPE">Landscape (16:9)</SelectItem>
                            <SelectItem value="IMAGE_ASPECT_RATIO_SQUARE">Square (1:1)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="num-images" className="text-slate-300">
                          Number of Images
                        </Label>
                        <Select
                          value={numImages.toString()}
                          onValueChange={(value) => setNumImages(parseInt(value))}
                        >
                          <SelectTrigger className="mt-2 bg-slate-800/50 border-slate-700 text-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="1">1 Image</SelectItem>
                            <SelectItem value="2">2 Images</SelectItem>
                            <SelectItem value="3">3 Images</SelectItem>
                            <SelectItem value="4">4 Images</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating || isUploading || !prompt.trim()}
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Generate Images
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Info */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-200 text-sm">Generation Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-400">
                  <div>
                    <span className="font-medium text-slate-300">Model:</span> GEM PIX 2
                  </div>
                  <div>
                    <span className="font-medium text-slate-300">Format:</span> {getAspectRatioLabel(aspectRatio)}
                  </div>
                  <div>
                    <span className="font-medium text-slate-300">Output:</span> {numImages} image{numImages > 1 ? 's' : ''}
                  </div>
                  {inputImage && (
                    <div>
                      <span className="font-medium text-slate-300">Mode:</span> <span className="text-blue-400">Image-to-Image</span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-slate-800">
                    <p className="text-xs text-slate-500">
                      Images are generated using Google's Imagen model. {inputImage ? 'Using your reference image to guide generation.' : 'Upload an image for image-to-image generation, or leave empty for text-to-image.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Generated Images Gallery */}
            {generatedImages.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-200">Generated Images</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {generatedImages.map((image) => (
                    <Card key={image.id} className="bg-slate-900/50 border-slate-800 overflow-hidden group">
                      <div className="relative aspect-[9/16] bg-slate-800">
                        <img
                          src={`data:image/jpeg;base64,${image.encodedImage}`}
                          alt="Generated"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleDownload(image)}
                                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSave(image)}
                                disabled={!!image.saved || savingIds.has(image.id)}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                              >
                                {savingIds.has(image.id) ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    Saving
                                  </>
                                ) : image.saved ? (
                                  <>Saved</>
                                ) : (
                                  <>
                                    <Upload className="w-4 h-4 mr-1" />
                                    Save
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyPrompt(image.prompt)}
                                className="border-slate-600 text-slate-300 hover:bg-slate-800"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <p className="text-xs text-slate-400 line-clamp-2">{image.prompt}</p>
                        <p className="text-xs text-slate-500 mt-1">{getAspectRatioLabel(image.aspectRatio)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {generatedImages.length === 0 && !isGenerating && (
              <Card className="bg-slate-900/30 border-slate-800 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <ImageIcon className="w-16 h-16 text-slate-600 mb-4" />
                  <h3 className="text-lg font-medium text-slate-400 mb-2">No images generated yet</h3>
                  <p className="text-sm text-slate-500">Enter a prompt and click "Generate Images" to get started</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
