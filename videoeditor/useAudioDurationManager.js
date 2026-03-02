import { useState, useEffect, useCallback, useRef } from 'react';

// Enhanced Audio Duration Manager
class AudioDurationManager {
  constructor() {
    this.cache = new Map(); // url -> duration
    this.loading = new Set(); // urls currently loading
    this.listeners = new Map(); // url -> [callbacks]
    this.preloadQueue = new Set(); // urls to preload
    this.maxCacheSize = 1000; // Prevent memory leaks
    this.loadTimeout = 15000; // 15 second timeout
  }

  // Get cached duration or return null if loading/not available
  getDuration(url) {
    if (!url) return null;
    return this.cache.get(url) || null;
  }

  // Get duration with loading state
  getDurationWithStatus(url) {
    if (!url) return { duration: null, loading: false };
    return {
      duration: this.cache.get(url) || null,
      loading: this.loading.has(url)
    };
  }

  // Load audio duration using Audio API
  async loadDuration(url) {
    if (!url || this.loading.has(url) || this.cache.has(url)) {
      return this.cache.get(url);
    }

    this.loading.add(url);

    try {
      const duration = await this.fetchAudioDurationWithRetry(url);
      
      // Clean cache if it gets too large
      if (this.cache.size >= this.maxCacheSize) {
        const keys = Array.from(this.cache.keys());
        // Remove oldest entries (first 100)
        keys.slice(0, 100).forEach(key => this.cache.delete(key));
      }

      this.cache.set(url, duration);
      this.loading.delete(url);

      // Notify all listeners
      const callbacks = this.listeners.get(url) || [];
      callbacks.forEach(callback => {
        try {
          callback(duration);
        } catch (err) {
          console.warn('Error in duration callback:', err);
        }
      });
      this.listeners.delete(url);

      return duration;
    } catch (error) {
      console.warn(`Failed to load audio duration for ${url}:`, error.message);
      this.loading.delete(url);
      
      // Set fallback duration
      const fallbackDuration = 5;
      this.cache.set(url, fallbackDuration);
      
      // Still notify listeners with fallback
      const callbacks = this.listeners.get(url) || [];
      callbacks.forEach(callback => {
        try {
          callback(fallbackDuration);
        } catch (err) {
          console.warn('Error in duration callback:', err);
        }
      });
      this.listeners.delete(url);
      
      return fallbackDuration;
    }
  }

  // Fetch duration with retry logic
  async fetchAudioDurationWithRetry(url, maxRetries = 2) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const duration = await this.fetchAudioDuration(url);
        return duration;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError;
  }

  // Core duration fetching logic
  fetchAudioDuration(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      let resolved = false;
      let timeoutId = null;

      // FIX 1: Use 'let' so it can be referenced before declaration inside callbacks,
      // and do NOT use const + reassign (that throws a TypeError silently in strict mode).
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        if (timeoutId) clearTimeout(timeoutId); // FIX 2: Clear timeout inside the single cleanup fn
        audio.removeEventListener('loadedmetadata', onLoad);
        audio.removeEventListener('error', onError);
        audio.removeEventListener('canplay', onCanPlay);
        try {
          audio.pause();
          audio.src = '';
          audio.load();
        } catch (e) {
          // Ignore cleanup errors
        }
      };

      const onLoad = () => {
        const duration = audio.duration;
        cleanup();
        if (isFinite(duration) && duration > 0) {
          resolve(Math.min(duration, 3600)); // Cap at 1 hour for sanity
        } else {
          reject(new Error('Invalid duration'));
        }
      };

      const onCanPlay = () => {
        // Fallback if loadedmetadata doesn't fire
        if (!resolved && isFinite(audio.duration) && audio.duration > 0) {
          onLoad();
        }
      };

      const onError = () => {
        // FIX 3: If CORS failed, try again WITHOUT crossOrigin before giving up
        if (audio.crossOrigin) {
          audio.removeEventListener('loadedmetadata', onLoad);
          audio.removeEventListener('error', onError);
          audio.removeEventListener('canplay', onCanPlay);
          // Retry without crossOrigin — works for most Firebase/CDN audio
          const audio2 = new Audio();
          audio2.preload = 'metadata';
          // No crossOrigin set — plain request, no CORS preflight
          audio2.addEventListener('loadedmetadata', () => {
            const dur = audio2.duration;
            resolved = true;
            if (timeoutId) clearTimeout(timeoutId);
            audio2.src = '';
            if (isFinite(dur) && dur > 0) {
              resolve(Math.min(dur, 3600));
            } else {
              reject(new Error('Invalid duration on retry'));
            }
          });
          audio2.addEventListener('error', () => {
            cleanup();
            reject(new Error('Audio load error after CORS retry'));
          });
          audio2.src = url;
          return;
        }
        cleanup();
        reject(new Error('Audio load error'));
      };

      audio.addEventListener('loadedmetadata', onLoad);
      audio.addEventListener('error', onError);
      audio.addEventListener('canplay', onCanPlay);

      // FIX 4: Do NOT set crossOrigin at all by default.
      // crossOrigin='anonymous' forces a CORS preflight. Firebase Storage and many
      // CDNs block it, causing an immediate onerror → 5s fallback gets cached forever.
      // Plain requests (no crossOrigin) work fine for just reading metadata/duration.
      audio.preload = 'metadata';
      // audio.crossOrigin = 'anonymous'; // REMOVED — this was the primary bug

      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout loading audio'));
      }, this.loadTimeout);

      try {
        audio.src = url;
      } catch (e) {
        cleanup();
        reject(new Error(`Failed to set audio source: ${e.message}`));
      }
    });
  }

  // Subscribe to duration loading
  onDurationLoad(url, callback) {
    if (!url || typeof callback !== 'function') return;

    if (this.cache.has(url)) {
      // Call immediately if cached
      try {
        callback(this.cache.get(url));
      } catch (err) {
        console.warn('Error in immediate duration callback:', err);
      }
      return;
    }

    // Add to listeners
    if (!this.listeners.has(url)) {
      this.listeners.set(url, []);
    }
    this.listeners.get(url).push(callback);

    // Start loading if not already loading
    if (!this.loading.has(url)) {
      this.loadDuration(url);
    }
  }

  // Preload multiple durations (non-blocking)
  preloadDurations(urls) {
    const validUrls = urls.filter(url => url && typeof url === 'string');
    
    validUrls.forEach(url => {
      if (!this.cache.has(url) && !this.loading.has(url)) {
        this.preloadQueue.add(url);
      }
    });

    // Process preload queue with delays to avoid overwhelming the browser
    this.processPreloadQueue();
  }

  // Process preload queue with throttling
  async processPreloadQueue() {
    const urlsToProcess = Array.from(this.preloadQueue);
    this.preloadQueue.clear();

    for (let i = 0; i < urlsToProcess.length; i++) {
      const url = urlsToProcess[i];
      
      if (!this.cache.has(url) && !this.loading.has(url)) {
        this.loadDuration(url);
        
        // Add small delay between requests to avoid overwhelming
        if (i < urlsToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
  }

  // Clear cache (useful for memory management)
  clearCache() {
    this.cache.clear();
    this.loading.clear();
    this.listeners.clear();
    this.preloadQueue.clear();
  }

  // Get cache statistics
  getStats() {
    return {
      cacheSize: this.cache.size,
      loading: this.loading.size,
      listeners: this.listeners.size,
      preloadQueue: this.preloadQueue.size
    };
  }
}

// Global instance
const globalAudioDurationManager = new AudioDurationManager();

// Expose for debugging
if (typeof window !== 'undefined') {
  window.globalAudioDurationManager = globalAudioDurationManager;
}

// React hook for using audio duration manager
export const useAudioDurationManager = () => {
  const [durations, setDurations] = useState(new Map());
  const [loadingStates, setLoadingStates] = useState(new Map());
  const managedUrls = useRef(new Set());

  // Get duration for a specific URL
  const getDuration = useCallback((url) => {
    if (!url) return null;
    return durations.get(url) || globalAudioDurationManager.getDuration(url);
  }, [durations]);

  // Get duration with loading state
  const getDurationWithLoading = useCallback((url) => {
    if (!url) return { duration: null, loading: false };
    
    return {
      duration: durations.get(url) || globalAudioDurationManager.getDuration(url),
      loading: loadingStates.get(url) || false
    };
  }, [durations, loadingStates]);

  // Load duration for a URL
  const loadDuration = useCallback(async (url) => {
    if (!url || durations.has(url)) return durations.get(url);

    setLoadingStates(prev => new Map(prev.set(url, true)));
    
    const updateDuration = (duration) => {
      setDurations(prev => new Map(prev.set(url, duration)));
      setLoadingStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(url);
        return newMap;
      });
    };

    globalAudioDurationManager.onDurationLoad(url, updateDuration);
    managedUrls.current.add(url);

    return globalAudioDurationManager.loadDuration(url);
  }, [durations]);

  // Preload multiple URLs
  const preloadDurations = useCallback((urls) => {
    const validUrls = urls.filter(url => url && !durations.has(url));
    
    if (validUrls.length === 0) return;

    // Set loading states
    setLoadingStates(prev => {
      const newMap = new Map(prev);
      validUrls.forEach(url => newMap.set(url, true));
      return newMap;
    });

    // Set up listeners for all URLs
    validUrls.forEach(url => {
      const updateDuration = (duration) => {
        setDurations(prev => new Map(prev.set(url, duration)));
        setLoadingStates(prev => {
          const newMap = new Map(prev);
          newMap.delete(url);
          return newMap;
        });
      };

      globalAudioDurationManager.onDurationLoad(url, updateDuration);
      managedUrls.current.add(url);
    });

    // Start preloading
    globalAudioDurationManager.preloadDurations(validUrls);
  }, [durations]);

  // Cleanup managed URLs on unmount
  useEffect(() => {
    return () => {
      managedUrls.current.clear();
    };
  }, []);

  return {
    getDuration,
    getDurationWithLoading,
    loadDuration,
    preloadDurations,
    durations,
    stats: globalAudioDurationManager.getStats()
  };
};

// Hook for managing a specific audio URL
export const useAudioDuration = (url) => {
  const [duration, setDuration] = useState(null);
  const [loading, setLoading] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!url || hasInitialized.current) return;
    hasInitialized.current = true;

    // Check if already cached
    const cached = globalAudioDurationManager.getDuration(url);
    if (cached) {
      setDuration(cached);
      return;
    }

    // Set loading and request duration
    setLoading(true);
    
    const handleDurationLoad = (loadedDuration) => {
      setDuration(loadedDuration);
      setLoading(false);
    };

    globalAudioDurationManager.onDurationLoad(url, handleDurationLoad);

    return () => {
      setLoading(false);
    };
  }, [url]);

  return { duration, loading };
};

export default globalAudioDurationManager;