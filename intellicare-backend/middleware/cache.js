// Simple in-memory cache middleware for GET requests.
// Stores responses for a short TTL so repeated identical requests
// (same URL + same query params) skip the database entirely.

const cacheStore = new Map();
const TTL_MS = 30 * 1000; // cache each response for 30 seconds

const cacheMiddleware = (req, res, next) => {
  const cacheKey = req.originalUrl;
  const cached = cacheStore.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < TTL_MS) {
    res.set('X-Cache', 'HIT');
    return res.status(cached.status).json(cached.body);
  }

  // Monkey-patch res.json so we can capture the response before it's sent
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    cacheStore.set(cacheKey, {
      status: res.statusCode,
      body,
      timestamp: Date.now(),
    });
    res.set('X-Cache', 'MISS');
    return originalJson(body);
  };

  next();
};

module.exports = { cacheMiddleware };
