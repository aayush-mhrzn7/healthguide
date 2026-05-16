ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_image_url" text;
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "llm_advice" jsonb;
ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'pending';
