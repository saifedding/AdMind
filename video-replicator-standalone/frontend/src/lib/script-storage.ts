/**
 * Script-to-Video Session Storage
 * Stores script sessions in localStorage for persistence
 */

const STORAGE_KEY = 'script_to_video_sessions';
const MAX_STORED_SESSIONS = 20;

export interface StoredScriptSession {
  id: string;
  name: string;
  script: string;
  styleReferenceUrl: string;
  videoAnalysis: any;
  storyboards: any[];
  selectedStoryboardIds: string[];
  editedStoryboards: any[];
  prompts: any[];
  currentStep: string;
  settings: {
    geminiModel: string;
    includeDiacritics: boolean;
    useStyleAnalysis: boolean;
    replicationMode: boolean;
    aspectRatio: string;
  };
  timestamp: number;
}

/**
 * Get all stored script sessions
 */
export function getStoredScriptSessions(): StoredScriptSession[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load stored script sessions:', error);
    return [];
  }
}

/**
 * Save a script session
 */
export function saveScriptSession(session: Omit<StoredScriptSession, 'id' | 'timestamp'>): string {
  try {
    const sessions = getStoredScriptSessions();
    
    // Generate unique ID
    const id = `script_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const newSession: StoredScriptSession = {
      ...session,
      id,
      timestamp: Date.now(),
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
    console.error('Failed to save script session:', error);
    throw error;
  }
}

/**
 * Get a specific script session by ID
 */
export function getScriptSessionById(id: string): StoredScriptSession | null {
  try {
    const sessions = getStoredScriptSessions();
    return sessions.find(s => s.id === id) || null;
  } catch (error) {
    console.error('Failed to get script session by ID:', error);
    return null;
  }
}

/**
 * Update an existing script session
 */
export function updateScriptSession(id: string, updates: Partial<StoredScriptSession>): void {
  try {
    const sessions = getStoredScriptSessions();
    const index = sessions.findIndex(s => s.id === id);
    
    if (index >= 0) {
      sessions[index] = {
        ...sessions[index],
        ...updates,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  } catch (error) {
    console.error('Failed to update script session:', error);
  }
}

/**
 * Delete a script session
 */
export function deleteScriptSession(id: string): void {
  try {
    const sessions = getStoredScriptSessions();
    const filtered = sessions.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete script session:', error);
  }
}

/**
 * Clear all stored script sessions
 */
export function clearAllScriptSessions(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear script sessions:', error);
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
