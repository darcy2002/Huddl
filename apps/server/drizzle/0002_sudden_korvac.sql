ALTER TABLE "chat_summaries" ADD COLUMN "source_uuid" text;--> statement-breakpoint
ALTER TABLE "chat_summaries" ADD CONSTRAINT "chat_summaries_source_uuid_unique" UNIQUE("source_uuid");