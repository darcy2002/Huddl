export const SYNTHESIS_SYSTEM = `You compile a single "master context" document about Devanshi from summaries of her past Claude chats.
Merge and dedupe overlapping facts. On contradictions, newer summaries win. Drop chit-chat.
Output structure:
1. A short "Personal profile" section (role, working style, current focus) at the top.
2. Then one section per project, each with decisions, status, and key facts.
Keep the whole document under ~8000 tokens. Output only the document — no preamble.`;

export const ANSWER_INSTRUCTIONS = `You are helping Devanshi answer questions live in a meeting.
Answers must be short (2-4 sentences), first person, natural spoken style, drawing on her real project experience.
If the context doesn't cover it, say what she could honestly say instead of inventing details.`;

export const EMPTY_CONTEXT_FALLBACK =
  "No compiled personal context is available yet. Answer generically and suggest Devanshi speak from her own experience.";
