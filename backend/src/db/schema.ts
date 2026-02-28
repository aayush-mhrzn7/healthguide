import {
  pgTable,
  serial,
  text,
  timestamp,
  date,
  integer,
} from "drizzle-orm/pg-core";

export const USER_ROLES = ["user", "doctor", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),

  role: text("role").notNull().default("user"),

  dateOfBirth: date("date_of_birth", { mode: "date" }),
  gender: text("gender"),
  bloodType: text("blood_type"),
  phone: text("phone"),
  address: text("address"),
  preferredCommunication: text("preferred_communication"),
  primaryCarePreference: text("primary_care_preference"),

  createdAt: timestamp("created_at", { mode: "date" })
    .defaultNow()
    .notNull(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  doctorId: integer("doctor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at", { mode: "date" }).notNull(),
  endsAt: timestamp("ends_at", { mode: "date" }).notNull(),
  status: text("status").notNull().default("scheduled"),
  createdAt: timestamp("created_at", { mode: "date" })
    .defaultNow()
    .notNull(),
});

export type DbUser = typeof users.$inferSelect;
export type NewDbUser = typeof users.$inferInsert;
export type DbAppointment = typeof appointments.$inferSelect;
export type NewDbAppointment = typeof appointments.$inferInsert;

