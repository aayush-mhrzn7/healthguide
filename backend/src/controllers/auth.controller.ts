import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import "dotenv/config";
import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { users, type DbUser } from "../db/schema";
import type { AuthRequest } from "../middleware/verifyJwt";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const updateProfileSchema = z.object({
  dateOfBirth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  bloodType: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

type JwtUser = Pick<DbUser, "id" | "email" | "name">;

function generateTokens(user: JwtUser) {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!jwtSecret || !refreshSecret) {
    throw new Error("JWT secrets are not configured");
  }

  const payload = {
    sub: user.id.toString(),
    email: user.email,
    name: user.name,
  };

  const accessToken = jwt.sign(payload, jwtSecret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign(payload, refreshSecret, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  return { accessToken, refreshToken };
}

export async function signup(req: Request, res: Response) {
  const parseResult = signupSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid payload",
      issues: parseResult.error.flatten(),
    });
  }

  const { name, email, password } = parseResult.data;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return res.status(400).json({ error: "User already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash,
    })
    .returning();

  const { accessToken, refreshToken } = generateTokens(user);

  return res
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .status(201)
    .json({
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        bloodType: user.bloodType,
        phone: user.phone,
        address: user.address,
        preferredCommunication: user.preferredCommunication,
        primaryCarePreference: user.primaryCarePreference,
      },
      accessToken,
    });
}

export async function login(req: Request, res: Response) {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid payload",
      issues: parseResult.error.flatten(),
    });
  }

  const { email, password } = parseResult.data;

  const found = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const existingUser = found[0];

  if (!existingUser) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const isValidPassword = await bcrypt.compare(
    password,
    existingUser.passwordHash,
  );

  if (!isValidPassword) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const { accessToken, refreshToken } = generateTokens(existingUser);

  return res
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json({
      user: {
        id: existingUser.id.toString(),
        name: existingUser.name,
        email: existingUser.email,
        dateOfBirth: existingUser.dateOfBirth,
        gender: existingUser.gender,
        bloodType: existingUser.bloodType,
        phone: existingUser.phone,
        address: existingUser.address,
        preferredCommunication: existingUser.preferredCommunication,
        primaryCarePreference: existingUser.primaryCarePreference,
      },
      accessToken,
    });
}

export async function refresh(req: Request, res: Response) {
  const cookieToken = req.cookies?.refreshToken as string | undefined;
  const bodyParse = refreshSchema.safeParse(req.body);

  const refreshToken =
    cookieToken ?? (bodyParse.success ? bodyParse.data.refreshToken : undefined);

  if (!refreshToken) {
    return res.status(401).json({ error: "No refresh token provided" });
  }

  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  const jwtSecret = process.env.JWT_SECRET;

  if (!refreshSecret || !jwtSecret) {
    return res.status(500).json({ error: "JWT secrets are not configured" });
  }

  try {
    const payload = jwt.verify(refreshToken, refreshSecret) as {
      sub: string;
      email: string;
      name: string;
    };

    const userId = Number(payload.sub);

    if (Number.isNaN(userId)) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const found = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = found[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    return res
      .cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        accessToken,
      });
  } catch {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
}

export async function getMe(req: Request, res: Response) {
  const { authUser } = req as AuthRequest;

  if (!authUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const found = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  const user = found[0];

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({
    user: {
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      bloodType: user.bloodType,
      phone: user.phone,
      address: user.address,
      preferredCommunication: user.preferredCommunication,
      primaryCarePreference: user.primaryCarePreference,
    },
  });
}

export async function updateMe(req: Request, res: Response) {
  const { authUser } = req as AuthRequest;

  if (!authUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parseResult = updateProfileSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid payload",
      issues: parseResult.error.flatten(),
    });
  }

  const { dateOfBirth, gender, bloodType, phone, address } = parseResult.data;

  const updateValues: Partial<DbUser> = {};

  if (typeof dateOfBirth !== "undefined") {
    updateValues.dateOfBirth =
      dateOfBirth && dateOfBirth.trim().length > 0
        ? new Date(dateOfBirth)
        : null;
  }

  if (typeof gender !== "undefined") {
    updateValues.gender =
      gender && gender.trim().length > 0 ? gender.trim() : null;
  }

  if (typeof bloodType !== "undefined") {
    updateValues.bloodType =
      bloodType && bloodType.trim().length > 0 ? bloodType.trim() : null;
  }

  if (typeof phone !== "undefined") {
    updateValues.phone =
      phone && phone.trim().length > 0 ? phone.trim() : null;
  }

  if (typeof address !== "undefined") {
    updateValues.address =
      address && address.trim().length > 0 ? address.trim() : null;
  }

  const [updated] = await db
    .update(users)
    .set(updateValues)
    .where(eq(users.id, authUser.id))
    .returning();

  if (!updated) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({
    user: {
      id: updated.id.toString(),
      name: updated.name,
      email: updated.email,
      dateOfBirth: updated.dateOfBirth,
      gender: updated.gender,
      bloodType: updated.bloodType,
      phone: updated.phone,
      address: updated.address,
      preferredCommunication: updated.preferredCommunication,
      primaryCarePreference: updated.primaryCarePreference,
    },
  });
}

export async function logout(req: Request, res: Response) {
  return res
    .clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    })
    .status(200)
    .json({ message: "Logged out" });
}


