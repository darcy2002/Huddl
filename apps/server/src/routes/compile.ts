import { Hono } from "hono";
import type { Context } from "hono";
import { db } from "../db";
import { chatSummaries, masterContext } from "../db/schema";
import { cronOrAuth } from "../middleware/cron-or-auth";
import { type AuthEnv } from "../middleware/require-auth";
import { anthropic, estimateTokens, MODEL, MASTER_CONTEXT_MAX_TOKENS } from "../anthropic";
import { SYNTHESIS_SYSTEM } from "../prompts";

export const compile = new Hono<AuthEnv>();
compile.use("*", cronOrAuth);

async function recompile(c: Context) {
  const rows = await db.select().from(chatSummaries).orderBy(chatSummaries.date);
  if (rows.length === 0) return c.json({ skipped: true, reason: "no summaries" });

  const input = rows
    .map((r) => `## ${r.project} — ${r.title} (${r.date})\n${r.content}`)
    .join("\n\n");

  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: MASTER_CONTEXT_MAX_TOKENS,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: SYNTHESIS_SYSTEM,
    messages: [{ role: "user", content: input }],
  });

  const content = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");

  const tokenEstimate = await estimateTokens(content);
  const [row] = await db.insert(masterContext).values({ content, tokenEstimate }).returning();
  return c.json(row, 201);
}

compile.get("/", recompile); // Vercel Cron (GET + Bearer CRON_SECRET)
compile.post("/", recompile); // dashboard "Recompile now"
