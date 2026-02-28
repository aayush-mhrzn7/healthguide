import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import "dotenv/config";

import type { UserRole } from "../db/schema";

export type AuthUserPayload = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
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
      role?: UserRole;
    };

    const userId = Number(payload.sub);

    if (Number.isNaN(userId)) {
      return res.status(401).json({ error: "Invalid token" });
    }

    (req as AuthRequest).authUser = {
      id: userId,
      email: payload.email,
      name: payload.name,
      role: payload.role ?? "user",
    };

    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { authUser } = req as AuthRequest;

    if (!authUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!allowedRoles.includes(authUser.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return next();
  };
}
