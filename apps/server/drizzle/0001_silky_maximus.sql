CREATE TABLE "master_context" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"token_estimate" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
