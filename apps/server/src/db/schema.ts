import { pgTable, text, uuid, date, timestamp } from "drizzle-orm/pg-core";

export const chatSummaries = pgTable("chat_summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  project: text("project").notNull(),
  date: date("date").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
