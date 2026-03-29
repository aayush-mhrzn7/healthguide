import path from "path";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});

