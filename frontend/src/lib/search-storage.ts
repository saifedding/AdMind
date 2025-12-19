/**
 * Search Storage using IndexedDB for better performance and larger storage
 * IndexedDB has ~50MB+ limit vs localStorage's ~5-10MB
 */

const DB_NAME = 'AdsSearchDB';
const DB_VERSION = 1;
const STORE_NAME = 'searchResults';
const HISTORY_STORE = 'searchHistory';
const MAX_HISTORY = 20;
const MAX_RESULTS_AGE_DAYS = 7; // Auto-delete results older than 7 days

interface SearchResult {
  id: string;
  searchType: 'keyword' | 'page';
  query: string;
  countries: string[];
  activeStatus: string;
  mediaType: string;
  result: any;
  timestamp: number;
  searchHash?: string; // Hash to identify unique searches (parameters)
  resultHash?: string; // Hash to identify unique results (actual ads returned)
}

interface HistoryEntry {
  id: string;
  searchType: 'keyword' | 'page';
  query: string;
  countries: string[];
  activeStatus: string;
  mediaType: string;
  totalAds: number;
  timestamp: number;
  searchHash: string; // Hash to identify unique searches (parameters)
  resultHash: string; // Hash to identify unique results (actual ads returned)
}

/**
 * Generate a hash for a search to identify duplicates
 * Uses a simple but effective string hash algorithm
 */
function generateSearchHash(
  searchType: string,
  query: string,
  countries: string[],
  activeStatus: string,
  mediaType: string
): string {
  // Create a normalized string representation of the search
  const normalized = JSON.stringify({
    type: searchType,
    query: query.toLowerCase().trim(),
    countries: [...countries].sort(), // Sort to ensure consistent order
    status: activeStatus,
    media: mediaType,
  });
  
  // Simple hash function (djb2 algorithm)
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash) + normalized.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36); // Convert to base36 for shorter string
}

/**
 * Generate a hash for search results to detect if results have changed
 * Uses the ad archive IDs to create a unique fingerprint of the results
 */
function generateResultHash(result: any): string {
  // Extract ad IDs from the result
  const adIds = (result?.ads_preview || [])
    .map((ad: any) => ad.ad_archive_id)
    .filter(Boolean)
    .sort(); // Sort to ensure consistent order
  
  // If no ads, return a special hash
  if (adIds.length === 0) {
    return 'empty';
  }
  
  // Create a string representation of the ad IDs
  const normalized = adIds.join(',');
  
  // Simple hash function (djb2 algorithm)
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash) + normalized.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36); // Convert to base36 for shorter string
}

class SearchStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create search results store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('query', 'query', { unique: false });
        }

        // Create history store
        if (!db.objectStoreNames.contains(HISTORY_STORE)) {
          const historyStore = db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  async saveSearchResult(
    searchType: 'keyword' | 'page',
    query: string,
    countries: string[],
    activeStatus: string,
    mediaType: string,
    result: any
  ): Promise<string> {
    const db = await this.ensureDB();
    
    // Generate hash for this search (parameters)
    const searchHash = generateSearchHash(searchType, query, countries, activeStatus, mediaType);
    
    // Generate hash for the results (actual ads returned)
    const resultHash = generateResultHash(result);
    
    const id = `${searchType}_${query}_${Date.now()}`;
    
    const searchResult: SearchResult = {
      id,
      searchType,
      query,
      countries,
      activeStatus,
      mediaType,
      result,
      timestamp: Date.now(),
      searchHash,
      resultHash,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(searchResult);

      request.onsuccess = async () => {
        // Save to history (it will handle duplicates using both hashes)
        await this.saveToHistory(searchResult);
        // Clean old results
        this.cleanOldResults();
        resolve(id);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getSearchResult(id: string): Promise<SearchResult | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getLatestSearchResult(): Promise<SearchResult | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev'); // Get latest

      request.onsuccess = () => {
        const cursor = request.result;
        resolve(cursor ? cursor.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async saveToHistory(searchResult: SearchResult): Promise<void> {
    const db = await this.ensureDB();

    // Generate hashes if not provided
    const searchHash = searchResult.searchHash || generateSearchHash(
      searchResult.searchType,
      searchResult.query,
      searchResult.countries,
      searchResult.activeStatus,
      searchResult.mediaType
    );

    const resultHash = searchResult.resultHash || generateResultHash(searchResult.result);

    // ALWAYS check for duplicates BEFORE adding to history
    const existingHistory = await this.getHistory();
    
    // Find any entry with the same search parameters
    const duplicateEntry = existingHistory.find(entry => entry.searchHash === searchHash);

    if (duplicateEntry) {
      // Check if the results are EXACTLY the same
      if (duplicateEntry.resultHash === resultHash) {
        // Same search, same results - ABSOLUTELY DO NOT ADD
        console.log('🚫 BLOCKED: Duplicate search with identical results - NOT adding to history');
        console.log('   Search Hash:', searchHash);
        console.log('   Result Hash:', resultHash);
        console.log('   Existing Entry ID:', duplicateEntry.id);
        
        // Just return without doing anything - no update, no add
        return Promise.resolve();
      } else {
        // Same search, DIFFERENT results - replace the old entry
        console.log('✨ REPLACING: Same search but NEW results detected');
        console.log('   Old Result Hash:', duplicateEntry.resultHash);
        console.log('   New Result Hash:', resultHash);
        
        // Delete old entry first
        await this.deleteHistoryEntry(duplicateEntry.id);
      }
    } else {
      // No duplicate found - this is a completely new search
      console.log('🆕 ADDING: New unique search to history');
      console.log('   Search Hash:', searchHash);
      console.log('   Result Hash:', resultHash);
    }

    // Add the new entry (either new search or updated results)
    const historyEntry: HistoryEntry = {
      id: searchResult.id,
      searchType: searchResult.searchType,
      query: searchResult.query,
      countries: searchResult.countries,
      activeStatus: searchResult.activeStatus,
      mediaType: searchResult.mediaType,
      totalAds: searchResult.result?.ads_preview?.length || 0,
      timestamp: searchResult.timestamp,
      searchHash,
      resultHash,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([HISTORY_STORE], 'readwrite');
      const store = transaction.objectStore(HISTORY_STORE);
      const request = store.put(historyEntry);

      request.onsuccess = () => {
        this.trimHistory();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getHistory(): Promise<HistoryEntry[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([HISTORY_STORE], 'readonly');
      const store = transaction.objectStore(HISTORY_STORE);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev'); // Newest first

      const history: HistoryEntry[] = [];
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && history.length < MAX_HISTORY) {
          history.push(cursor.value);
          cursor.continue();
        } else {
          resolve(history);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteHistoryEntry(id: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([HISTORY_STORE], 'readwrite');
      const store = transaction.objectStore(HISTORY_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearHistory(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([HISTORY_STORE], 'readwrite');
      const store = transaction.objectStore(HISTORY_STORE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllStorage(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      // Clear both history and search results
      const transaction = db.transaction([HISTORY_STORE, STORE_NAME], 'readwrite');
      
      const historyStore = transaction.objectStore(HISTORY_STORE);
      const resultsStore = transaction.objectStore(STORE_NAME);
      
      historyStore.clear();
      resultsStore.clear();

      transaction.oncomplete = () => {
        // Also clear localStorage and sessionStorage
        try {
          // Clear search-related items from localStorage
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('search') || key.includes('Search'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));

          // Clear search-related items from sessionStorage
          const sessionKeysToRemove: string[] = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && (key.includes('search') || key.includes('Search') || key === 'restoredSearch')) {
              sessionKeysToRemove.push(key);
            }
          }
          sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
        } catch (e) {
          console.warn('Failed to clear localStorage/sessionStorage:', e);
        }
        
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  private async trimHistory(): Promise<void> {
    const history = await this.getHistory();
    if (history.length <= MAX_HISTORY) return;

    const db = await this.ensureDB();
    const transaction = db.transaction([HISTORY_STORE], 'readwrite');
    const store = transaction.objectStore(HISTORY_STORE);

    // Delete oldest entries
    for (let i = MAX_HISTORY; i < history.length; i++) {
      store.delete(history[i].id);
    }
  }

  private async cleanOldResults(): Promise<void> {
    const db = await this.ensureDB();
    const cutoffTime = Date.now() - (MAX_RESULTS_AGE_DAYS * 24 * 60 * 60 * 1000);

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  async findAdInResults(adArchiveId: string): Promise<any | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const result = cursor.value.result;
          const ad = result?.ads_preview?.find((a: any) => a.ad_archive_id === adArchiveId);
          if (ad) {
            resolve(ad);
          } else {
            cursor.continue();
          }
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const searchStorage = new SearchStorage();
