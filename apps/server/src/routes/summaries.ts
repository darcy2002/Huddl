import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createSummarySchema, updateSummarySchema } from "@huddl/shared";
import { db } from "../db";
import { chatSummaries } from "../db/schema";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";

export const summaries = new Hono<AuthEnv>();

summaries.use("*", requireAuth);

summaries.post("/", async (c) => {
  const parsed = createSummarySchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const [row] = await db.insert(chatSummaries).values(parsed.data).returning();
  return c.json(row, 201);
});

summaries.get("/", async (c) => {
  const rows = await db.select().from(chatSummaries).orderBy(chatSummaries.date);
  return c.json(rows);
});

summaries.patch("/:id", async (c) => {
  const parsed = updateSummarySchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const [row] = await db
    .update(chatSummaries)
    .set(parsed.data)
    .where(eq(chatSummaries.id, c.req.param("id")))
    .returning();
  return row ? c.json(row) : c.json({ error: "not found" }, 404);
});

summaries.delete("/:id", async (c) => {
  const [row] = await db
    .delete(chatSummaries)
    .where(eq(chatSummaries.id, c.req.param("id")))
    .returning();
  return row ? c.json({ ok: true }) : c.json({ error: "not found" }, 404);
});
