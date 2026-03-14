"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointments = exports.assessments = exports.users = exports.USER_ROLES = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.USER_ROLES = ["user", "doctor", "admin"];
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    passwordHash: (0, pg_core_1.text)("password_hash").notNull(),
    role: (0, pg_core_1.text)("role").notNull().default("user"),
    specialty: (0, pg_core_1.text)("specialty"), // For doctors: e.g. "general", "cardiology", "respiratory"
    dateOfBirth: (0, pg_core_1.date)("date_of_birth", { mode: "date" }),
    gender: (0, pg_core_1.text)("gender"),
    bloodType: (0, pg_core_1.text)("blood_type"),
    phone: (0, pg_core_1.text)("phone"),
    address: (0, pg_core_1.text)("address"),
    preferredCommunication: (0, pg_core_1.text)("preferred_communication"),
    primaryCarePreference: (0, pg_core_1.text)("primary_care_preference"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: "date" })
        .defaultNow()
        .notNull(),
});
exports.assessments = (0, pg_core_1.pgTable)("assessments", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    answers: (0, pg_core_1.jsonb)("answers").notNull(), // { [questionId]: boolean }
    predictedDisease: (0, pg_core_1.text)("predicted_disease").notNull(),
    recommendedSpecialty: (0, pg_core_1.text)("recommended_specialty").notNull(),
    confidence: (0, pg_core_1.text)("confidence").notNull(), // "high" | "medium" | "low"
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: "date" })
        .defaultNow()
        .notNull(),
});
exports.appointments = (0, pg_core_1.pgTable)("appointments", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    patientId: (0, pg_core_1.integer)("patient_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    doctorId: (0, pg_core_1.integer)("doctor_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    startsAt: (0, pg_core_1.timestamp)("starts_at", { mode: "date" }).notNull(),
    endsAt: (0, pg_core_1.timestamp)("ends_at", { mode: "date" }).notNull(),
    status: (0, pg_core_1.text)("status").notNull().default("scheduled"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { mode: "date" })
        .defaultNow()
        .notNull(),
});
