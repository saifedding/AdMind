"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard";
import { adsApi, AnalyzeVideoResponse, DownloadFromLibraryResponse, VeoModel } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Download, 
  Play, 
  Wand2, 
  MessageSquare, 
  History, 
  LayoutGrid, 
  Trash2, 
  RefreshCw, 
  Film, 
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  Copy,
  Share2,
  Mic,
  FileText,
  Type,
  Clock
} from "lucide-react";
import { UnifiedAnalysisPanel } from "@/components/unified-analysis";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// --- Types ---
interface AdHistoryItem {
  id: number;
  ad_archive_id: string;
  title?: string;
  media: any[];
  created_at: string;
  video_hd_count: number;
  video_sd_count: number;
  image_count: number;
  analysis_count: number;
  prompt_count: number;
  veo_video_count: number;
  merge_count: number;
  ad_id?: number;
}

// --- Components ---

const HistoryCard = ({ item, onClick, onDelete }: { 
  item: AdHistoryItem, 
  onClick: () => void,
  onDelete: () => void
}) => {
  const firstMedia = item.media && item.media.length > 0 ? item.media[0] : null;
  const isVideo = firstMedia?.type === 'video';

  return (
    <div 
      className="group relative min-w-[200px] w-[200px] bg-card border rounded-xl overflow-hidden hover:border-primary/50 transition-all cursor-pointer snap-start flex-shrink-0 shadow-sm hover:shadow-md"
      onClick={onClick}
    >
      {/* Media Preview - Portrait Aspect Ratio (9:16) */}
      <div className="aspect-[9/16] bg-muted relative overflow-hidden">
        {firstMedia ? (
          isVideo ? (
            <video src={firstMedia.url} className="w-full h-full object-cover" muted />
          ) : (
            <img src={firstMedia.url} alt="Ad preview" className="w-full h-full object-cover" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <LayoutGrid className="w-8 h-8 opacity-20" />
          </div>
        )}
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

        {/* Badges */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
             <Badge variant="secondary" className="text-[10px] h-5 bg-black/50 backdrop-blur-sm border-none text-white">
                {isVideo ? <Film className="w-3 h-3 mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
                {item.ad_archive_id.slice(0, 8)}...
             </Badge>
        </div>

        {/* Metrics */}
        <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-1">
           <div className="flex gap-1 flex-wrap">
             {item.analysis_count > 0 && (
               <Badge className="text-[9px] h-4 px-1 bg-blue-500/80 hover:bg-blue-500 border-none text-white">AI</Badge>
             )}
             {item.veo_video_count > 0 && (
               <Badge className="text-[9px] h-4 px-1 bg-green-500/80 hover:bg-green-500 border-none text-white">Veo</Badge>
             )}
          </div>
          <span className="text-[10px] text-white/70 font-mono truncate">
            {new Date(item.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Delete Action */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 text-white hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all z-10"
        onClick={(e) => {
          e.stopPropagation();
          if(confirm("Delete from history?")) onDelete();
        }}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
};

export default function AdIntelligencePage() {
  const router = useRouter();
  
  // --- State ---
  const [urlInput, setUrlInput] = useState("https://www.facebook.com/ads/library/?id=1165490822069878");
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("analysis");

  // Data State
  const [adResult, setAdResult] = useState<DownloadFromLibraryResponse | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeVideoResponse | null>(null);
  const [history, setHistory] = useState<AdHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "model"; text: string; at: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // --- Effects ---
  useEffect(() => {
    loadHistory();
    
    // Load saved state
    const savedAdResult = localStorage.getItem("adResult");
    const savedAnalysis = localStorage.getItem("analysis");
    const savedUrlInput = localStorage.getItem("urlInput");

    if (savedAdResult) {
        try {
            setAdResult(JSON.parse(savedAdResult));
        } catch (e) { console.error("Failed to parse saved adResult", e); }
    }
    if (savedAnalysis) {
        try {
            setAnalysis(JSON.parse(savedAnalysis));
        } catch (e) { console.error("Failed to parse saved analysis", e); }
    }
    if (savedUrlInput) setUrlInput(savedUrlInput);
  }, []);

  // Persistence Effects
  useEffect(() => {
    if (adResult) localStorage.setItem("adResult", JSON.stringify(adResult));
    else localStorage.removeItem("adResult");
  }, [adResult]);

  useEffect(() => {
    if (analysis) localStorage.setItem("analysis", JSON.stringify(analysis));
    else localStorage.removeItem("analysis");
  }, [analysis]);

  useEffect(() => {
    localStorage.setItem("urlInput", urlInput);
  }, [urlInput]);

  // --- Actions ---

  const handleClear = () => {
      if(confirm("Clear current analysis?")) {
          setAdResult(null);
          setAnalysis(null);
          setUrlInput("");
          setChatMessages([]);
          localStorage.removeItem("adResult");
          localStorage.removeItem("analysis");
          localStorage.removeItem("urlInput");
          toast.success("Cleared");
      }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await adsApi.getDownloadHistory(1, 50);
      setHistory(res.items as unknown as AdHistoryItem[]);
    } catch (error) {
      console.error("Failed to load history", error);
      toast.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleProcessAd = async () => {
    if (!urlInput) return;
    setLoading(true);
    setAdResult(null);
    setAnalysis(null);
    setChatMessages([]);

    try {
      // 1. Download/Extract Info
      const res = await adsApi.downloadFromAdLibrary({
        ad_library_url: urlInput,
        media_type: "video",
        download: false // Just extract info first
      });
      
      if (!res.success) throw new Error(res.message);
      setAdResult(res);
      toast.success("Ad extracted successfully");

      // Refresh history
      loadHistory();

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to process ad");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (adId: number, videoUrl: string) => {
    setIsAnalyzing(true);
    try {
        const res = await adsApi.analyzeVideoFromLibrary({
            ad_id: adId,
            video_url: videoUrl,
            persist: true
        });
        setAnalysis(res);
        
        // Load existing chat history if any
        if (res.raw?.gemini_chat_history) {
             const history = res.raw.gemini_chat_history;
             const messages: any[] = [];
             history.forEach((msg: any, i: number) => {
                 if (i > 0 && msg.parts?.[0]?.text) { // Skip system prompt
                     messages.push({
                         role: msg.role,
                         text: msg.parts[0].text,
                         at: new Date().toISOString()
                     });
                 }
             });
             setChatMessages(messages);
        }

        toast.success("Analysis complete");
    } catch (error: any) {
        toast.error("Analysis failed: " + error.message);
    }
  };

  const handleHistoryItemClick = async (item: AdHistoryItem) => {
      const videos = item.media?.filter((m: any) => m.type === 'video') || [];
      
      const mappedResult: DownloadFromLibraryResponse = {
          success: true,
          ad_archive_id: item.ad_archive_id,
          ad_id: item.ad_id || item.id,
          video_urls: item.media.filter((m:any) => m.type === 'video').map((m:any) => m.url),
          image_urls: item.media.filter((m:any) => m.type === 'image').map((m:any) => m.url),
          video_hd_urls: item.media.filter((m:any) => m.type === 'video' && m.quality === 'hd').map((m:any) => m.url),
          video_sd_urls: item.media.filter((m:any) => m.type === 'video' && m.quality === 'sd').map((m:any) => m.url),
          downloaded: [],
          media: item.media,
          message: "Loaded from history"
      };

      setAdResult(mappedResult);
      
      if (item.ad_id) {
          try {
            const analysisRes = await adsApi.getAdAnalysis(item.ad_id);
            setAnalysis(analysisRes);
            // Load chat
            if (analysisRes.raw?.gemini_chat_history) {
                const history = analysisRes.raw.gemini_chat_history;
                const messages: any[] = [];
                history.forEach((msg: any, i: number) => {
                    if (i > 0 && msg.parts?.[0]?.text) {
                        messages.push({
                            role: msg.role,
                            text: msg.parts[0].text,
                            at: new Date().toISOString()
                        });
                    }
                });
                setChatMessages(messages);
           }
          } catch (e) {
            setAnalysis(null);
            setChatMessages([]);
          }
      } else {
          setAnalysis(null);
          setChatMessages([]);
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChatSubmit = async () => {
      if (!chatInput.trim() || !adResult?.ad_id) return;
      
      const question = chatInput;
      setChatInput("");
      setChatLoading(true);
      
      // Optimistic update
      setChatMessages(prev => [...prev, { role: "user", text: question, at: new Date().toISOString() }]);

      try {
          const res = await adsApi.followupAdAnalysis(adResult.ad_id, { question });
          setChatMessages(prev => [...prev, { role: "model", text: res.answer, at: new Date().toISOString() }]);
      } catch (error: any) {
          toast.error("Failed to send message: " + error.message);
      } finally {
          setChatLoading(false);
      }
  };

  const handleRegenerate = async () => {
      if (!adResult?.ad_id) return;
      if(!confirm("Regenerate analysis? This will replace the current analysis.")) return;

      setAnalysis(null);
      try {
          // Using handleAnalyze directly to re-trigger
          if (adResult.video_urls[0]) {
              await handleAnalyze(adResult.ad_id, adResult.video_urls[0]);
          }
      } catch (error) {
          console.error(error);
      }
  };

  // --- Render Helpers ---

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8 border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/20 animate-in fade-in zoom-in duration-500">
      <div className="w-24 h-24 bg-neutral-800/50 rounded-full flex items-center justify-center mb-6 relative group">
        <Wand2 className="w-12 h-12 text-neutral-500 group-hover:text-primary transition-colors" />
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <h3 className="text-3xl font-bold mb-3 text-white">Ready to Analyze</h3>
      <p className="text-neutral-400 max-w-md mb-8 text-lg">
        Paste a Facebook Ad Library URL to extract insights, scripts, and generate variants.
      </p>
      <div className="flex gap-4">
        <Button 
            variant="outline" 
            onClick={() => setUrlInput("https://www.facebook.com/ads/library/?id=1165490822069878")}
            className="border-neutral-700 hover:bg-neutral-800 hover:text-white"
        >
          Try Example Ad
        </Button>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-[1600px] mx-auto space-y-8 pb-20">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-800">
            <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                    Ad Intelligence
                </h1>
                <p className="text-neutral-400 mt-2 text-lg">
                    Deep analysis and remixing engine for your ad creatives.
                </p>
            </div>
            
            {/* Main Input */}
            <div className="flex w-full md:w-[600px] gap-2 shadow-2xl bg-neutral-900/80 p-1.5 rounded-xl border border-neutral-800 backdrop-blur-md">
                <Input 
                    placeholder="Paste Facebook Ad Library URL..." 
                    className="border-0 focus-visible:ring-0 bg-transparent h-12 text-base placeholder:text-neutral-600"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                />
                <Button 
                    size="lg" 
                    className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow transition-all rounded-lg font-medium"
                    onClick={handleProcessAd}
                    disabled={loading}
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Wand2 className="w-5 h-5 mr-2" />}
                    {loading ? "Processing" : "Analyze"}
                </Button>

                {/* Clear Button */}
                {(adResult || urlInput) && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 min-w-[3rem] text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg ml-1"
                        onClick={handleClear}
                        title="Clear Analysis"
                    >
                        <Trash2 className="w-5 h-5" />
                    </Button>
                )}
            </div>
        </div>

        {/* Main Content Grid */}
        {adResult ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Left Panel: Source & Media (4 cols) */}
                <div className="xl:col-span-4 space-y-6">
                    <Card className="overflow-hidden border-neutral-800 bg-neutral-900/40 shadow-xl">
                        <CardHeader className="p-4 border-b border-neutral-800 bg-neutral-950/30">
                            <CardTitle className="text-sm font-medium text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                                Source Creative
                                <Badge variant="outline" className="ml-2 text-xs border-neutral-700 bg-neutral-800/50 text-neutral-300">
                                    {adResult.ad_archive_id}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        
                        {/* Video Player Container - Centered with proper aspect ratio handling */}
                        <div className="bg-black relative group flex items-center justify-center min-h-[400px] max-h-[600px]">
                            {adResult.video_urls[0] ? (
                                <video 
                                    src={adResult.video_urls[0]} 
                                    controls 
                                    className="w-auto h-full max-h-[600px] max-w-full object-contain" 
                                />
                            ) : (
                                <div className="aspect-[9/16] w-full flex items-center justify-center text-neutral-500">
                                    No Video Found
                                </div>
                            )}
                        </div>

                        <CardFooter className="p-4 border-t border-neutral-800 bg-neutral-900/20 flex flex-col gap-3">
                             {/* Download Options */}
                             <div className="flex w-full gap-2">
                                 {adResult.video_hd_urls[0] && (
                                     <Button 
                                        variant="default" 
                                        size="sm" 
                                        className="flex-1 bg-white text-black hover:bg-neutral-200"
                                        onClick={() => window.open(adResult.video_hd_urls[0], '_blank')}
                                     >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download HD
                                     </Button>
                                 )}
                                 {adResult.video_sd_urls[0] && (
                                     <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="flex-1 border-neutral-700 hover:bg-neutral-800"
                                        onClick={() => window.open(adResult.video_sd_urls[0], '_blank')}
                                     >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download SD
                                     </Button>
                                 )}
                                 {!adResult.video_hd_urls[0] && !adResult.video_sd_urls[0] && adResult.video_urls[0] && (
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="flex-1 border-neutral-700 hover:bg-neutral-800"
                                        onClick={() => window.open(adResult.video_urls[0], '_blank')}
                                     >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download Video
                                     </Button>
                                 )}
                             </div>
                             
                             <div className="grid grid-cols-2 gap-2 w-full">
                                <Button variant="secondary" size="sm" className="w-full bg-neutral-800 hover:bg-neutral-700">
                                    <Share2 className="w-3 h-3 mr-2" /> Share
                                </Button>
                                <Button variant="secondary" size="sm" className="w-full bg-neutral-800 hover:bg-neutral-700">
                                    <Copy className="w-3 h-3 mr-2" /> Copy Link
                                </Button>
                             </div>
                        </CardFooter>
                    </Card>

                    {/* Ad Metadata */}
                    <Card className="border-neutral-800 bg-neutral-900/20">
                         <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Platform</label>
                                    <div className="font-medium text-sm mt-1">Facebook / Instagram</div>
                                </div>
                                <div>
                                    <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Format</label>
                                    <div className="font-medium text-sm mt-1">Vertical Video (9:16)</div>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Status</label>
                                    <div className="flex items-center text-sm text-green-400 mt-1 bg-green-400/10 p-2 rounded-md border border-green-400/20 w-fit">
                                        <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                                        Active
                                    </div>
                                </div>
                            </div>
                         </CardContent>
                    </Card>
                </div>

                {/* Right Panel: Analysis & Tools (8 cols) */}
                <div className="xl:col-span-8">
                    <Tabs defaultValue="analysis" className="w-full" value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="w-full justify-start h-14 bg-neutral-900/50 border border-neutral-800 p-1 mb-6 rounded-xl backdrop-blur-sm">
                            <TabsTrigger value="analysis" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white px-6 h-full rounded-lg">
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Deep Analysis
                            </TabsTrigger>
                            <TabsTrigger value="prompts" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white px-6 h-full rounded-lg">
                                <Wand2 className="w-4 h-4 mr-2" /> Remix Prompts
                            </TabsTrigger>
                            <TabsTrigger value="veo" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white px-6 h-full rounded-lg">
                                <Film className="w-4 h-4 mr-2" /> Veo Studio
                            </TabsTrigger>
                            <TabsTrigger value="chat" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white px-6 h-full rounded-lg">
                                <MessageSquare className="w-4 h-4 mr-2" /> Assistant
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="analysis" className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            {adResult?.ad_id ? (
                                <UnifiedAnalysisPanel 
                                    adId={adResult.ad_id}
                                    onAnalysisComplete={(analysisResult) => {
                                        setAnalysis(analysisResult);
                                        setActiveTab("analysis");
                                    }}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/20">
                                    <div className="w-16 h-16 bg-neutral-800/50 rounded-full flex items-center justify-center mb-4">
                                        <Wand2 className="w-8 h-8 text-neutral-500" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2 text-white">Analysis Not Available</h3>
                                    <p className="text-neutral-400 max-w-md mb-6">
                                        Please process an ad first to enable AI analysis.
                                    </p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="prompts" className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            {analysis?.generation_prompts && analysis.generation_prompts.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold">Creative Prompts</h3>
                                        <Badge variant="outline" className="border-neutral-700 text-neutral-300">
                                            {analysis.generation_prompts.length} prompts
                                        </Badge>
                                    </div>
                                    {analysis.generation_prompts.map((prompt, index) => (
                                        <Card key={index} className="border-neutral-800 bg-neutral-900/30">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-sm font-medium text-neutral-400">
                                                    Prompt {index + 1}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-neutral-300 text-sm leading-relaxed">{prompt}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Type className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                                    <p className="text-neutral-500">No creative prompts available. Run analysis first.</p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="veo" className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-center py-8">
                                <Film className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                                <p className="text-neutral-500">Veo video generation coming soon...</p>
                            </div>
                                                                {analysis.transcript}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {analysis.voice_over && (
                                                        <div className="space-y-2">
                                                            <h4 className="text-xs font-semibold text-neutral-500 uppercase">Voice Over Style</h4>
                                                            <p className="text-sm text-neutral-300 italic">"{analysis.voice_over}"</p>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </div>
                                        
                                        <div className="space-y-6">
                                            {/* Key Elements */}
                                            <Card className="border-neutral-800 bg-neutral-900/30">
                                                <CardHeader>
                                                    <CardTitle className="text-sm">Strengths</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <ul className="space-y-3">
                                                        {(analysis.strengths || ["High Contrast Visuals", "Clear CTA", "Human Element"]).slice(0, 5).map((s, i) => (
                                                            <li key={i} className="flex items-start gap-3 text-sm text-neutral-300 bg-neutral-950/30 p-2 rounded border border-neutral-800/50">
                                                                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                                                {s}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </CardContent>
                                            </Card>

                                            {/* Text Overlays */}
                                            <Card className="border-neutral-800 bg-neutral-900/30">
                                                <CardHeader>
                                                    <CardTitle className="text-sm flex items-center">
                                                        <Type className="w-4 h-4 mr-2" /> Text Overlays
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-sm text-neutral-400">
                                                        {analysis.text_on_video || "No major text overlays detected."}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>

                                    {/* Storyboard / Beats */}
                                    <Card className="border-neutral-800 bg-neutral-900/30">
                                        <CardHeader>
                                            <CardTitle className="flex items-center">
                                                <Clock className="w-4 h-4 mr-2" /> Visual Storyboard & Beats
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="relative border-l border-neutral-800 ml-3 space-y-6 pb-2">
                                                {(analysis.beats || []).map((beat, idx) => (
                                                    <div key={idx} className="ml-6 relative group">
                                                        <div className="absolute -left-[31px] mt-1.5 w-3 h-3 rounded-full bg-neutral-800 border border-neutral-600 group-hover:bg-primary group-hover:border-primary transition-colors" />
                                                        <div className="p-4 rounded-lg bg-neutral-900/50 hover:bg-neutral-800/50 transition-colors border border-neutral-800 hover:border-neutral-700">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                                                                    {beat.start} - {beat.end}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-neutral-200 font-medium">{beat.summary}</p>
                                                            {beat.why_it_works && (
                                                                <p className="text-xs text-neutral-500 mt-2 pt-2 border-t border-neutral-800/50">
                                                                    💡 <span className="italic">{beat.why_it_works}</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!analysis.beats || analysis.beats.length === 0) && (
                                                    <div className="text-center text-neutral-500 py-8 ml-[-12px]">Timeline data not available.</div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Storyboard Visuals (if available) */}
                                    {analysis.storyboard && analysis.storyboard.length > 0 && (
                                        <Card className="border-neutral-800 bg-neutral-900/30">
                                            <CardHeader>
                                                <CardTitle>Visual Sequence</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    {analysis.storyboard.map((scene, i) => (
                                                        <div key={i} className="space-y-2">
                                                            <div className="aspect-video bg-neutral-950 rounded-lg flex items-center justify-center border border-neutral-800">
                                                                <ImageIcon className="w-6 h-6 text-neutral-700" />
                                                            </div>
                                                            <p className="text-xs text-neutral-400 line-clamp-2">{scene}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </>
                            ) : (
                                <div className="h-96 flex flex-col items-center justify-center border border-dashed border-neutral-800 rounded-xl bg-neutral-900/20">
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                                            <p className="text-neutral-300 font-medium">Analyzing video content...</p>
                                            <p className="text-neutral-500 text-sm mt-2">Extracting script, beats, and visual style</p>
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="w-12 h-12 text-neutral-500 mb-4" />
                                            <h3 className="text-xl font-semibold text-white mb-2">Deep Analysis</h3>
                                            <p className="text-neutral-400 text-sm max-w-sm text-center mb-6">
                                                Generate insights, transcript, and creative breakdown for this ad.
                                            </p>
                                            <Button 
                                                onClick={() => {
                                                    if (adResult?.video_urls[0] && adResult?.ad_id) {
                                                        handleAnalyze(adResult.ad_id, adResult.video_urls[0]);
                                                    } else {
                                                        toast.error("No video available to analyze");
                                                    }
                                                }}
                                                disabled={!adResult?.video_urls[0]}
                                            >
                                                Start Analysis
                                            </Button>
                                        </>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="prompts" className="space-y-4">
                            <Card className="border-neutral-800 bg-neutral-900/30">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle>Generative Prompts</CardTitle>
                                        <CardDescription>AI-suggested prompts to recreate this video's style</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {analysis?.generation_prompts?.map((prompt, idx) => (
                                        <div key={idx} className="group p-4 rounded-lg bg-neutral-950/50 border border-neutral-800 hover:border-primary/50 transition-all">
                                            <div className="flex justify-between gap-4">
                                                <p className="text-sm text-neutral-300 font-mono leading-relaxed">{prompt}</p>
                                                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-neutral-800" title="Copy" onClick={() => {
                                                        navigator.clipboard.writeText(prompt);
                                                        toast.success("Copied to clipboard");
                                                    }}>
                                                        <Copy className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-purple-400 hover:text-purple-300 hover:bg-purple-900/20" title="Send to Veo">
                                                        <Film className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )) || <div className="text-center py-12 text-neutral-500">Analyze a video to generate prompts.</div>}
                                </CardContent>
                            </Card>
                        </TabsContent>

                         <TabsContent value="veo">
                            <div className="flex flex-col items-center justify-center min-h-[300px] border border-dashed border-neutral-800 rounded-xl bg-neutral-900/20 text-center p-8">
                                <Film className="w-16 h-16 text-neutral-700 mb-4" />
                                <h3 className="text-lg font-medium text-neutral-300">Veo Video Generation</h3>
                                <p className="text-sm text-neutral-500 max-w-md mt-2 mb-6">
                                    Use the analyzed prompts to generate new high-quality video variants using Google's Veo model.
                                </p>
                                <Button variant="outline">Initialize Veo Studio</Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="chat" className="h-[600px]">
                             <div className="h-full flex flex-col border border-neutral-800 rounded-xl bg-neutral-900/30 overflow-hidden">
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {chatMessages.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-neutral-500 flex-col gap-2">
                                            <MessageSquare className="w-8 h-8 opacity-20" />
                                            <p>Ask questions about the ad analysis...</p>
                                        </div>
                                    ) : (
                                        chatMessages.map((msg, i) => (
                                            <div key={i} className={cn(
                                                "max-w-[80%] p-3 rounded-lg text-sm leading-relaxed",
                                                msg.role === "user" 
                                                    ? "bg-primary text-primary-foreground ml-auto rounded-br-none" 
                                                    : "bg-neutral-800 text-neutral-200 mr-auto rounded-bl-none"
                                            )}>
                                                {msg.text}
                                            </div>
                                        ))
                                    )}
                                    {chatLoading && (
                                        <div className="flex items-center gap-2 text-xs text-neutral-500 p-2">
                                            <Loader2 className="w-3 h-3 animate-spin" /> AI is typing...
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 border-t border-neutral-800 bg-neutral-900/50">
                                    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); handleChatSubmit(); }}>
                                        <Input 
                                            placeholder="Ask about the video style, hook, or pacing..." 
                                            className="bg-neutral-950 border-neutral-800" 
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            disabled={chatLoading || !analysis}
                                        />
                                        <Button size="icon" type="submit" disabled={chatLoading || !analysis}>
                                            <MessageSquare className="w-4 h-4" />
                                        </Button>
                                    </form>
                                </div>
                             </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        ) : (
            renderEmptyState()
        )}

        <Separator className="bg-neutral-800/50 my-8" />

        {/* History Carousel Section */}
        <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
                <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <History className="w-5 h-5 text-neutral-400" />
                        Recent Downloads
                    </h2>
                    <p className="text-sm text-neutral-500 mt-1">Your library of analyzed ads</p>
                </div>
                <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white" onClick={() => loadHistory()}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
            </div>
            
            {historyLoading ? (
                <div className="flex gap-4 overflow-hidden">
                    {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="w-[200px] aspect-[9/16] bg-neutral-900/30 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="w-full overflow-x-auto whitespace-nowrap rounded-xl border border-neutral-800/30 bg-neutral-900/10 p-4 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
                    <div className="flex space-x-4 pb-4">
                        {history.map(item => (
                            <HistoryCard 
                                key={item.id} 
                                item={item} 
                                onClick={() => handleHistoryItemClick(item)}
                                onDelete={() => {
                                    adsApi.deleteDownloadHistory(item.id).then(() => loadHistory());
                                }}
                            />
                        ))}
                        {history.length === 0 && (
                            <div className="w-full text-center py-12 text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
                                No history yet. Analyze an ad to get started.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </DashboardLayout>
  );
}
