// Simple in-memory cache for admin statistics
class AdminCache {
  constructor() {
    this.cache = new Map();
    this.CACHE_DURATION = 30000; // 30 seconds for stats
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Auto-cleanup: remove oldest entries if cache size exceeds 100
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  invalidate(pattern) {
    if (pattern === '*') {
      this.cache.clear();
    } else {
      // Delete keys matching pattern
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    }
  }

  // Middleware to cache GET requests
  cacheMiddleware(duration = 30000) {
    return (req, res, next) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      const key = `${req.originalUrl || req.url}`;
      const cached = this.get(key);

      if (cached) {
        return res.json(cached);
      }

      // Store original res.json
      const originalJson = res.json.bind(res);
      
      // Override res.json to cache response
      res.json = (data) => {
        this.set(key, data);
        return originalJson(data);
      };

      next();
    };
  }
}

module.exports = new AdminCache();
