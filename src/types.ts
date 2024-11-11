import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  isAuthenticated?: boolean;
  user?: string | JwtPayload;
}

export type RateLimit = {
  limit: number;
  windowMs: number;
};

export type RateLimitConfig = {
  globalAuthenticated: RateLimit;
  globalUnauthenticated: RateLimit;
  endpoints: Record<string, RateLimit>;
};
