import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { appointmentsRouter } from "./routes/appointments";
import { assessmentsRouter } from "./routes/assessments";
import { doctorsRouter } from "./routes/doctors";
import { db } from "./db/client";
import { users } from "./db/schema";

dotenv.config();

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

async function ensureAdminUser() {
  const adminEmail = "admin@gmail.com";
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (existing[0]) {
    return;
  }

  const passwordHash = await bcrypt.hash("admin", 10);

  await db.insert(users).values({
    name: "Admin",
    email: adminEmail,
    passwordHash,
    role: "admin",
  });
}

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);

  void ensureAdminUser().catch((error) => {
    console.error("Failed to ensure admin user", error);
  });
});
