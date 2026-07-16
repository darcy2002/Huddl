import { pgTable, text, uuid, date, timestamp, integer } from "drizzle-orm/pg-core";

export const chatSummaries = pgTable("chat_summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  project: text("project").notNull(),
  date: date("date").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Append-only versioning: latest row by created_at is the live master context.
export const masterContext = pgTable("master_context", {
  id: uuid("id").primaryKey().defaultRandom(),
  content: text("content").notNull(),
  tokenEstimate: integer("token_estimate").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
