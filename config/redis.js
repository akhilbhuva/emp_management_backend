import Redis from "ioredis";

let client;

// Caching is a performance optimization, not a correctness dependency, so a
// down/unreachable Redis must never crash the app or block requests — every
// caller in utils/cache.util.js and utils/sessionCache.util.js wraps its
// Redis calls and falls back to the database on failure.
export const connectRedis = () => {
  client = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 1,
    retryStrategy: () => 2000,
    lazyConnect: false,
  });

  client.on("connect", () => console.log("✅ Redis connected"));
  client.on("error", (err) => console.error("⚠️  Redis error:", err.message));

  return client;
};

export const getRedis = () => {
  if (!client) {
    throw new Error("Redis not initialized! Call connectRedis() first.");
  }
  return client;
};
