import "./loadEnv";
import bcrypt from "bcryptjs";

import { db } from "./db/client";
import { appointments, assessments, emailOtps, users } from "./db/schema";
import seedData from "../users.json";

type SeedPatient = {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

async function seed() {
  console.log("🗑️  Dropping all rows (appointments → assessments → users)…");
  await db.delete(appointments);
  await db.delete(assessments);
  await db.delete(emailOtps);
  await db.delete(users);

  const { sql } = await import("drizzle-orm");
  await db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE email_otps_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE assessments_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE appointments_id_seq RESTART WITH 1`);
  console.log("   Done.\n");

  console.log(`👤  Seeding admin: ${seedData.admin.email}`);
  await db.insert(users).values({
    name: "Admin",
    email: seedData.admin.email,
    passwordHash: await bcrypt.hash(seedData.admin.password, 10),
    role: "admin",
    emailVerified: true,
  });

  console.log(`👤  Seeding user:  ${seedData.user.email}`);
  const [primaryUser] = await db.insert(users).values({
    name: "Aayush",
    email: seedData.user.email,
    passwordHash: await bcrypt.hash(seedData.user.password, 10),
    role: "user",
    emailVerified: true,
    phone: seedData.user.phone ?? "+977 9800000000",
    address: seedData.user.address ?? "Kathmandu, Nepal",
    latitude: seedData.user.latitude ?? 27.7172,
    longitude: seedData.user.longitude ?? 85.324,
  }).returning();

  const userByEmail = new Map<string, number>([[seedData.user.email, primaryUser.id]]);
  const patients = (seedData.patients ?? []) as SeedPatient[];
  for (const patient of patients) {
    console.log(`👤  Seeding patient: ${patient.email}`);
    const [created] = await db.insert(users).values({
      name: patient.name,
      email: patient.email,
      passwordHash: await bcrypt.hash(patient.password, 10),
      role: "user",
      emailVerified: true,
      phone: patient.phone,
      address: patient.address,
      latitude: patient.latitude,
      longitude: patient.longitude,
    }).returning();
    userByEmail.set(patient.email, created.id);
  }

  const doctorByEmail = new Map<string, number>();
  for (const doc of seedData.doctors) {
    console.log(`🩺  Seeding doctor: ${doc.email} (${doc.specialty})`);
    const [created] = await db.insert(users).values({
      name: doc.name,
      email: doc.email,
      passwordHash: await bcrypt.hash(doc.password, 10),
      role: "doctor",
      specialty: doc.specialty,
      bio: doc.bio,
      phone: doc.phone,
      address: doc.address,
      latitude: doc.latitude,
      longitude: doc.longitude,
      emailVerified: true,
    }).returning();
    doctorByEmail.set(doc.email, created.id);
  }

  const now = new Date();
  for (const item of seedData.assessments ?? []) {
    const userId = userByEmail.get(item.userEmail);
    if (!userId) continue;
    console.log(`🧾  Seeding assessment: ${item.predictedDisease}`);
    await db.insert(assessments).values({
      userId,
      answers: item.answers,
      predictedDisease: item.predictedDisease,
      recommendedSpecialty: item.recommendedSpecialty,
      confidence: item.confidence,
      topPredictions: item.topPredictions,
      reasoning: item.reasoning,
      llmAdvice: item.llmAdvice,
      selectedSymptoms: item.selectedSymptoms,
      createdAt: new Date(now.getTime() - item.daysAgo * 24 * 60 * 60 * 1000),
    });
  }

  for (const item of seedData.appointments ?? []) {
    const patientId = userByEmail.get(item.patientEmail);
    const doctorId = doctorByEmail.get(item.doctorEmail);
    if (!patientId || !doctorId) continue;
    const startsAt = new Date(now.getTime() + item.startsInHours * 60 * 60 * 1000);
    console.log(`📅  Seeding appointment: ${item.status} (${item.patientEmail})`);
    await db.insert(appointments).values({
      patientId,
      doctorId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
      status: item.status,
    });
  }

  console.log("\n✅  Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
