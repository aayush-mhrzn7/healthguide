import { pgTable, serial, text, timestamp, date } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),

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

export type DbUser = typeof users.$inferSelect;
export type NewDbUser = typeof users.$inferInsert;

