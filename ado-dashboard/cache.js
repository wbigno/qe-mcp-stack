// ============================================
// CACHE UTILITY
// Manages API response caching with TTL
// ============================================

class CacheManager {
    constructor() {
        this.cache = {};
        this.TTL = 3600000; // 1 hour in milliseconds
    }

    /**
     * Generate a unique cache key from endpoint and parameters
     */
    generateKey(endpoint, params = {}) {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');
        return `${endpoint}${sortedParams ? '?' + sortedParams : ''}`;
    }

    /**
     * Get data from cache if valid
     * Returns null if cache miss or expired
     */
    get(key) {
        const entry = this.cache[key];

        if (!entry) {
            console.log(`[Cache] MISS: ${key}`);
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            console.log(`[Cache] EXPIRED: ${key}`);
            this.remove(key);
            return null;
        }

        console.log(`[Cache] HIT: ${key} (age: ${Math.round((Date.now() - entry.timestamp) / 1000)}s)`);
        return entry.data;
    }

    /**
     * Store data in cache with metadata
     */
    set(key, data, params = {}, ttl = this.TTL) {
        this.cache[key] = {
            data,
            params,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttl
        };
        console.log(`[Cache] SET: ${key} (expires in ${ttl / 1000}s)`);
    }

    /**
     * Remove a specific cache entry
     */
    remove(key) {
        delete this.cache[key];
        console.log(`[Cache] REMOVED: ${key}`);
    }

    /**
     * Clear all cache entries
     */
    clear() {
        const count = Object.keys(this.cache).length;
        this.cache = {};
        console.log(`[Cache] CLEARED: ${count} entries removed`);
    }

    /**
     * Get cache metadata for display
     */
    getMetadata(key) {
        const entry = this.cache[key];
        if (!entry) return null;

        const age = Date.now() - entry.timestamp;
        const remaining = entry.expiresAt - Date.now();

        return {
            timestamp: entry.timestamp,
            age: Math.round(age / 1000), // seconds
            remaining: Math.round(remaining / 1000), // seconds
            params: entry.params
        };
    }

    /**
     * Check if cache entry exists and is valid
     */
    has(key) {
        return this.get(key) !== null;
    }
}

// Export singleton instance
export const cacheManager = new CacheManager();
