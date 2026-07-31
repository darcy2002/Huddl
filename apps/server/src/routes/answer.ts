import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { desc } from "drizzle-orm";
import { answerRequestSchema } from "../schemas.js";
import { db } from "../db/index.js";
import { masterContext } from "../db/schema.js";
import { requireAuth, type AuthEnv } from "../middleware/require-auth.js";
import { anthropic, MODEL, ANSWER_MAX_TOKENS } from "../anthropic.js";
import { ANSWER_INSTRUCTIONS, EMPTY_CONTEXT_FALLBACK } from "../prompts.js";

export const answer = new Hono<AuthEnv>();
answer.use("*", requireAuth); // extension uses x-api-key (session via enableSessionForAPIKeys)

answer.post("/", async (c) => {
  const parsed = answerRequestSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  // Read master context BEFORE the stream starts (neon-http is stateless HTTP).
  const [latest] = await db
    .select()
    .from(masterContext)
    .orderBy(desc(masterContext.createdAt))
    .limit(1);
  const contextText = latest?.content ?? EMPTY_CONTEXT_FALLBACK;

  const ms = anthropic().messages.stream({
    model: MODEL,
    max_tokens: ANSWER_MAX_TOKENS,
    thinking: { type: "disabled" }, // latency-sensitive
    system: [{ type: "text", text: contextText, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `${ANSWER_INSTRUCTIONS}\n\nTranscript window:\n${parsed.data.transcriptWindow}`,
      },
    ],
  });

  return streamSSE(c, async (sse) => {
    sse.onAbort(() => ms.abort()); // client hung up -> stop Claude
    try {
      for await (const event of ms) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          await sse.writeSSE({ event: "delta", data: event.delta.text });
        }
      }
      await sse.writeSSE({ event: "done", data: "[DONE]" });
    } catch (err) {
      // Hono onError does not fire after the stream has started — emit our own.
      await sse.writeSSE({ event: "error", data: (err as Error).message });
    }
  });
});
