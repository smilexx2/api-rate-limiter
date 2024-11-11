import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../types";

const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  let token;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    req.isAuthenticated = false;
    return next();
  }

  try {
    const secretKey = process.env.JWT_SECRET_KEY as string; // Read the secret key from environment variables
    if (!secretKey) {
      throw new Error("JWT_SECRET_KEY is not defined");
    }

    const user = jwt.verify(token, secretKey);
    req.isAuthenticated = true;
    req.user = user;
    next();
  } catch (err) {
    req.isAuthenticated = false;
    next();
  }
};

export default authMiddleware;
