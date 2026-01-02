/**
 * Video Analysis Storage
 * Stores sessions in localStorage for persistence
 */

const STORAGE_KEY = 'video_replicator_sessions';
const MAX_STORED_SESSIONS = 20;

export interface StoredSession {
  id: string;
  name: string;
  videoUrl: string;
  videoAnalysis: any;
  scenes: any[];
  settings: {
    geminiModel: string;
    includeDiacritics: boolean;
    includeMusic: boolean;
    includeTextOverlays: boolean;
    includeSoundEffects: boolean;
    promptDetailLevel: string;
    maxDurationSeconds: number;
    targetSceneCount: number | null;
    aspectRatio: string;
    mergeShortScenes: boolean;
  };
  timestamp: number;
  videoType?: string;
}

/**
 * Get all stored sessions
 */
export function getStoredSessions(): StoredSession[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load stored sessions:', error);
    return [];
  }
}

/**
 * Save a session
 */
export function saveSession(session: Omit<StoredSession, 'id' | 'timestamp'>): string {
  try {
    const sessions = getStoredSessions();
    
    // Generate unique ID
    const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const newSession: StoredSession = {
      ...session,
      id,
      timestamp: Date.now(),
      videoType: session.videoAnalysis?.video_type?.primary_type || 'unknown'
    };
    
    // Add to beginning
    sessions.unshift(newSession);
    
    // Keep only last MAX_STORED_SESSIONS
    if (sessions.length > MAX_STORED_SESSIONS) {
      sessions.splice(MAX_STORED_SESSIONS);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return id;
  } catch (error) {
    console.error('Failed to save session:', error);
    throw error;
  }
}

/**
 * Get a specific session by ID
 */
export function getSessionById(id: string): StoredSession | null {
  try {
    const sessions = getStoredSessions();
    return sessions.find(s => s.id === id) || null;
  } catch (error) {
    console.error('Failed to get session by ID:', error);
    return null;
  }
}

/**
 * Delete a session
 */
export function deleteSession(id: string): void {
  try {
    const sessions = getStoredSessions();
    const filtered = sessions.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete session:', error);
  }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Clear all stored sessions
 */
export function clearAllSessions(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear sessions:', error);
  }
}
