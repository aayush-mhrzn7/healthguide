ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean;
UPDATE "users" SET "email_verified" = true WHERE "email_verified" IS NULL;
ALTER TABLE "users" ALTER COLUMN "email_verified" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "email_verified" SET DEFAULT false;

CREATE TABLE IF NOT EXISTS "email_otps" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"code_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "email_otps_user_id_idx" ON "email_otps" ("user_id");
