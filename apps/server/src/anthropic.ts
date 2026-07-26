import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-sonnet-4-6";
export const SUMMARY_MODEL = "claude-haiku-4-5"; // cheap/fast, for bulk import summarization
export const MASTER_CONTEXT_MAX_TOKENS = 8192; // synthesis output cap (~8k target)
export const ANSWER_MAX_TOKENS = 1024; // short spoken answers
export const IMPORT_SUMMARY_MAX_TOKENS = 700; // per-conversation import summary

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return client;
}

export async function estimateTokens(content: string): Promise<number> {
  try {
    const r = await anthropic().messages.countTokens({
      model: MODEL,
      messages: [{ role: "user", content }],
    });
    return r.input_tokens;
  } catch {
    return Math.ceil(content.length / 4);
  }
}
