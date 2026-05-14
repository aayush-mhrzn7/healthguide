import type { Request, Response } from "express";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { and, desc, eq, gt } from "drizzle-orm";

import { db } from "../db/client";
import { emailOtps, users, type DbUser } from "../db/schema";
import type { AuthRequest } from "../middleware/verifyJwt";
import {
  getOtpExpiryMinutes,
  getPasswordResetExpiryMinutes,
  sendPasswordResetEmail,
  sendVerificationOtpEmail,
} from "../lib/sendVerificationEmail";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[A-Za-z])(?=.*\d).+$/,
    "Password must contain at least one letter and one number"
  );

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().min(1, "Email is required").email("Invalid email"),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

const resendVerificationSchema = z.object({
  email: z.string().email(),
});

const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: passwordSchema,
});

const updateProfileSchema = z.object({
  dateOfBirth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  bloodType: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  latitude: z.number().finite().optional().nullable(),
  longitude: z.number().finite().optional().nullable(),
  specialty: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  preferredCommunication: z.string().optional().nullable(),
  primaryCarePreference: z.string().optional().nullable(),
});

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

type JwtUser = Pick<DbUser, "id" | "email" | "name" | "role">;

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
    role: user.role,
  };

  const accessToken = jwt.sign(payload, jwtSecret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign(payload, refreshSecret, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  return { accessToken, refreshToken };
}

function otpExpiresAt() {
  return new Date(
    Date.now() + getOtpExpiryMinutes() * 60 * 1000,
  );
}

async function createOtpForUser(userId: number, email: string) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const codeHash = await bcrypt.hash(code, 10);
  await db.delete(emailOtps).where(eq(emailOtps.userId, userId));
  await db.insert(emailOtps).values({
    userId,
    codeHash,
    expiresAt: otpExpiresAt(),
  });
  await sendVerificationOtpEmail(email, code);
}

function publicUserFields(user: DbUser) {
  return {
    id: user.id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    bloodType: user.bloodType,
    phone: user.phone,
    address: user.address,
    latitude: user.latitude,
    longitude: user.longitude,
    preferredCommunication: user.preferredCommunication,
    primaryCarePreference: user.primaryCarePreference,
  };
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

  const passwordHash = await bcrypt.hash(password, 10);

  if (existing[0]) {
    const prev = existing[0];
    if (prev.emailVerified) {
      return res.status(400).json({ error: "User already exists" });
    }
    await db
      .update(users)
      .set({ name, passwordHash })
      .where(eq(users.id, prev.id));
    try {
      await createOtpForUser(prev.id, prev.email);
    } catch (e) {
      console.error("OTP email failed", e);
      return res.status(503).json({
        error:
          "Could not send verification email. Try again later or contact support.",
      });
    }
    return res.status(200).json({
      needsVerification: true,
      email: prev.email,
    });
  }

  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash,
      emailVerified: false,
    })
    .returning();

  try {
    await createOtpForUser(user.id, user.email);
  } catch (e) {
    console.error("OTP email failed", e);
    await db.delete(users).where(eq(users.id, user.id));
    return res.status(503).json({
      error:
        "Could not send verification email. Try again later or contact support.",
    });
  }

  return res.status(201).json({
    needsVerification: true,
    email: user.email,
  });
}

export async function verifyEmail(req: Request, res: Response) {
  const parseResult = verifyEmailSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid payload",
      issues: parseResult.error.flatten(),
    });
  }

  const { email, code } = parseResult.data;

  const found = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const user = found[0];
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (user.emailVerified) {
    const { accessToken, refreshToken } = generateTokens(user);
    return res
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        user: publicUserFields(user),
        accessToken,
        alreadyVerified: true,
      });
  }

  const otpRows = await db
    .select()
    .from(emailOtps)
    .where(
      and(
        eq(emailOtps.userId, user.id),
        gt(emailOtps.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(emailOtps.createdAt))
    .limit(1);

  const otpRow = otpRows[0];
  if (!otpRow) {
    return res.status(400).json({
      error: "Code expired or not found. Request a new code.",
    });
  }

  const valid = await bcrypt.compare(code, otpRow.codeHash);
  if (!valid) {
    return res.status(400).json({ error: "Invalid verification code" });
  }

  await db.delete(emailOtps).where(eq(emailOtps.userId, user.id));

  const [updated] = await db
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.id, user.id))
    .returning();

  if (!updated) {
    return res.status(500).json({ error: "Verification failed" });
  }

  const { accessToken, refreshToken } = generateTokens(updated);

  return res
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json({
      user: publicUserFields(updated),
      accessToken,
    });
}

export async function resendVerificationEmail(req: Request, res: Response) {
  const parseResult = resendVerificationSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid payload",
      issues: parseResult.error.flatten(),
    });
  }

  const { email } = parseResult.data;

  const found = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const user = found[0];
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  if (user.emailVerified) {
    return res.status(400).json({ error: "Email is already verified" });
  }

  try {
    await createOtpForUser(user.id, user.email);
  } catch (e) {
    console.error("Resend OTP email failed", e);
    return res.status(503).json({
      error: "Could not send email. Try again later.",
    });
  }

  return res.json({ message: "Verification code sent" });
}

function buildPasswordResetToken(user: DbUser) {
  const resetSecret = process.env.PASSWORD_RESET_SECRET || process.env.JWT_SECRET;
  if (!resetSecret) throw new Error("Password reset secret is not configured");

  return jwt.sign(
    {
      sub: user.id.toString(),
      email: user.email,
      purpose: "password_reset",
      role: user.role,
    },
    resetSecret,
    {
      expiresIn: `${getPasswordResetExpiryMinutes()}m`,
    },
  );
}

export async function requestPasswordReset(req: Request, res: Response) {
  const parseResult = requestPasswordResetSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid payload",
      issues: parseResult.error.flatten(),
    });
  }

  const { email } = parseResult.data;
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    // Avoid leaking whether account exists.
    return res.json({
      message: "If an account exists for this email, a reset link has been sent.",
    });
  }

  const frontendBaseUrl = process.env.FRONTEND_URL?.trim() || "http://localhost:3000";
  const token = buildPasswordResetToken(user);
  const resetUrl = `${frontendBaseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

  try {
    await sendPasswordResetEmail({
      userName: user.name,
      userEmail: user.email,
      resetUrl,
    });
  } catch (error) {
    console.error("Password reset email failed", error);
    return res.status(503).json({
      error: "Could not send reset email. Try again later.",
    });
  }

  return res.json({
    message: "If an account exists for this email, a reset link has been sent.",
  });
}

export async function resetPassword(req: Request, res: Response) {
  const parseResult = resetPasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid payload",
      issues: parseResult.error.flatten(),
    });
  }

  const { token, newPassword } = parseResult.data;
  const resetSecret = process.env.PASSWORD_RESET_SECRET || process.env.JWT_SECRET;
  if (!resetSecret) {
    return res.status(500).json({ error: "Password reset secret is not configured" });
  }

  let payload: { sub: string; purpose?: string };
  try {
    payload = jwt.verify(token, resetSecret) as { sub: string; purpose?: string };
  } catch {
    return res.status(400).json({ error: "Invalid or expired reset token" });
  }

  if (payload.purpose !== "password_reset") {
    return res.status(400).json({ error: "Invalid reset token" });
  }

  const userId = Number(payload.sub);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "Invalid reset token" });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const [updated] = await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({ message: "Password updated successfully" });
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

  if (!existingUser.emailVerified) {
    return res.status(403).json({
      error: "Please verify your email before signing in.",
      code: "EMAIL_NOT_VERIFIED",
    });
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
      user: publicUserFields(existingUser),
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
      ...publicUserFields(user),
      specialty: user.specialty,
      bio: user.bio,
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

  const {
    dateOfBirth,
    gender,
    bloodType,
    phone,
    address,
    latitude,
    longitude,
    specialty,
    bio,
    preferredCommunication,
    primaryCarePreference,
  } = parseResult.data;

  const updateValues: Partial<DbUser> = {};

  if (typeof specialty !== "undefined") {
    updateValues.specialty =
      specialty && specialty.trim().length > 0 ? specialty.trim() : null;
  }

  if (typeof bio !== "undefined") {
    updateValues.bio =
      bio && bio.trim().length > 0 ? bio.trim() : null;
  }

  if (typeof preferredCommunication !== "undefined") {
    updateValues.preferredCommunication =
      preferredCommunication && preferredCommunication.trim().length > 0
        ? preferredCommunication.trim()
        : null;
  }

  if (typeof primaryCarePreference !== "undefined") {
    updateValues.primaryCarePreference =
      primaryCarePreference && primaryCarePreference.trim().length > 0
        ? primaryCarePreference.trim()
        : null;
  }

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

  if (typeof latitude !== "undefined") {
    updateValues.latitude = latitude ?? null;
  }

  if (typeof longitude !== "undefined") {
    updateValues.longitude = longitude ?? null;
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
      ...publicUserFields(updated),
      specialty: updated.specialty,
      bio: updated.bio,
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


