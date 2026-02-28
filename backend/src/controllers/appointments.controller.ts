import type { Request, Response } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { db } from "../db/client";
import {
  appointments,
  users,
  type DbAppointment,
  type DbUser,
} from "../db/schema";
import type { AuthRequest } from "../middleware/verifyJwt";

const createAppointmentSchema = z.object({
  doctorId: z.number().int().positive(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export async function createAppointment(req: Request, res: Response) {
  const { authUser } = req as AuthRequest;

  if (!authUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parseResult = createAppointmentSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid payload",
      issues: parseResult.error.flatten(),
    });
  }

  const { doctorId, startsAt, endsAt } = parseResult.data;

  // Basic check that doctor exists and has doctor role
  const doctor = await db
    .select()
    .from(users)
    .where(and(eq(users.id, doctorId), eq(users.role, "doctor")))
    .limit(1);

  if (!doctor[0]) {
    return res.status(400).json({ error: "Invalid doctor" });
  }

  const [created] = await db
    .insert(appointments)
    .values({
      doctorId,
      patientId: authUser.id,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
    })
    .returning();

  return res.status(201).json({
    appointment: serializeAppointment(created),
  });
}

function serializeAppointment(appt: DbAppointment) {
  return {
    id: appt.id,
    doctorId: appt.doctorId,
    patientId: appt.patientId,
    startsAt: appt.startsAt,
    endsAt: appt.endsAt,
    status: appt.status,
  };
}

export async function getDoctorAppointments(req: Request, res: Response) {
  const { authUser } = req as AuthRequest;

  if (!authUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const rows = await db
    .select({
      appointment: appointments,
      patient: users,
    })
    .from(appointments)
    .leftJoin(users, eq(users.id, appointments.patientId))
    .where(eq(appointments.doctorId, authUser.id));

  const data = rows.map(
    (row: { appointment: DbAppointment; patient: DbUser | null }) => ({
      id: row.appointment.id,
      startsAt: row.appointment.startsAt,
      endsAt: row.appointment.endsAt,
      status: row.appointment.status,
      patientName: row.patient?.name ?? "Unknown patient",
    }),
  );

  return res.json({ appointments: data });
}

