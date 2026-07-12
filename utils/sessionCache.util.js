import { getRedis } from "../config/redis.js";
import { logger } from "../config/logger.js";

const tokenKey = (token) => `session:token:${token}`;
const userSessionsKey = (user_id) => `session:user:${user_id}`;

// Redis-backed session/token store: caches "is this refresh token currently
// active" so refresh() can skip a database round trip on the hot path.
// Postgres (tbl_session) stays the durable source of truth — this is a
// read-through cache, invalidated explicitly on logout/rotation/deactivation.
// A cache miss (including "Redis is down") always falls back to the existing
// Postgres check, so this can never reject a token more strictly than the DB would.
export const sessionCache = {
  async save(user_id, token, ttlSeconds) {
    try {
      const redis = getRedis();
      await redis.set(tokenKey(token), String(user_id), "EX", ttlSeconds);
      await redis.sadd(userSessionsKey(user_id), token);
      await redis.expire(userSessionsKey(user_id), ttlSeconds);
    } catch (error) {
      logger.warn(`Redis session save failed: ${error.message}`);
    }
  },

  // Returns true (cache says active), or false (cache miss / revoked /
  // Redis unavailable) — callers must treat false as "unknown, check the DB".
  async isActive(token, user_id) {
    try {
      const storedUserId = await getRedis().get(tokenKey(token));
      return storedUserId !== null && Number(storedUserId) === user_id;
    } catch (error) {
      logger.warn(`Redis session lookup failed: ${error.message}`);
      return false;
    }
  },

  async revoke(user_id, token) {
    try {
      const redis = getRedis();
      await redis.del(tokenKey(token));
      await redis.srem(userSessionsKey(user_id), token);
    } catch (error) {
      logger.warn(`Redis session revoke failed: ${error.message}`);
    }
  },

  // Used when a user is deactivated/deleted — every session they hold must
  // stop being trusted by the cache immediately, not just wait out its TTL.
  async revokeAllForUser(user_id) {
    try {
      const redis = getRedis();
      const tokens = await redis.smembers(userSessionsKey(user_id));
      if (tokens.length) await redis.del(...tokens.map(tokenKey));
      await redis.del(userSessionsKey(user_id));
    } catch (error) {
      logger.warn(`Redis session revokeAll failed: ${error.message}`);
    }
  },
};
