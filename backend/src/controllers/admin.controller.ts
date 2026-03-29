import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "../db/client";
import {
  appointments,
  users,
  type DbAppointment,
  type DbUser,
} from "../db/schema";

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
  clinicLocation: z.string().optional().nullable(),
  specialty: z
    .enum(["general", "respiratory", "allergy", "cardiology"])
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

  const { name, email, password, specialty, clinicLocation } = parseResult.data;

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
      address: clinicLocation && clinicLocation.trim() ? clinicLocation.trim() : null,
      emailVerified: true,
    })
    .returning();

  return res.status(201).json({
    doctor: {
      id: doctor.id.toString(),
      name: doctor.name,
      email: doctor.email,
      role: doctor.role,
      specialty: doctor.specialty,
      clinicLocation: doctor.address,
    },
  });
}

export async function getAdminStats(_req: Request, res: Response) {
  const [allUsers, doctors, allAppointments] = await Promise.all<
    DbUser[] | DbAppointment[]
  >([
    db.select().from(users),
    db.select().from(users).where(eq(users.role, "doctor")),
    db.select().from(appointments),
  ]);

  const totalUsers = (allUsers as DbUser[]).length;
  const totalDoctors = (doctors as DbUser[]).length;
  const totalAppointments = (allAppointments as DbAppointment[]).length;

  return res.json({
    stats: {
      totalUsers,
      totalDoctors,
      totalAppointments,
    },
  });
}

