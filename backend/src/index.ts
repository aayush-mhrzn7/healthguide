import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { appointmentsRouter } from "./routes/appointments";
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
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${PORT}`);

  // Seed default admin user if not present
  void ensureAdminUser().catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Failed to ensure admin user", error);
  });
});

