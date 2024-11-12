import { NextFunction, Response } from "express";
import Redis from "ioredis";
import { AuthenticatedRequest, RateLimitConfig } from "../types";

function getNormalizedIp(req: AuthenticatedRequest) {
  let ip = req.ip;

  // If the IP is an IPv4-mapped IPv6 address (e.g., ::ffff:127.0.0.1), normalize it
  if (ip?.startsWith("::ffff:")) {
    ip = ip.split("::ffff:")[1];
  }

  return ip;
}

const rateLimitMiddleware = (
  redisClient: Redis,
  rateLimitConfig: RateLimitConfig
) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const currentTime = Date.now();

      const normalizedIp = getNormalizedIp(req);

      const endpointConfig = rateLimitConfig.endpoints[req.path];

      // Select configuration based on the endpoint or fallback to global defaults
      const config =
        endpointConfig || req.isAuthenticated
          ? rateLimitConfig.globalAuthenticated
          : rateLimitConfig.globalUnauthenticated;

      const globalOverrideKey = `rate_limit_override:global`;
      const ipOverrideKey = `rate_limit_override:ip:${normalizedIp}`;

      // Check if there's a global override
      const globalOverride = await redisClient.get(globalOverrideKey);
      let finalLimit = globalOverride
        ? parseInt(globalOverride, 10)
        : config.limit;

      // Check if there's a per-IP override
      const ipOverride = await redisClient.get(ipOverrideKey);
      if (ipOverride) {
        finalLimit = parseInt(ipOverride, 10);
      }

      const key = `rate-limiter:${normalizedIp}`;
      const zsetKey = `rate_limiter:${key}`;
      const windowStart = currentTime - config.windowMs;

      // Remove timestamps that are older than the window
      await redisClient.zremrangebyscore(zsetKey, 0, windowStart);

      // Get current count of requests in the sliding window
      const currentCount = await redisClient.zcard(zsetKey);

      if (currentCount >= finalLimit) {
        return res
          .status(429)
          .json({ message: "Too many requests. Please try again later." });
      }

      await redisClient.zadd(zsetKey, currentTime, currentTime.toString());

      // Set expiry for the sorted set to ensure it's cleaned up eventually
      await redisClient.expire(zsetKey, Math.ceil(config.windowMs / 1000));

      next();
    } catch (error) {
      console.error("Rate limiter error:", error);
      res.status(500).send("Internal Server Error");
    }
  };
};

export const setRateLimitOverride = async (
  type: "global" | "ip",
  key: string,
  newLimit: number,
  ttlMs: number,
  redisClient: Redis
) => {
  const redisKey =
    type === "global"
      ? `rate_limit_override:global`
      : `rate_limit_override:ip:${key}`;
  await redisClient.set(redisKey, newLimit, "PX", ttlMs);
};

export default rateLimitMiddleware;
