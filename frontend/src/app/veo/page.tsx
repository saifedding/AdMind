"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_PREFIX = "/api/v1";

interface VeoToken {
  token: string;
}

interface VeoSessionCookie {
  cookie: string;
}

interface VeoGenerateResponse {
  success: boolean;
  result?: any;
  error?: string;
  video_url?: string | null;
}

export default function VeoPage() {
  const [veoToken, setVeoToken] = useState<string>("");
  const [veoTokenLoading, setVeoTokenLoading] = useState<boolean>(false);
  const [veoTokenError, setVeoTokenError] = useState<string | null>(null);

  const [veoSessionCookie, setVeoSessionCookie] = useState<string>("");
  const [veoSessionCookieLoading, setVeoSessionCookieLoading] = useState<boolean>(false);
  const [veoSessionCookieSaving, setVeoSessionCookieSaving] = useState<boolean>(false);
  const [veoSessionCookieError, setVeoSessionCookieError] = useState<string | null>(null);
  const [veoSessionCookieSaved, setVeoSessionCookieSaved] = useState<boolean>(false);

  const [veoPrompt, setVeoPrompt] = useState<string>("");
  const [veoAspectRatio, setVeoAspectRatio] = useState<string>("VIDEO_ASPECT_RATIO_PORTRAIT");
  const [veoModelKey, setVeoModelKey] = useState<string>("veo_3_1_t2v_fast_portrait_ultra");
  const [veoGenerating, setVeoGenerating] = useState<boolean>(false);
  const [veoGenerateError, setVeoGenerateError] = useState<string | null>(null);
  const [veoResult, setVeoResult] = useState<VeoGenerateResponse | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadVeoToken = async () => {
      try {
        setVeoTokenLoading(true);
        setVeoTokenError(null);
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo-token`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || `HTTP ${res.status}`);
        }
        const data: VeoToken = await res.json();
        setVeoToken(data.token || "");
      } catch (e: any) {
        setVeoTokenError(e?.message || "Failed to load Veo token");
      } finally {
        setVeoTokenLoading(false);
      }
    };

    const loadVeoSessionCookie = async () => {
      try {
        setVeoSessionCookieLoading(true);
        setVeoSessionCookieError(null);
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo-session-cookie`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || `HTTP ${res.status}`);
        }
        const data: VeoSessionCookie = await res.json();
        setVeoSessionCookie(data.cookie || "");
      } catch (e: any) {
        setVeoSessionCookieError(e?.message || "Failed to load Veo session cookie");
      } finally {
        setVeoSessionCookieLoading(false);
      }
    };

    loadVeoToken();
    loadVeoSessionCookie();
  }, []);

  const handleSaveVeoSessionCookie = async () => {
    try {
      setVeoSessionCookieSaving(true);
      setVeoSessionCookieError(null);
      setVeoSessionCookieSaved(false);
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo-session-cookie`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie: veoSessionCookie }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      const data: VeoSessionCookie = await res.json();
      setVeoSessionCookie(data.cookie || "");
      setVeoSessionCookieSaved(true);
      setTimeout(() => setVeoSessionCookieSaved(false), 1500);
    } catch (e: any) {
      setVeoSessionCookieError(e?.message || "Failed to save Veo session cookie");
    } finally {
      setVeoSessionCookieSaving(false);
    }
  };

  const handleGenerateVeoVideo = async () => {
    try {
      setVeoGenerating(true);
      setVeoGenerateError(null);
      setVeoResult(null);
      setVideoUrl(null);
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo/generate-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: veoPrompt,
          aspect_ratio: veoAspectRatio,
          video_model_key: veoModelKey,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      const data: VeoGenerateResponse = await res.json();
      setVeoResult(data);
      if (data.video_url) {
        setVideoUrl(data.video_url);
      }
    } catch (e: any) {
      setVeoGenerateError(e?.message || "Failed to generate Veo video");
    } finally {
      setVeoGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Veo Video Generator</h1>
          <p className="text-sm text-muted-foreground">
            Generate Veo videos from a detailed creative brief, with model and aspect ratio controls.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Veo Access Token</CardTitle>
            <CardDescription>
              The current Veo Bearer token as seen by the backend. This is derived automatically from the Labs session
              cookie and is shown here for debugging only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {veoTokenError && (
              <div className="text-xs text-red-400 border border-red-500/40 rounded-md p-2 bg-red-500/5">
                {veoTokenError}
              </div>
            )}
            <textarea
              className="w-full min-h-[80px] text-xs leading-relaxed bg-neutral-900 border border-neutral-800 rounded-md text-neutral-100 font-mono p-3 whitespace-pre-wrap"
              value={veoToken}
              onChange={(e) => setVeoToken(e.target.value)}
              disabled={true}
              placeholder="Token will appear here after a successful Labs session call..."
            />
            <div className="flex items-center gap-3 justify-between mt-2">
              <div className="text-xs text-neutral-500">
                This field is read-only. To change the token, update the Labs session cookie below so the backend can
                refresh it.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Veo Labs Session Cookie</CardTitle>
            <CardDescription>
              Paste the full Cookie header used for labs.google (from your browser dev tools). The backend uses this to
              refresh the Veo access token via the Labs session endpoint.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {veoSessionCookieError && (
              <div className="text-xs text-red-400 border border-red-500/40 rounded-md p-2 bg-red-500/5">
                {veoSessionCookieError}
              </div>
            )}
            <textarea
              className="w-full min-h-[80px] text-xs leading-relaxed bg-neutral-900 border border-neutral-800 rounded-md text-neutral-100 font-mono p-3 whitespace-pre-wrap"
              value={veoSessionCookie}
              onChange={(e) => setVeoSessionCookie(e.target.value)}
              disabled={veoSessionCookieLoading || veoSessionCookieSaving}
              placeholder="SID=...; HSID=...; other_cookies=..."
            />
            <div className="flex items-center gap-3 justify-between mt-2">
              <div className="text-xs text-neutral-500">
                This cookie is stored only in backend settings and used server-side to call the Labs auth/session API.
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleSaveVeoSessionCookie}
                  disabled={veoSessionCookieLoading || veoSessionCookieSaving}
                  className="px-4 py-1.5 text-sm"
                >
                  {veoSessionCookieSaving ? "Saving…" : "Save"}
                </Button>
                {veoSessionCookieSaved && (
                  <span className="text-xs text-emerald-400">Saved</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generate Veo Video from Prompt</CardTitle>
            <CardDescription>
              Paste a creative brief and trigger Veo text-to-video generation. The result video will be shown below when ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {veoGenerateError && (
              <div className="text-xs text-red-400 border border-red-500/40 rounded-md p-2 bg-red-500/5">
                {veoGenerateError}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-neutral-400">Aspect Ratio</div>
                <Select
                  value={veoAspectRatio}
                  onValueChange={(value) => setVeoAspectRatio(value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIDEO_ASPECT_RATIO_PORTRAIT">
                      Portrait (9:16)
                    </SelectItem>
                    <SelectItem value="VIDEO_ASPECT_RATIO_LANDSCAPE">
                      Landscape (16:9)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-neutral-400">Model</div>
                <Select
                  value={veoModelKey}
                  onValueChange={(value) => setVeoModelKey(value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veo_3_1_t2v_fast_portrait_ultra">
                      veo_3_1_t2v_fast_portrait_ultra
                    </SelectItem>
                    <SelectItem value="veo_3_1_t2v_portrait">
                      veo_3_1_t2v_portrait
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <textarea
              className="w-full min-h-[260px] text-xs leading-relaxed bg-neutral-900 border border-neutral-800 rounded-md text-neutral-100 font-mono p-3 whitespace-pre-wrap"
              value={veoPrompt}
              onChange={(e) => setVeoPrompt(e.target.value)}
              disabled={veoGenerating}
              placeholder="Paste your Veo creative brief here..."
            />
            <div className="flex items-center gap-3 justify-between mt-2">
              <div className="text-xs text-neutral-500">
                Generation may take some time. The backend will poll Veo until the video is ready or a timeout occurs.
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleGenerateVeoVideo}
                  disabled={veoGenerating || !veoPrompt.trim()}
                  className="px-4 py-1.5 text-sm"
                >
                  {veoGenerating ? "Generating…" : "Generate Video"}
                </Button>
              </div>
            </div>

            {videoUrl && (
              <div className="mt-4 space-y-2">
                <div className="text-xs text-neutral-400">Generated Video</div>
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-400 underline break-all"
                >
                  {videoUrl}
                </a>
                <video
                  controls
                  src={videoUrl}
                  className="w-full max-w-xl mt-2 rounded-md border border-neutral-800 bg-black"
                />
              </div>
            )}

            {veoResult && (
              <div className="mt-4">
                <div className="text-xs text-neutral-400 mb-1">Raw result JSON (debug):</div>
                <pre className="w-full max-h-[320px] overflow-auto text-xs bg-neutral-950 border border-neutral-800 rounded-md text-neutral-100 font-mono p-3">
                  {JSON.stringify(veoResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
