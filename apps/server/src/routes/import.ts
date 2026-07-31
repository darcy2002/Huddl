import { Hono } from "hono";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { chatSummaries } from "../db/schema.js";
import { requireAuth, type AuthEnv } from "../middleware/require-auth.js";
import { anthropic, SUMMARY_MODEL, IMPORT_SUMMARY_MAX_TOKENS } from "../anthropic.js";
import { IMPORT_SUMMARY_SYSTEM } from "../prompts.js";

// One batch of conversations to summarize + store. The client sends the whole
// export in batches so it can show progress; each item is one conversation.
const importSchema = z.object({
  items: z
    .array(
      z.object({
        // Present for export-based imports (conversation uuid) → enables dedup.
        // Absent for pasted chats, which are always treated as new.
        sourceUuid: z.string().min(1).optional(),
        project: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
        title: z.string().min(1),
        rawText: z.string().min(1),
      }),
    )
    .min(1)
    .max(25),
});

export const importRoute = new Hono<AuthEnv>();
importRoute.use("*", requireAuth);

async function summarize(rawText: string): Promise<string | null> {
  const res = await anthropic().messages.create({
    model: SUMMARY_MODEL,
    max_tokens: IMPORT_SUMMARY_MAX_TOKENS,
    system: IMPORT_SUMMARY_SYSTEM,
    messages: [{ role: "user", content: rawText }],
  });
  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  return !text || text === "SKIP" ? null : text;
}

// Bounded-concurrency map so a batch of conversations summarizes in parallel
// without firing all of them at Anthropic at once.
async function mapPool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

importRoute.post("/", async (c) => {
  const parsed = importSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const { items } = parsed.data;

  // Skip conversations already imported (dedup by the conversation uuid).
  // Pasted chats carry no sourceUuid and are always treated as new.
  const uuids = items.map((it) => it.sourceUuid).filter((u): u is string => !!u);
  const seen = new Set<string>();
  if (uuids.length) {
    const existing = await db
      .select({ sourceUuid: chatSummaries.sourceUuid })
      .from(chatSummaries)
      .where(inArray(chatSummaries.sourceUuid, uuids));
    for (const e of existing) if (e.sourceUuid) seen.add(e.sourceUuid);
  }
  const fresh = items.filter((it) => !it.sourceUuid || !seen.has(it.sourceUuid));

  const summarized = await mapPool(fresh, 4, async (it) => {
    try {
      const content = await summarize(it.rawText);
      if (!content) return null;
      return {
        project: it.project,
        date: it.date,
        title: it.title,
        content,
        sourceUuid: it.sourceUuid,
      };
    } catch {
      return null; // a single failed summary shouldn't fail the batch
    }
  });

  const toInsert = summarized.filter((s): s is NonNullable<typeof s> => s !== null);
  let inserted = 0;
  if (toInsert.length) {
    const rows = await db
      .insert(chatSummaries)
      .values(toInsert as (typeof chatSummaries.$inferInsert)[])
      .onConflictDoNothing({ target: chatSummaries.sourceUuid })
      .returning({ id: chatSummaries.id });
    inserted = rows.length;
  }

  return c.json({ inserted, skipped: items.length - inserted });
});
