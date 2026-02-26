CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"date_of_birth" date,
	"gender" text,
	"blood_type" text,
	"phone" text,
	"address" text,
	"preferred_communication" text,
	"primary_care_preference" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
