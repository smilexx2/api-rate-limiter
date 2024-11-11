import { Express } from "express";
import Redis from "ioredis-mock";
import request from "supertest";
import createApp, { rateLimitConfig } from "../app";
import jwt from "jsonwebtoken";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const secretKey = process.env.JWT_SECRET_KEY as string; // Read the secret key from environment variables
if (!secretKey) {
  throw new Error("JWT_SECRET_KEY is not defined");
}
const validToken = jwt.sign({ userId: "123" }, secretKey);

describe("Rate Limiter App", () => {
  let app: Express;

  beforeEach(async () => {
    jest.clearAllMocks();
    const redisClient = new Redis();
    await redisClient.flushall();
    app = createApp(redisClient);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should return a 200", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
  });

  it("should return HTTP 429 after reaching the limit", async () => {
    for (let i = 0; i < rateLimitConfig.globalUnauthenticated.limit; i++) {
      await request(app).get("/");
      await delay(10);
    }

    const response = await request(app).get("/");
    expect(response.status).toBe(429);
    const responseBody = JSON.parse(response.text);
    expect(responseBody.message).toBe(
      "Too many requests. Please try again later."
    );
  });

  it("should reset rate limits after the time window", async () => {
    jest.useFakeTimers();

    for (let i = 0; i < rateLimitConfig.globalUnauthenticated.limit; i++) {
      await request(app).get("/");
      jest.advanceTimersByTime(1000);
    }

    const response = await request(app).get("/");
    expect(response.status).toBe(429);

    // Fast-forward time by 1 hour
    jest.advanceTimersByTime(60 * 60 * 1000);

    // After advancing time, the rate limit should reset, allowing new requests
    const responseAfterReset = await request(app).get("/");
    expect(responseAfterReset.status).toBe(200);
  });

  it("should allow more requests for authenticated users", async () => {
    for (let i = 0; i < rateLimitConfig.globalAuthenticated.limit; i++) {
      await request(app).get("/").auth(validToken, { type: "bearer" });
      await delay(10);
    }
    const response = await request(app)
      .get("/")
      .auth(validToken, { type: "bearer" });
    expect(response.status).toBe(429);
  });

  it("should have the ability to customize for a particular endpoint", async () => {
    for (let i = 0; i < rateLimitConfig.endpoints["/api/special"].limit; i++) {
      await request(app)
        .get("/api/special")
        .auth(validToken, { type: "bearer" });
      await delay(5);
    }
    const response = await request(app)
      .get("/api/special")
      .auth(validToken, { type: "bearer" });
    expect(response.status).toBe(429);
  });

  it("should allow override rate limit globally", async () => {
    const NEW_LIMIT = 50;
    const postResponse = await request(app)
      .post("/admin/rate-limit-override")
      .send({
        type: "global",
        newLimit: NEW_LIMIT,
        ttlMs: 1800000, // 30 minutes
      })
      .expect(200);

    expect(postResponse.body.message).toBe(
      "Rate limit override set successfully."
    );

    for (let i = 0; i < NEW_LIMIT; i++) {
      await request(app).get("/").auth(validToken, { type: "bearer" });
      await delay(10);
    }

    const getResponse = await request(app).get("/");
    expect(getResponse.status).toBe(429);
  });

  it("should reset after ttl", async () => {
    jest.useFakeTimers();

    const NEW_LIMIT = 50;
    const TTL_MS = 1800000;
    const postResponse = await request(app)
      .post("/admin/rate-limit-override")
      .send({
        type: "global",
        newLimit: NEW_LIMIT,
        ttlMs: TTL_MS, // 30 minutes
      })
      .expect(200);

    expect(postResponse.body.message).toBe(
      "Rate limit override set successfully."
    );

    for (let i = 0; i < NEW_LIMIT; i++) {
      await request(app).get("/");
      jest.advanceTimersByTime(1000);
    }

    await request(app).get("/").expect(429);

    // Fast-forward time
    jest.advanceTimersByTime(TTL_MS);

    // After advancing time, the rate limit should reset back to default which is one hour
    // So a new request won't reach to the original limit
    await request(app).get("/").expect(200);
  });

  it("should set a per-IP rate limit override successfully", async () => {
    jest.useFakeTimers();

    const IP_ADDRESS = "127.0.0.1";
    const NEW_LIMIT = 10;
    await request(app)
      .post("/admin/rate-limit-override")
      .send({
        type: "ip",
        key: IP_ADDRESS,
        newLimit: NEW_LIMIT,
        ttlMs: 1800000, // 30 minutes
      })
      .expect(200);

    for (let i = 0; i < NEW_LIMIT; i++) {
      await request(app).get("/");
      jest.advanceTimersByTime(1000);
    }

    await request(app).get("/").expect(429);
  });
});
