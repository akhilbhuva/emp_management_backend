import { getRedis } from "../config/redis.js";
import { logger } from "../config/logger.js";

const DEFAULT_TTL_SECONDS = 60;

// Any Redis failure here is swallowed and treated as a cache miss, so a
// down Redis just means every request falls through to the database —
// slower, but never broken.
export const cacheGet = async (key) => {
  try {
    const raw = await getRedis().get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    logger.warn(`Redis GET failed for ${key}: ${error.message}`);
    return null;
  }
};

export const cacheSet = async (key, value, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  try {
    await getRedis().set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (error) {
    logger.warn(`Redis SET failed for ${key}: ${error.message}`);
  }
};

// Invalidates every cached entry under a namespace, e.g. prefix
// "users:list:" clears every cached page/filter/search combination at once —
// a single record write can affect many of them, so a targeted single-key
// delete isn't enough. Uses SCAN rather than KEYS so it doesn't block Redis
// on a large keyspace.
export const cacheDeleteByPrefix = async (prefix) => {
  try {
    const redis = getRedis();
    let cursor = "0";
    const keysToDelete = [];
    do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
      cursor = nextCursor;
      keysToDelete.push(...keys);
    } while (cursor !== "0");

    if (keysToDelete.length) await redis.del(...keysToDelete);
  } catch (error) {
    logger.warn(`Redis SCAN/DEL failed for prefix ${prefix}: ${error.message}`);
  }
};
