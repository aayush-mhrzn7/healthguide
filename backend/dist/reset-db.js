"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./loadEnv");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("./db/client");
async function resetDatabase() {
    await client_1.db.execute((0, drizzle_orm_1.sql) `DROP TABLE IF EXISTS appointments CASCADE;`);
    await client_1.db.execute((0, drizzle_orm_1.sql) `DROP TABLE IF EXISTS assessments CASCADE;`);
    await client_1.db.execute((0, drizzle_orm_1.sql) `DROP TABLE IF EXISTS email_otps CASCADE;`);
    await client_1.db.execute((0, drizzle_orm_1.sql) `DROP TABLE IF EXISTS users CASCADE;`);
    await client_1.db.execute((0, drizzle_orm_1.sql) `
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      role TEXT NOT NULL DEFAULT 'user',
      specialty TEXT,
      bio TEXT,
      date_of_birth DATE,
      gender TEXT,
      blood_type TEXT,
      phone TEXT,
      address TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      preferred_communication TEXT,
      primary_care_preference TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
    await client_1.db.execute((0, drizzle_orm_1.sql) `
    CREATE TABLE email_otps (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
    await client_1.db.execute((0, drizzle_orm_1.sql) `
    CREATE TABLE assessments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      answers JSONB NOT NULL,
      predicted_disease TEXT NOT NULL,
      recommended_specialty TEXT NOT NULL,
      confidence TEXT NOT NULL,
      top_predictions JSONB,
      reasoning TEXT,
      selected_symptoms JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
    await client_1.db.execute((0, drizzle_orm_1.sql) `
    CREATE TABLE appointments (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      starts_at TIMESTAMP NOT NULL,
      ends_at TIMESTAMP NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
    const passwordHash = await bcryptjs_1.default.hash("Admin@123", 10);
    await client_1.db.execute((0, drizzle_orm_1.sql) `
    INSERT INTO users (name, email, password_hash, role, email_verified)
    VALUES ('Admin', 'admin@gmail.com', ${passwordHash}, 'admin', TRUE);
  `);
    console.log("Database reset complete.");
    console.log("Seeded admin user: admin@gmail.com / Admin@123");
}
void resetDatabase().catch((error) => {
    console.error("Failed to reset database", error);
    process.exitCode = 1;
});
