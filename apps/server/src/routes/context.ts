import { Hono } from "hono";
import { desc } from "drizzle-orm";
import { db } from "../db";
import { masterContext } from "../db/schema";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";

export const context = new Hono<AuthEnv>();
context.use("*", requireAuth);

context.get("/", async (c) => {
  const [current] = await db
    .select()
    .from(masterContext)
    .orderBy(desc(masterContext.createdAt))
    .limit(1);
  const versions = await db
    .select({
      id: masterContext.id,
      tokenEstimate: masterContext.tokenEstimate,
      createdAt: masterContext.createdAt,
    })
    .from(masterContext)
    .orderBy(desc(masterContext.createdAt));
  return c.json({ current: current ?? null, versions });
});
