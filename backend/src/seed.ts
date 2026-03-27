/**
 * Seed script — drops all data and re-seeds from users.json.
 * Run with: npx ts-node --transpile-only src/seed.ts
 */

import bcrypt from "bcryptjs";
import "dotenv/config";

import { db } from "./db/client";
import { appointments, assessments, users } from "./db/schema";
import seedData from "../users.json";

async function seed() {
  console.log("🗑️  Dropping all rows (appointments → assessments → users)…");
  await db.delete(appointments);
  await db.delete(assessments);
  await db.delete(users);

  // Reset sequences so IDs always start from 1
  const { sql } = await import("drizzle-orm");
  await db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE assessments_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE appointments_id_seq RESTART WITH 1`);
  console.log("   Done.\n");

  // ── Admin ────────────────────────────────────────────────────────────────
  console.log(`👤  Seeding admin: ${seedData.admin.email}`);
  await db.insert(users).values({
    name: "Admin",
    email: seedData.admin.email,
    passwordHash: await bcrypt.hash(seedData.admin.password, 10),
    role: "admin",
  });

  // ── Regular user ─────────────────────────────────────────────────────────
  console.log(`👤  Seeding user:  ${seedData.user.email}`);
  await db.insert(users).values({
    name: "Aayush",
    email: seedData.user.email,
    passwordHash: await bcrypt.hash(seedData.user.password, 10),
    role: "user",
  });

  // ── Doctors ──────────────────────────────────────────────────────────────
  for (const doc of seedData.doctors) {
    console.log(`🩺  Seeding doctor: ${doc.email} (${doc.specialty})`);
    await db.insert(users).values({
      name: doc.name,
      email: doc.email,
      passwordHash: await bcrypt.hash(doc.password, 10),
      role: "doctor",
      specialty: doc.specialty,
    });
  }

  console.log("\n✅  Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
