import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import "dotenv/config";

export type AuthUserPayload = {
  id: number;
  email: string;
  name: string;
};

export interface AuthRequest extends Request {
  authUser?: AuthUserPayload;
}

export function verifyJwt(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice("Bearer ".length);

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return res.status(500).json({ error: "JWT secrets are not configured" });
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as {
      sub: string;
      email: string;
      name: string;
    };

    const userId = Number(payload.sub);

    if (Number.isNaN(userId)) {
      return res.status(401).json({ error: "Invalid token" });
    }

    (req as AuthRequest).authUser = {
      id: userId,
      email: payload.email,
      name: payload.name,
    };

    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

