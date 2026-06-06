import "./loadEnv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { appointmentsRouter } from "./routes/appointments";
import { assessmentsRouter } from "./routes/assessments";
import { doctorsRouter } from "./routes/doctors";
import { uploadsRouter } from "./routes/uploads";
import { db } from "./db/client";
import { users } from "./db/schema";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/assessments", assessmentsRouter);
app.use("/api/doctors", doctorsRouter);
app.use("/api/uploads", uploadsRouter);

async function ensureAdminUser() {
  const adminEmail = "admin@gmail.com";
  const adminPassword = "Admin@123";
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (existing[0]) {
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await db.insert(users).values({
    name: "Admin",
    email: adminEmail,
    passwordHash,
    role: "admin",
    emailVerified: true,
  });
}

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);

  void ensureAdminUser().catch((error) => {
    console.error("Failed to ensure admin user", error);
  });
});
