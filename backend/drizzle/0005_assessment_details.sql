ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "top_predictions" jsonb;
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "reasoning" text;
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "selected_symptoms" jsonb;
