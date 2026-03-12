/**
 * Simple in-memory cache for API responses
 * Helps reduce redundant API calls when switching between tabs
 */

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 60000; // 1 minute default
  }

  /**
   * Get cached data if available and not expired
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null if not found/expired
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  /**
   * Store data in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds (default: 60000)
   */
  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }

  /**
   * Invalidate a specific cache key or pattern
   * @param {string|RegExp} keyOrPattern - Key or pattern to invalidate
   */
  invalidate(keyOrPattern) {
    if (typeof keyOrPattern === 'string') {
      this.cache.delete(keyOrPattern);
    } else if (keyOrPattern instanceof RegExp) {
      for (const key of this.cache.keys()) {
        if (keyOrPattern.test(key)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Clear all cached data
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }
}

// Singleton instance
const cacheManager = new CacheManager();

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  SHORT: 30000,      // 30 seconds - for rapidly changing data
  MEDIUM: 60000,     // 1 minute - default
  LONG: 300000,      // 5 minutes - for relatively static data
  VERY_LONG: 600000  // 10 minutes - for mostly static data like courses
};

export default cacheManager;
