import dotenv from "dotenv";
import express, { Request, Response } from "express";
import Redis from "ioredis";
import authMiddleware from "./middlewares/authMiddleware";
import rateLimitMiddleware, {
  setRateLimitOverride,
} from "./middlewares/rateLimitMiddleware";
import { RateLimit, RateLimitConfig } from "./types";

dotenv.config();

export const rateLimitConfig: RateLimitConfig = {
  globalAuthenticated: {
    limit: 200, // Limit for authenticated users across all endpoints
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  globalUnauthenticated: {
    limit: 100, // Limit for unauthenticated users across all endpoints
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  endpoints: {
    "/api/special": {
      limit: 500,
      windowMs: 5 * 60 * 1000, // 5 minutes
    },
  } as Record<string, RateLimit>, // Extendable for specific endpoints if needed
};

function createApp(redisClient: Redis = new Redis()) {
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
