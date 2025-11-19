"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_PREFIX = "/api/v1";

interface AISystemInstruction {
  system_instruction: string;
  source: string;
}

interface VeoSandboxApiKey {
  api_key: string;
}

interface VeoToken {
  token: string;
}

interface VeoSessionCookie {
  cookie: string;
}

interface GeminiApiKeys {
  keys: string[];
}

interface OpenRouterApiKey {
  api_key: string;
}

export default function SettingsPage() {
  const [value, setValue] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(false);

  const [geminiKeys, setGeminiKeys] = useState<string[]>([]);
  const [newGeminiKey, setNewGeminiKey] = useState<string>("");
  const [geminiKeysLoading, setGeminiKeysLoading] = useState<boolean>(false);
  const [geminiKeysSaving, setGeminiKeysSaving] = useState<boolean>(false);
  const [geminiKeysError, setGeminiKeysError] = useState<string | null>(null);
  const [geminiKeysSaved, setGeminiKeysSaved] = useState<boolean>(false);
  const [testingKeyIndex, setTestingKeyIndex] = useState<number | null>(null);

  const [openrouterApiKey, setOpenrouterApiKey] = useState<string>("");
  const [openrouterKeyLoading, setOpenrouterKeyLoading] = useState<boolean>(false);
  const [openrouterKeySaving, setOpenrouterKeySaving] = useState<boolean>(false);
  const [openrouterKeyError, setOpenrouterKeyError] = useState<string | null>(null);
  const [openrouterKeySaved, setOpenrouterKeySaved] = useState<boolean>(false);

  const [veoApiKey, setVeoApiKey] = useState<string>("");
  const [veoKeyLoading, setVeoKeyLoading] = useState<boolean>(false);
  const [veoKeySaving, setVeoKeySaving] = useState<boolean>(false);
  const [veoKeyError, setVeoKeyError] = useState<string | null>(null);
  const [veoKeySaved, setVeoKeySaved] = useState<boolean>(false);

  const [veoToken, setVeoToken] = useState<string>("");
  const [veoTokenLoading, setVeoTokenLoading] = useState<boolean>(false);
  const [veoTokenSaving, setVeoTokenSaving] = useState<boolean>(false);
  const [veoTokenError, setVeoTokenError] = useState<string | null>(null);
  const [veoTokenSaved, setVeoTokenSaved] = useState<boolean>(false);

  const [veoSessionCookie, setVeoSessionCookie] = useState<string>("");
  const [veoSessionCookieLoading, setVeoSessionCookieLoading] = useState<boolean>(false);
  const [veoSessionCookieSaving, setVeoSessionCookieSaving] = useState<boolean>(false);
  const [veoSessionCookieError, setVeoSessionCookieError] = useState<string | null>(null);
  const [veoSessionCookieSaved, setVeoSessionCookieSaved] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/system-instruction`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || `HTTP ${res.status}`);
        }
        const data: AISystemInstruction = await res.json();
        setValue(data.system_instruction || "");
        setSource(data.source || "");
      } catch (e: any) {
        setError(e?.message || "Failed to load system instruction");
      } finally {
        setLoading(false);
      }
    };
    const loadVeoKey = async () => {
      try {
        setVeoKeyLoading(true);
        setVeoKeyError(null);
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo-sandbox-api-key`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || `HTTP ${res.status}`);
        }
        const data: VeoSandboxApiKey = await res.json();
        setVeoApiKey(data.api_key || "");
      } catch (e: any) {
        setVeoKeyError(e?.message || "Failed to load Veo sandbox API key");
      } finally {
        setVeoKeyLoading(false);
      }
    };
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
        setVeoTokenError(e?.message || "Failed to load Veo access token");
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
    const loadGeminiKeys = async () => {
      try {
        setGeminiKeysLoading(true);
        setGeminiKeysError(null);
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/gemini-api-keys`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || `HTTP ${res.status}`);
        }
        const data: GeminiApiKeys = await res.json();
        setGeminiKeys(data.keys || []);
      } catch (e: any) {
        setGeminiKeysError(e?.message || "Failed to load Gemini API keys");
      } finally {
        setGeminiKeysLoading(false);
      }
    };
    const loadOpenrouterKey = async () => {
      try {
        setOpenrouterKeyLoading(true);
        setOpenrouterKeyError(null);
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/openrouter-api-key`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || `HTTP ${res.status}`);
        }
        const data: OpenRouterApiKey = await res.json();
        setOpenrouterApiKey(data.api_key || "");
      } catch (e: any) {
        setOpenrouterKeyError(e?.message || "Failed to load OpenRouter API key");
      } finally {
        setOpenrouterKeyLoading(false);
      }
    };
    load();
    loadVeoKey();
    loadVeoToken();
    loadVeoSessionCookie();
    loadGeminiKeys();
    loadOpenrouterKey();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaved(false);
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/system-instruction`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system_instruction: value, source: "db" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      const data: AISystemInstruction = await res.json();
      setValue(data.system_instruction || "");
      setSource(data.source || "db");
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e: any) {
      setError(e?.message || "Failed to save system instruction");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVeoKey = async () => {
    try {
      setVeoKeySaving(true);
      setVeoKeyError(null);
      setVeoKeySaved(false);
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo-sandbox-api-key`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: veoApiKey }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      const data: VeoSandboxApiKey = await res.json();
      setVeoApiKey(data.api_key || "");
      setVeoKeySaved(true);
      setTimeout(() => setVeoKeySaved(false), 1500);
    } catch (e: any) {
      setVeoKeyError(e?.message || "Failed to save Veo sandbox API key");
    } finally {
      setVeoKeySaving(false);
    }
  };

  const handleSaveVeoToken = async () => {
    try {
      setVeoTokenSaving(true);
      setVeoTokenError(null);
      setVeoTokenSaved(false);
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/veo-token`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: veoToken }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      const data: VeoToken = await res.json();
      setVeoToken(data.token || "");
      setVeoTokenSaved(true);
      setTimeout(() => setVeoTokenSaved(false), 1500);
    } catch (e: any) {
      setVeoTokenError(e?.message || "Failed to save Veo access token");
    } finally {
      setVeoTokenSaving(false);
    }
  };

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

  const handleAddGeminiKey = async () => {
    if (!newGeminiKey.trim()) return;
    
    // Test key first
    try {
      setTestingKeyIndex(-1);
      const testRes = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/gemini-api-keys/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newGeminiKey.trim() }),
      });
      const testData = await testRes.json();
      
      if (!testData.is_valid) {
        setGeminiKeysError(`Invalid key: ${testData.error || "Unknown error"}`);
        setTestingKeyIndex(null);
        return;
      }
    } catch (e: any) {
      setGeminiKeysError(`Failed to test key: ${e.message}`);
      setTestingKeyIndex(null);
      return;
    }
    
    setTestingKeyIndex(null);
    const updatedKeys = [...geminiKeys, newGeminiKey.trim()];
    await saveGeminiKeys(updatedKeys);
    setNewGeminiKey("");
  };

  const handleDeleteGeminiKey = async (index: number) => {
    const updatedKeys = geminiKeys.filter((_, i) => i !== index);
    await saveGeminiKeys(updatedKeys);
  };

  const handleTestGeminiKey = async (index: number) => {
    setTestingKeyIndex(index);
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/gemini-api-keys/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: geminiKeys[index] }),
      });
      const data = await res.json();
      
      if (data.is_valid) {
        alert(data.error || "✅ Key is valid!");
      } else {
        alert(`❌ Key is invalid: ${data.error}`);
      }
    } catch (e: any) {
      alert(`❌ Test failed: ${e.message}`);
    } finally {
      setTestingKeyIndex(null);
    }
  };

  const saveGeminiKeys = async (keys: string[]) => {
    try {
      setGeminiKeysSaving(true);
      setGeminiKeysError(null);
      setGeminiKeysSaved(false);
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/gemini-api-keys`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      const data: GeminiApiKeys = await res.json();
      setGeminiKeys(data.keys || []);
      setGeminiKeysSaved(true);
      setTimeout(() => setGeminiKeysSaved(false), 1500);
    } catch (e: any) {
      setGeminiKeysError(e?.message || "Failed to save Gemini API keys");
    } finally {
      setGeminiKeysSaving(false);
    }
  };

  const maskKey = (key: string) => {
    if (key.length <= 12) return key;
    return `${key.substring(0, 8)}****...****${key.substring(key.length - 8)}`;
  };

  const handleSaveOpenrouterKey = async () => {
    try {
      setOpenrouterKeySaving(true);
      setOpenrouterKeyError(null);
      setOpenrouterKeySaved(false);
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/openrouter-api-key`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: openrouterApiKey }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      const data: OpenRouterApiKey = await res.json();
      setOpenrouterApiKey(data.api_key || "");
      setOpenrouterKeySaved(true);
      setTimeout(() => setOpenrouterKeySaved(false), 1500);
    } catch (e: any) {
      setOpenrouterKeyError(e?.message || "Failed to save OpenRouter API key");
    } finally {
      setOpenrouterKeySaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure AI behavior for transcript and generation prompts.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gemini System Instruction</CardTitle>
            <CardDescription>
              This prompt controls how the AI analyzes videos and generates prompts with perfect continuity tracking. 
              The AI now tracks every element (people, environment, props, positions) across all prompts to ensure 100% consistency when clips are merged. 
              You can customize the instruction here without changing code.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {source && (
              <div className="text-xs text-neutral-400">
                Loaded from: <span className="font-mono">{source}</span>
              </div>
            )}
            {error && (
              <div className="text-xs text-red-400 border border-red-500/40 rounded-md p-2 bg-red-500/5">
                {error}
              </div>
            )}
            <textarea
              className="w-full min-h-[320px] text-xs leading-relaxed bg-neutral-900 border border-neutral-800 rounded-md text-neutral-100 font-mono p-3 whitespace-pre-wrap"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={loading || saving}
            />
            <div className="flex items-center gap-3 justify-between mt-2">
              <div className="text-xs text-neutral-500">
                Changes will apply to the next analysis / prompt generation call. The instruction includes continuity tracking for seamless clip merging.
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={loading || saving}
                  className="px-4 py-1.5 text-sm"
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
                {saved && (
                  <span className="text-xs text-emerald-400">Saved</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gemini API Keys</CardTitle>
            <CardDescription>
              Manage multiple Gemini API keys. The system will automatically rotate through keys if one hits rate limits (503/429 errors).
              Keys are tried in order until one succeeds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {geminiKeysError && (
              <div className="text-xs text-red-400 border border-red-500/40 rounded-md p-2 bg-red-500/5">
                {geminiKeysError}
              </div>
            )}
            
            {/* Existing Keys List */}
            <div className="space-y-2">
              {geminiKeys.length === 0 && !geminiKeysLoading && (
                <div className="text-xs text-neutral-500 italic">
                  No API keys configured. Add one below.
                </div>
              )}
              {geminiKeys.map((key, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-neutral-900 border border-neutral-800 rounded-md"
                >
                  <span className="flex-1 text-xs font-mono text-neutral-300">
                    {index + 1}. {maskKey(key)}
                  </span>
                  <Button
                    type="button"
                    onClick={() => handleTestGeminiKey(index)}
                    disabled={testingKeyIndex === index || geminiKeysSaving}
                    className="px-2 py-1 text-xs"
                    variant="outline"
                  >
                    {testingKeyIndex === index ? "Testing..." : "Test"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleDeleteGeminiKey(index)}
                    disabled={geminiKeysSaving}
                    className="px-2 py-1 text-xs"
                    variant="destructive"
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>

            {/* Add New Key */}
            <div className="flex gap-2 pt-2 border-t border-neutral-800">
              <input
                type="text"
                className="flex-1 text-xs bg-neutral-900 border border-neutral-800 rounded-md text-neutral-100 font-mono p-2"
                value={newGeminiKey}
                onChange={(e) => setNewGeminiKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddGeminiKey()}
                disabled={geminiKeysLoading || geminiKeysSaving || testingKeyIndex === -1}
                placeholder="AIzaSy... (paste new API key)"
              />
              <Button
                type="button"
                onClick={handleAddGeminiKey}
                disabled={!newGeminiKey.trim() || geminiKeysSaving || testingKeyIndex === -1}
                className="px-4 py-1.5 text-sm"
              >
                {testingKeyIndex === -1 ? "Testing..." : "Add Key"}
              </Button>
            </div>

            <div className="flex items-center gap-3 justify-between pt-2">
              <div className="text-xs text-neutral-500">
                Keys are tested before adding. System auto-rotates on 503/429 errors.
              </div>
              {geminiKeysSaved && (
                <span className="text-xs text-emerald-400">Saved</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OpenRouter API Key (Fallback Provider)</CardTitle>
            <CardDescription>
              OpenRouter provides access to Gemini 2.5 Flash and other models.
              Used as fallback when all direct Gemini keys fail. Free tier available.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {openrouterKeyError && (
              <div className="text-xs text-red-400 border border-red-500/40 rounded-md p-2 bg-red-500/5">
                {openrouterKeyError}
              </div>
            )}
            <input
              type="text"
              className="w-full text-xs bg-neutral-900 border border-neutral-800 rounded-md text-neutral-100 font-mono p-2"
              value={openrouterApiKey}
              onChange={(e) => setOpenrouterApiKey(e.target.value)}
              disabled={openrouterKeyLoading || openrouterKeySaving}
              placeholder="sk-or-v1-..."
            />
            <div className="flex items-center gap-3 justify-between mt-2">
              <div className="text-xs text-neutral-500">
                Get your API key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">openrouter.ai</a>. 
                Automatically used when Gemini is unavailable.
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleSaveOpenrouterKey}
                  disabled={openrouterKeyLoading || openrouterKeySaving}
                  className="px-4 py-1.5 text-sm"
                >
                  {openrouterKeySaving ? "Saving…" : "Save"}
                </Button>
                {openrouterKeySaved && (
                  <span className="text-xs text-emerald-400">Saved</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Veo Sandbox API Key</CardTitle>
            <CardDescription>
              Google AI Sandbox API key used for fetching Veo credits. This is stored in backend settings and used
              server-side only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {veoKeyError && (
              <div className="text-xs text-red-400 border border-red-500/40 rounded-md p-2 bg-red-500/5">
                {veoKeyError}
              </div>
            )}
            <input
              type="text"
              className="w-full text-xs bg-neutral-900 border border-neutral-800 rounded-md text-neutral-100 font-mono p-2"
              value={veoApiKey}
              onChange={(e) => setVeoApiKey(e.target.value)}
              disabled={veoKeyLoading || veoKeySaving}
              placeholder="AIzaSy..."
            />
            <div className="flex items-center gap-3 justify-between mt-2">
              <div className="text-xs text-neutral-500">
                This key is required for Veo credits display. Keep it secret and rotate if compromised.
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleSaveVeoKey}
                  disabled={veoKeyLoading || veoKeySaving}
                  className="px-4 py-1.5 text-sm"
                >
                  {veoKeySaving ? "Saving…" : "Save"}
                </Button>
                {veoKeySaved && (
                  <span className="text-xs text-emerald-400">Saved</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Veo Labs Session Cookie</CardTitle>
            <CardDescription>
              Full browser session cookie string or fetch() snippet used to obtain a fresh Veo access token from Google Labs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {veoSessionCookieError && (
              <div className="text-xs text-red-400 border border-red-500/40 rounded-md p-2 bg-red-500/5">
                {veoSessionCookieError}
              </div>
            )}
            <textarea
              className="w-full min-h-[120px] text-xs bg-neutral-900 border border-neutral-800 rounded-md text-neutral-100 font-mono p-2 whitespace-pre-wrap"
              value={veoSessionCookie}
              onChange={(e) => setVeoSessionCookie(e.target.value)}
              disabled={veoSessionCookieLoading || veoSessionCookieSaving}
              placeholder="Paste Cookie header or full fetch(...) snippet here"
            />
            <div className="flex items-center gap-3 justify-between mt-2">
              <div className="text-xs text-neutral-500">
                This value is stored server-side and used to refresh the Veo access token automatically.
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleSaveVeoSessionCookie}
                  disabled={veoSessionCookieLoading || veoSessionCookieSaving}
                  className="px-4 py-1.5 text-sm"
                >
                  {veoSessionCookieSaving ? "Saving" : "Save"}
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
            <CardTitle>Veo Access Token</CardTitle>
            <CardDescription>
              Bearer token currently used for Veo API calls. Normally refreshed from the Labs session cookie, but can be overridden here for debugging.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {veoTokenError && (
              <div className="text-xs text-red-400 border border-red-500/40 rounded-md p-2 bg-red-500/5">
                {veoTokenError}
              </div>
            )}
            <input
              type="text"
              className="w-full text-xs bg-neutral-900 border border-neutral-800 rounded-md text-neutral-100 font-mono p-2"
              value={veoToken}
              onChange={(e) => setVeoToken(e.target.value)}
              disabled={veoTokenLoading || veoTokenSaving}
              placeholder="Bearer eyJhbGciOi..."
            />
            <div className="flex items-center gap-3 justify-between mt-2">
              <div className="text-xs text-neutral-500">
                Stored server-side for Veo API requests. Updating this will override the auto-refreshed token until it is rotated again.
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleSaveVeoToken}
                  disabled={veoTokenLoading || veoTokenSaving}
                  className="px-4 py-1.5 text-sm"
                >
                  {veoTokenSaving ? "Saving" : "Save"}
                </Button>
                {veoTokenSaved && (
                  <span className="text-xs text-emerald-400">Saved</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
