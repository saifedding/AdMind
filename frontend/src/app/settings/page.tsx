"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace("localhost", "127.0.0.1");
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

interface AiModelSetting {
  model_name: string;
}

interface CacheInfo {
  cache_name: string;
  expire_time?: string;
  model?: string;
  display_name?: string;
}

interface CacheStats {
  key_index: number;
  key_preview: string;
  cache_count: number;
  caches: CacheInfo[];
  error?: string;
}

interface AllCachesResponse {
  total_caches: number;
  keys_stats: CacheStats[];
}

interface DeleteCachesResponse {
  success: boolean;
  deleted_count: number;
  failed_count: number;
  cleared_db_metadata: number;
  message: string;
}

interface CacheEnabledSetting {
  enabled: boolean;
}

interface CacheTTLSetting {
  ttl_hours: number;
}

interface KeyUsageStats {
  key_index: number;
  key_preview: string;
  total_requests: number;
  total_prompt_tokens: number;
  total_cached_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  last_used?: string;
}

interface AllKeysUsageResponse {
  keys_stats: KeyUsageStats[];
  total_requests: number;
  total_cost_usd: number;
}

interface ModelUsageStats {
  model_name: string;
  provider: string;
  total_requests: number;
  total_prompt_tokens: number;
  total_cached_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  last_used?: string;
}

interface AllModelsUsageResponse {
  models_stats: ModelUsageStats[];
  total_requests: number;
  total_cost_usd: number;
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

  const [aiModel, setAiModel] = useState<string>("gemini-2.5-flash-lite");
  const [aiModelLoading, setAiModelLoading] = useState<boolean>(false);
  const [aiModelSaving, setAiModelSaving] = useState<boolean>(false);
  const [aiModelError, setAiModelError] = useState<string | null>(null);
  const [aiModelSaved, setAiModelSaved] = useState<boolean>(false);

  const [cacheData, setCacheData] = useState<AllCachesResponse | null>(null);
  const [cacheLoading, setCacheLoading] = useState<boolean>(false);
  const [cacheError, setCacheError] = useState<string | null>(null);
  const [cacheDeleting, setCacheDeleting] = useState<boolean>(false);
  
  const [cacheEnabled, setCacheEnabled] = useState<boolean>(true);
  const [cacheEnabledLoading, setCacheEnabledLoading] = useState<boolean>(false);
  const [cacheEnabledSaving, setCacheEnabledSaving] = useState<boolean>(false);
  const [cacheEnabledError, setCacheEnabledError] = useState<string | null>(null);
  const [cacheEnabledSaved, setCacheEnabledSaved] = useState<boolean>(false);

  const [cacheTTL, setCacheTTL] = useState<number>(24);
  const [cacheTTLLoading, setCacheTTLLoading] = useState<boolean>(false);
  const [cacheTTLSaving, setCacheTTLSaving] = useState<boolean>(false);
  const [cacheTTLError, setCacheTTLError] = useState<string | null>(null);
  const [cacheTTLSaved, setCacheTTLSaved] = useState<boolean>(false);

  const [usageData, setUsageData] = useState<AllKeysUsageResponse | null>(null);
  const [usageLoading, setUsageLoading] = useState<boolean>(false);
  const [usageError, setUsageError] = useState<string | null>(null);

  const [modelUsageData, setModelUsageData] = useState<AllModelsUsageResponse | null>(null);
  const [modelUsageLoading, setModelUsageLoading] = useState<boolean>(false);
  const [modelUsageError, setModelUsageError] = useState<string | null>(null);

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
    const loadAiModel = async () => {
      try {
        setAiModelLoading(true);
        setAiModelError(null);
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/model`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || `HTTP ${res.status}`);
        }
        const data: AiModelSetting = await res.json();
        setAiModel(data.model_name || "gemini-2.5-flash-lite");
      } catch (e: any) {
        setAiModelError(e?.message || "Failed to load AI model");
      } finally {
        setAiModelLoading(false);
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
    const loadCacheEnabled = async () => {
      try {
        setCacheEnabledLoading(true);
        setCacheEnabledError(null);
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/cache-enabled`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || `HTTP ${res.status}`);
        }
        const data: CacheEnabledSetting = await res.json();
        setCacheEnabled(data.enabled);
      } catch (e: any) {
        setCacheEnabledError(e?.message || "Failed to load cache enabled setting");
      } finally {
        setCacheEnabledLoading(false);
      }
    };
    const loadCacheTTL = async () => {
      try {
        setCacheTTLLoading(true);
        setCacheTTLError(null);
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/cache-ttl`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || `HTTP ${res.status}`);
        }
        const data: CacheTTLSetting = await res.json();
        setCacheTTL(data.ttl_hours);
      } catch (e: any) {
        setCacheTTLError(e?.message || "Failed to load cache TTL setting");
      } finally {
        setCacheTTLLoading(false);
      }
    };
    load();
    loadVeoKey();
    loadVeoToken();
    loadVeoSessionCookie();
    loadGeminiKeys();
    loadOpenrouterKey();
    loadAiModel();
    loadCacheEnabled();
    loadCacheTTL();
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

  const handleSaveAiModel = async () => {
    try {
      setAiModelSaving(true);
      setAiModelError(null);
      setAiModelSaved(false);
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/model`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_name: aiModel }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      const data: AiModelSetting = await res.json();
      setAiModel(data.model_name || "gemini-2.5-flash-lite");
      setAiModelSaved(true);
      setTimeout(() => setAiModelSaved(false), 1500);
    } catch (e: any) {
      setAiModelError(e?.message || "Failed to save AI model");
    } finally {
      setAiModelSaving(false);
    }
  };

  const loadCacheData = async () => {
    try {
      setCacheLoading(true);
      setCacheError(null);
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/gemini-caches`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      const data: AllCachesResponse = await res.json();
      setCacheData(data);
    } catch (e: any) {
      setCacheError(e?.message || "Failed to load cache data");
    } finally {
      setCacheLoading(false);
    }
  };

  const handleDeleteAllCaches = async () => {
    if (!confirm("⚠️ This will DELETE ALL Gemini caches and stop storage billing. Continue?")) {
      return;
    }

    try {
      setCacheDeleting(true);
      setCacheError(null);
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/gemini-caches`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      const data: DeleteCachesResponse = await res.json();
      alert(`✅ ${data.message}`);
      // Reload cache data
      await loadCacheData();
    } catch (e: any) {
      setCacheError(e?.message || "Failed to delete caches");
      alert(`❌ Failed to delete caches: ${e?.message}`);
    } finally {
      setCacheDeleting(false);
    }
  };

  const handleToggleCacheEnabled = async () => {
    try {
      setCacheEnabledSaving(true);
      setCacheEnabledError(null);
      setCacheEnabledSaved(false);
      const newValue = !cacheEnabled;
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/cache-enabled`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newValue }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      const data: CacheEnabledSetting = await res.json();
      setCacheEnabled(data.enabled);
      setCacheEnabledSaved(true);
      setTimeout(() => setCacheEnabledSaved(false), 1500);
    } catch (e: any) {
      setCacheEnabledError(e?.message || "Failed to update cache setting");
    } finally {
      setCacheEnabledSaving(false);
    }
  };

  const handleSaveCacheTTL = async () => {
    try {
      setCacheTTLSaving(true);
      setCacheTTLError(null);
      setCacheTTLSaved(false);
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/cache-ttl`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ttl_hours: cacheTTL }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      const data: CacheTTLSetting = await res.json();
      setCacheTTL(data.ttl_hours);
      setCacheTTLSaved(true);
      setTimeout(() => setCacheTTLSaved(false), 1500);
    } catch (e: any) {
      setCacheTTLError(e?.message || "Failed to update cache TTL");
    } finally {
      setCacheTTLSaving(false);
    }
  };

  const loadUsageData = async () => {
    try {
      setUsageLoading(true);
      setUsageError(null);
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/gemini-usage`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      const data: AllKeysUsageResponse = await res.json();
      setUsageData(data);
    } catch (e: any) {
      setUsageError(e?.message || "Failed to load usage data");
    } finally {
      setUsageLoading(false);
    }
  };

  const loadModelUsageData = async () => {
    try {
      setModelUsageLoading(true);
      setModelUsageError(null);
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/settings/ai/usage-by-model`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      const data: AllModelsUsageResponse = await res.json();
      setModelUsageData(data);
    } catch (e: any) {
      setModelUsageError(e?.message || "Failed to load model usage data");
    } finally {
      setModelUsageLoading(false);
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
            <CardTitle>Default AI Model</CardTitle>
            <CardDescription>
              Choose which model to use for video analysis and prompt generation. Costs are calculated based on this selection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiModelError && (
              <div className="text-xs text-red-400 border border-red-500/40 rounded-md p-2 bg-red-500/5">
                {aiModelError}
              </div>
            )}
            <select
              className="w-full bg-neutral-900 border border-neutral-800 rounded-md text-sm p-2 text-neutral-100"
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              disabled={aiModelLoading || aiModelSaving}
            >
              <optgroup label="Gemini 2.0 (Recommended for video analysis)">
                <option value="gemini-2.0-flash-001">
                  2.0 Flash – Input $0.10/1M, Cached $0.025/1M, Output $0.40/1M (Best cost/quality)
                </option>
                <option value="gemini-2.0-flash-lite">
                  2.0 Flash-Lite – Input $0.075/1M, Output $0.30/1M (Most cost-effective)
                </option>
              </optgroup>
              <optgroup label="Gemini 2.5 (Higher quality, higher cost)">
                <option value="gemini-2.5-flash-001">
                  2.5 Flash – Input $0.30/1M, Cached $0.03/1M, Output $2.50/1M
                </option>
                <option value="gemini-2.5-flash-preview-09-2025">
                  2.5 Flash Preview – Input $0.30/1M, Cached $0.03/1M, Output $2.50/1M
                </option>
                <option value="gemini-2.5-flash-lite">
                  2.5 Flash-Lite – Input $0.10/1M, Cached $0.01/1M, Output $0.40/1M
                </option>
                <option value="gemini-2.5-flash-lite-preview-09-2025">
                  2.5 Flash-Lite Preview – Input $0.10/1M, Cached $0.01/1M, Output $0.40/1M
                </option>
                <option value="gemini-2.5-pro">
                  2.5 Pro – Input $1.25/1M, Cached $0.125/1M, Output $10.00/1M (Best quality)
                </option>
              </optgroup>
              <optgroup label="Gemini 3 (Latest, premium pricing)">
                <option value="gemini-3-pro-preview">
                  3 Pro Preview – Input $2.00/1M, Cached $0.20/1M, Output $12.00/1M (Most advanced)
                </option>
              </optgroup>
              <optgroup label="OpenRouter (Free fallback)">
                <option value="openrouter:nvidia/nemotron-nano-12b-v2-vl:free">
                  Nemotron Nano – Free ($0 cost)
                </option>
              </optgroup>
            </select>
            <div className="flex items-center gap-3 justify-between mt-2">
              <div className="text-xs text-neutral-500">
                This model is used by new analyses. Existing analyses keep their original model and cost.
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleSaveAiModel}
                  disabled={aiModelLoading || aiModelSaving}
                  className="px-4 py-1.5 text-sm"
                >
                  {aiModelSaving ? "Saving…" : "Save"}
                </Button>
                {aiModelSaved && (
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
            <CardTitle>📊 API Usage & Billing</CardTitle>
            <CardDescription>
              View token usage and estimated costs for each Gemini API key based on historical analyses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {usageError && (
              <div className="text-xs text-red-400 border border-red-500/40 rounded-md p-2 bg-red-500/5">
                {usageError}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={loadUsageData}
                disabled={usageLoading}
                className="px-4 py-1.5 text-sm"
                variant="outline"
              >
                {usageLoading ? "Loading..." : "🔄 Refresh Usage Stats"}
              </Button>
            </div>

            {usageData && (
              <div className="space-y-3 pt-2 border-t border-neutral-800">
                <div className="flex items-center justify-between bg-neutral-900 border border-emerald-800/40 rounded-md p-3">
                  <div>
                    <div className="text-sm font-medium text-emerald-400">Total Usage</div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {usageData.total_requests} requests across all keys
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-400">
                      ${usageData.total_cost_usd.toFixed(4)}
                    </div>
                    <div className="text-xs text-neutral-500">Estimated Cost</div>
                  </div>
                </div>

                {usageData.keys_stats.map((keyStat) => (
                  <div key={keyStat.key_index} className="bg-neutral-900 border border-neutral-800 rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-mono text-neutral-400">
                        Key #{keyStat.key_index + 1}: {keyStat.key_preview}
                      </div>
                      <div className="text-sm font-bold text-emerald-400">
                        ${keyStat.estimated_cost_usd.toFixed(4)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-neutral-800/50 rounded p-2">
                        <div className="text-neutral-500">Requests</div>
                        <div className="font-medium text-neutral-200">{keyStat.total_requests.toLocaleString()}</div>
                      </div>
                      <div className="bg-neutral-800/50 rounded p-2">
                        <div className="text-neutral-500">Total Tokens</div>
                        <div className="font-medium text-neutral-200">{keyStat.total_tokens.toLocaleString()}</div>
                      </div>
                      <div className="bg-neutral-800/50 rounded p-2">
                        <div className="text-neutral-500">Prompt Tokens</div>
                        <div className="font-medium text-blue-400">{keyStat.total_prompt_tokens.toLocaleString()}</div>
                      </div>
                      <div className="bg-neutral-800/50 rounded p-2">
                        <div className="text-neutral-500">Cached Tokens</div>
                        <div className="font-medium text-purple-400">{keyStat.total_cached_tokens.toLocaleString()}</div>
                      </div>
                      <div className="bg-neutral-800/50 rounded p-2">
                        <div className="text-neutral-500">Completion Tokens</div>
                        <div className="font-medium text-green-400">{keyStat.total_completion_tokens.toLocaleString()}</div>
                      </div>
                      {keyStat.last_used && (
                        <div className="bg-neutral-800/50 rounded p-2">
                          <div className="text-neutral-500">Last Used</div>
                          <div className="font-medium text-neutral-200">
                            {new Date(keyStat.last_used).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>

                    {keyStat.total_cached_tokens > 0 && (
                      <div className="mt-2 text-xs text-purple-400">
                        💡 Saved ~${((keyStat.total_cached_tokens / 1_000_000) * 0.075).toFixed(4)} with caching (90% discount)
                      </div>
                    )}
                  </div>
                ))}

                {usageData.keys_stats.length === 0 && (
                  <div className="text-xs text-neutral-500 italic">
                    No usage data found. Start analyzing videos to see statistics.
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-neutral-500 pt-2 border-t border-neutral-800">
              💡 <strong>Note:</strong> Costs are estimated based on current Gemini pricing ($0.10/1M prompt tokens, $0.025/1M cached tokens, $0.40/1M completion tokens).
              Actual billing may vary. Check Google Cloud Console for official billing.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📈 Usage by Model (Real-Time)</CardTitle>
            <CardDescription>
              Real-time usage tracking per model. Updated automatically after each API call.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {modelUsageError && (
              <div className="text-xs text-red-400 border border-red-500/40 rounded-md p-2 bg-red-500/5">
                {modelUsageError}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={loadModelUsageData}
                disabled={modelUsageLoading}
                className="px-4 py-1.5 text-sm"
                variant="outline"
              >
                {modelUsageLoading ? "Loading..." : "🔄 Refresh Model Stats"}
              </Button>
            </div>

            {modelUsageData && (
              <div className="space-y-3 pt-2 border-t border-neutral-800">
                <div className="flex items-center justify-between bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-800/40 rounded-md p-3">
                  <div>
                    <div className="text-sm font-medium text-blue-400">Total API Usage</div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {modelUsageData.total_requests.toLocaleString()} requests across all models
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-400">
                      ${modelUsageData.total_cost_usd.toFixed(6)}
                    </div>
                    <div className="text-xs text-neutral-500">Total Cost</div>
                  </div>
                </div>

                {modelUsageData.models_stats.map((modelStat) => (
                  <div key={`${modelStat.provider}-${modelStat.model_name}`} className="bg-neutral-900 border border-neutral-800 rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm font-semibold text-neutral-200">{modelStat.model_name}</div>
                        <div className="text-xs text-neutral-500">{modelStat.provider}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-400">
                          ${modelStat.estimated_cost_usd.toFixed(6)}
                        </div>
                        <div className="text-xs text-neutral-500">{modelStat.total_requests} requests</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                      <div className="bg-neutral-800/50 rounded p-2">
                        <div className="text-neutral-500">Prompt</div>
                        <div className="font-medium text-blue-400">{modelStat.total_prompt_tokens.toLocaleString()}</div>
                      </div>
                      <div className="bg-neutral-800/50 rounded p-2">
                        <div className="text-neutral-500">Cached</div>
                        <div className="font-medium text-purple-400">{modelStat.total_cached_tokens.toLocaleString()}</div>
                      </div>
                      <div className="bg-neutral-800/50 rounded p-2">
                        <div className="text-neutral-500">Completion</div>
                        <div className="font-medium text-green-400">{modelStat.total_completion_tokens.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-800">
                      <div className="text-xs text-neutral-500">
                        Total: <span className="text-neutral-300 font-medium">{modelStat.total_tokens.toLocaleString()}</span> tokens
                      </div>
                      {modelStat.last_used && (
                        <div className="text-xs text-neutral-500">
                          Last used: {new Date(modelStat.last_used).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {modelStat.total_cached_tokens > 0 && (
                      <div className="mt-2 text-xs text-purple-400 bg-purple-900/10 rounded p-2">
                        💰 Saved ~${((modelStat.total_cached_tokens / 1_000_000) * 0.075).toFixed(4)} with caching (90% discount)
                      </div>
                    )}
                  </div>
                ))}

                {modelUsageData.models_stats.length === 0 && (
                  <div className="text-xs text-neutral-500 italic">
                    No usage data yet. Start analyzing videos to see real-time statistics.
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-neutral-500 pt-2 border-t border-neutral-800">
              ⚡ <strong>Real-Time Tracking:</strong> Usage is logged automatically after every API call.
              This data is stored in the database and provides accurate, up-to-date statistics per model.
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

        <Card>
          <CardHeader>
            <CardTitle>Gemini Cache Management</CardTitle>
            <CardDescription>
              Control caching behavior and manage existing caches. Caches reduce costs by 90% but incur storage fees ($1/hour per cache after 24h TTL expires).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cacheError && (
              <div className="text-xs text-red-400 border border-red-500/40 rounded-md p-2 bg-red-500/5">
                {cacheError}
              </div>
            )}
            {cacheEnabledError && (
              <div className="text-xs text-red-400 border border-red-500/40 rounded-md p-2 bg-red-500/5">
                {cacheEnabledError}
              </div>
            )}
            {cacheTTLError && (
              <div className="text-xs text-red-400 border border-red-500/40 rounded-md p-2 bg-red-500/5">
                {cacheTTLError}
              </div>
            )}

            {/* Cache Enable/Disable Toggle */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium mb-1">
                    {cacheEnabled ? "✅ Caching Enabled" : "❌ Caching Disabled"}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {cacheEnabled 
                      ? "New analyses will create caches for 90% cost savings on follow-ups"
                      : "New analyses will NOT create caches (no storage fees, but higher costs for follow-ups)"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleToggleCacheEnabled}
                    disabled={cacheEnabledLoading || cacheEnabledSaving}
                    className="px-4 py-1.5 text-sm"
                    variant={cacheEnabled ? "destructive" : "default"}
                  >
                    {cacheEnabledSaving ? "Saving..." : (cacheEnabled ? "Disable" : "Enable")}
                  </Button>
                  {cacheEnabledSaved && (
                    <span className="text-xs text-emerald-400">Saved</span>
                  )}
                </div>
              </div>
            </div>

            {/* Cache TTL Setting */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-md p-3">
              <div className="space-y-2">
                <div className="text-sm font-medium">⏱️ Cache Expiration Time (TTL)</div>
                <div className="text-xs text-neutral-500 mb-2">
                  How long caches should last before expiring. After expiration, caches incur $1/hour storage fees.
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="720"
                      value={cacheTTL}
                      onChange={(e) => setCacheTTL(parseInt(e.target.value) || 24)}
                      disabled={cacheTTLLoading || cacheTTLSaving}
                      className="w-24 text-sm bg-neutral-800 border border-neutral-700 rounded-md text-neutral-100 p-2"
                    />
                    <span className="text-xs text-neutral-400">hours</span>
                    <span className="text-xs text-neutral-600">
                      ({cacheTTL} hours = {(cacheTTL / 24).toFixed(1)} days)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleSaveCacheTTL}
                      disabled={cacheTTLLoading || cacheTTLSaving || cacheTTL < 1 || cacheTTL > 720}
                      className="px-4 py-1.5 text-sm"
                    >
                      {cacheTTLSaving ? "Saving..." : "Save"}
                    </Button>
                    {cacheTTLSaved && (
                      <span className="text-xs text-emerald-400">Saved</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-neutral-600 mt-1">
                  Valid range: 1-720 hours (1 hour to 30 days). Common values: 1h, 6h, 12h, 24h (default), 48h, 168h (7 days)
                </div>
              </div>
            </div>

            {/* Cache Management Actions */}
            <div className="flex gap-2 pt-2 border-t border-neutral-800">
              <Button
                type="button"
                onClick={loadCacheData}
                disabled={cacheLoading || cacheDeleting}
                className="px-4 py-1.5 text-sm"
                variant="outline"
              >
                {cacheLoading ? "Loading..." : "🔄 Check Caches"}
              </Button>
              <Button
                type="button"
                onClick={handleDeleteAllCaches}
                disabled={cacheLoading || cacheDeleting || !cacheData || cacheData.total_caches === 0}
                className="px-4 py-1.5 text-sm"
                variant="destructive"
              >
                {cacheDeleting ? "Deleting..." : "🗑️ Delete All Caches"}
              </Button>
            </div>

            {cacheData && (
              <div className="space-y-3 pt-2 border-t border-neutral-800">
                <div className="text-sm font-medium">
                  Total Caches: <span className="text-emerald-400">{cacheData.total_caches}</span>
                </div>

                {cacheData.keys_stats.map((keyStat) => (
                  <div key={keyStat.key_index} className="bg-neutral-900 border border-neutral-800 rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-mono text-neutral-400">
                        Key #{keyStat.key_index}: {keyStat.key_preview}
                      </div>
                      <div className="text-xs font-medium text-neutral-300">
                        {keyStat.cache_count} cache{keyStat.cache_count !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {keyStat.error && (
                      <div className="text-xs text-red-400 mt-1">
                        Error: {keyStat.error}
                      </div>
                    )}

                    {keyStat.caches.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {keyStat.caches.map((cache, idx) => (
                          <div key={idx} className="text-xs text-neutral-500 font-mono pl-2 border-l-2 border-neutral-700">
                            {cache.cache_name.split('/').pop()}
                            {cache.expire_time && (
                              <span className="ml-2 text-neutral-600">
                                (expires: {new Date(cache.expire_time).toLocaleString()})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {cacheData.total_caches === 0 && (
                  <div className="text-xs text-neutral-500 italic">
                    ✅ No caches found. Storage billing is stopped.
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-neutral-500 pt-2 border-t border-neutral-800">
              💡 <strong>Tip:</strong> Caches are created automatically during video analysis to save costs on follow-up operations.
              They expire after 24 hours but continue to incur storage fees. Delete them when not needed.
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
