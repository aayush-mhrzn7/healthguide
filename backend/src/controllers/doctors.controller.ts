import type { Request, Response } from "express";
import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { users } from "../db/schema";

export async function listDoctors(req: Request, res: Response) {
  const specialty = req.query.specialty as string | undefined;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      specialty: users.specialty,
    })
    .from(users)
    .where(eq(users.role, "doctor"));

  const filtered = specialty
    ? rows.filter(
        (d) => (d.specialty ?? "general") === specialty
      )
    : rows;

  return res.json({
    doctors: filtered.map((d) => ({
      id: d.id,
      name: d.name,
      email: d.email,
      specialty: d.specialty ?? "general",
    })),
  });
}
