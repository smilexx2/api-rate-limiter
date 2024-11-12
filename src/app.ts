import dotenv from "dotenv";
import express, { Request, Response } from "express";
import Redis from "ioredis";
import authMiddleware from "./middlewares/authMiddleware";
import rateLimitMiddleware, {
  setRateLimitOverride,
} from "./middlewares/rateLimitMiddleware";
import { RateLimit, RateLimitConfig } from "./types";

dotenv.config();

export const defaultRateLimitConfig: RateLimitConfig = {
  globalAuthenticated: {
    limit: 10, // Limit for authenticated users across all endpoints
    windowMs: 1 * 60 * 1000, // 1 minute
  },
  globalUnauthenticated: {
    limit: 5, // Limit for unauthenticated users across all endpoints
    windowMs: 1 * 60 * 1000, // 1 minute
  },
  endpoints: {
    "/api/special": {
      limit: 3,
      windowMs: 30 * 1000, // 30 seconds
    },
  } as Record<string, RateLimit>, // Extendable for specific endpoints if needed
};

function createApp(
  redisClient: Redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
  }),
  rateLimitConfig: RateLimitConfig = defaultRateLimitConfig
) {
  const app = express();

  app.use(express.json());
  app.use(authMiddleware);
  app.use(rateLimitMiddleware(redisClient, rateLimitConfig));

  app.get("/", (_: Request, res: Response) => {
    res.send("Hello API Rate Limiter!");
  });

  app.get("/api/special", (_: Request, res: Response) => {
    res.send("Special API endpoint with a custom rate limit.");
  });

  app.post(
    "/admin/rate-limit-override",
    async (req: Request, res: Response) => {
      const { type, key, newLimit, ttlMs } = req.body;

      // Input validation
      if (type !== "global" && type !== "ip") {
        return res
          .status(400)
          .json({ message: 'Invalid type. Must be "global" or "ip".' });
      }

      if (type === "ip" && (!key || typeof key !== "string")) {
        return res.status(400).json({
          message: 'For type "ip", a valid key (IP address) must be provided.',
        });
      }

      if (!newLimit || typeof newLimit !== "number" || newLimit <= 0) {
        return res
          .status(400)
          .json({ message: "Invalid newLimit. Must be a positive number." });
      }

      if (!ttlMs || typeof ttlMs !== "number" || ttlMs <= 0) {
        return res.status(400).json({
          message:
            "Invalid ttlMs. Must be a positive number representing milliseconds.",
        });
      }

      // Set rate limit override
      await setRateLimitOverride(type, key, newLimit, ttlMs, redisClient);
      res
        .status(200)
        .json({ message: "Rate limit override set successfully." });
    }
  );

  return app;
}

export default createApp;
