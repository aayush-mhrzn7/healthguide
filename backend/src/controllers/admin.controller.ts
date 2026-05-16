import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";

import { db } from "../db/client";
import {
  appointments,
  assessments,
  users,
  type DbAppointment,
  type DbAssessment,
  type DbUser,
} from "../db/schema";
import { sendDoctorWelcomeEmail } from "../lib/sendVerificationEmail";
import { DOCTOR_SPECIALTIES } from "../constants/specialties";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[A-Za-z])(?=.*\d).+$/,
    "Password must contain at least one letter and one number"
  );

const createDoctorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: passwordSchema,
  phone: z.string().trim().optional().nullable(),
  clinicLocation: z.string().optional().nullable(),
  clinicLatitude: z.number().finite().optional().nullable(),
  clinicLongitude: z.number().finite().optional().nullable(),
  specialty: z
    .enum(DOCTOR_SPECIALTIES)
    .optional()
    .default("general"),
});

export async function createDoctor(req: Request, res: Response) {
  const parseResult = createDoctorSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid payload",
      issues: parseResult.error.flatten(),
    });
  }

  const {
    name,
    email,
    password,
    phone,
    specialty,
    clinicLocation,
    clinicLatitude,
    clinicLongitude,
  } = parseResult.data;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing[0]) {
    return res.status(400).json({ error: "User with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [doctor] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash,
      role: "doctor",
      specialty,
      phone: phone && phone.trim() ? phone.trim() : null,
      address: clinicLocation && clinicLocation.trim() ? clinicLocation.trim() : null,
      latitude: clinicLatitude ?? null,
      longitude: clinicLongitude ?? null,
      emailVerified: true,
    })
    .returning();

  const frontendBaseUrl =
    process.env.FRONTEND_URL?.trim() || "http://localhost:3000";
  const resetSecret =
    process.env.PASSWORD_RESET_SECRET || process.env.JWT_SECRET;
  if (!resetSecret) {
    return res
      .status(500)
      .json({ error: "Password reset secret is not configured" });
  }
  const passwordResetToken = jwt.sign(
    {
      sub: doctor.id.toString(),
      email: doctor.email,
      purpose: "password_reset",
      role: doctor.role,
    },
    resetSecret,
    { expiresIn: "60m" },
  );
  const resetUrl = `${frontendBaseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(passwordResetToken)}`;

  try {
    await sendDoctorWelcomeEmail({
      doctorName: doctor.name,
      doctorEmail: doctor.email,
      temporaryPassword: password,
      changePasswordUrl: resetUrl,
    });
  } catch (error) {
    console.error("Failed to send doctor welcome email", error);
  }

  return res.status(201).json({
    doctor: {
      id: doctor.id.toString(),
      name: doctor.name,
      email: doctor.email,
      role: doctor.role,
      specialty: doctor.specialty,
      phone: doctor.phone,
      clinicLocation: doctor.address,
      clinicLatitude: doctor.latitude,
      clinicLongitude: doctor.longitude,
    },
  });
}

export async function getAdminStats(_req: Request, res: Response) {
  const [allUsers, doctors, allAppointments, allAssessments] = await Promise.all<
    DbUser[] | DbAppointment[] | DbAssessment[]
  >([
    db.select().from(users),
    db.select().from(users).where(eq(users.role, "doctor")),
    db.select().from(appointments),
    db.select().from(assessments),
  ]);

  const totalUsers = (allUsers as DbUser[]).length;
  const totalDoctors = (doctors as DbUser[]).length;
  const totalAppointments = (allAppointments as DbAppointment[]).length;
  const assessmentRows = allAssessments as DbAssessment[];

  const byDisease = new Map<string, number>();
  const byConfidence = new Map<string, number>();
  const byAppointmentStatus = new Map<string, number>();

  for (const row of assessmentRows) {
    byDisease.set(row.predictedDisease, (byDisease.get(row.predictedDisease) ?? 0) + 1);
    byConfidence.set(row.confidence, (byConfidence.get(row.confidence) ?? 0) + 1);
  }

  for (const row of allAppointments as DbAppointment[]) {
    const status = row.status || "unknown";
    byAppointmentStatus.set(status, (byAppointmentStatus.get(status) ?? 0) + 1);
  }

  const diseaseDistribution = Array.from(byDisease.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  const confidenceDistribution = ["high", "medium", "low"].map((key) => ({
    label: key,
    value: byConfidence.get(key) ?? 0,
  }));

  const appointmentStatusDistribution = Array.from(byAppointmentStatus.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  return res.json({
    stats: {
      totalUsers,
      totalDoctors,
      totalAppointments,
      totalAssessments: assessmentRows.length,
      diseaseDistribution,
      confidenceDistribution,
      appointmentStatusDistribution,
    },
  });
}

type ServiceHealth = {
  status: "healthy" | "degraded";
  latencyMs: number | null;
};

export async function getAdminHealth(_req: Request, res: Response) {
  const startedAt = Date.now();
  const mlApiUrl = process.env.ML_API_URL ?? "http://localhost:8001";

  const dbHealthPromise = (async (): Promise<ServiceHealth> => {
    const t0 = Date.now();
    try {
      await db.execute(sql`select 1`);
      return { status: "healthy", latencyMs: Date.now() - t0 };
    } catch {
      return { status: "degraded", latencyMs: null };
    }
  })();

  const modelHealthPromise = (async (): Promise<ServiceHealth> => {
    const t0 = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${mlApiUrl.replace(/\/$/, "")}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return { status: "degraded", latencyMs: Date.now() - t0 };
      }

      return { status: "healthy", latencyMs: Date.now() - t0 };
    } catch {
      return { status: "degraded", latencyMs: null };
    }
  })();

  const [database, modelApi] = await Promise.all([dbHealthPromise, modelHealthPromise]);
  const backendLatencyMs = Date.now() - startedAt;

  return res.json({
    health: {
      backend: {
        status: "healthy" as const,
        latencyMs: backendLatencyMs,
      },
      database,
      modelApi,
      checkedAt: new Date().toISOString(),
    },
  });
}
