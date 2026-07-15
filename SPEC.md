# Huddl — Personal Meeting Copilot

## What this is

Huddl is a personal Chrome extension that listens to a live meeting, transcribes speech, and shows Claude-generated suggested answers in an on-screen overlay. Claude answers using a personal context store built from summaries of the owner's past Claude chats (projects, decisions, work history).

Includes a web dashboard (the **Context Engine**) to manage that context store.

Single user. Personal Anthropic API key (server-side). Not a multi-user product.

## Tech stack

- **Extension**: Chrome Manifest V3, React + Vite (CRXJS plugin), TypeScript
- **Dashboard**: React + Vite + Tailwind + shadcn/ui, TypeScript
- **Server**: Hono on Vercel (Vercel adapter), TypeScript
- **DB**: Neon Postgres, Drizzle ORM, Neon serverless driver
- **Auth**: Better Auth — email/password for the dashboard (single account, signups disabled via env flag), API key plugin for the extension, `CRON_SECRET` header for Vercel Cron
- **Cron**: Vercel Cron for the daily synthesis job
- **AI**: Anthropic API, `claude-sonnet-4-6`, prompt caching, key lives on the server only
- **STT**: Web Speech API for v1, behind a swappable `Transcriber` interface
- **Repo**: pnpm workspace monorepo — `apps/server`, `apps/dashboard`, `apps/extension`, `packages/shared`

## Core user flow (meeting)

1. User joins a meeting in the browser (Google Meet or similar tab).
2. User clicks the extension to start listening.
3. Speech is transcribed live (speech to text, no translation).
4. Transcript appears in a small overlay panel.
5. User triggers "answer" (button or hotkey) when a question is directed at them. Claude is NOT called continuously, only on demand, to control cost.
6. Extension sends the recent transcript window (last ~60 seconds) to `POST /answer`. The **server** prepends the master context + system instructions and calls the Claude API.
7. Suggested answer streams back over SSE into the overlay.

## Architecture (three layers)

### 1. Raw layer — chat summaries in a DB

- Neon Postgres via Drizzle.
- Table `chat_summaries`: id, project (text), date, title, content (text), created_at. (No embedding column in v1 — added as a migration when vector retrieval lands in phase 2.)
- Summaries are produced outside this system (a Claude skill that summarizes each chat) and added via the dashboard or `POST /summaries`.
- Hono API (deployed on Vercel):
  - `POST /summaries` — insert a summary
  - `GET /summaries` — list all summaries (for dashboard)
  - `PATCH /summaries/:id` — edit a summary
  - `DELETE /summaries/:id` — delete a summary
  - `GET /context` — return the current master context (+ version history)
  - `POST /compile` — trigger synthesis manually
  - `POST /answer` — meeting answer flow (SSE stream)
  - `/api/auth/*` — Better Auth handler
- Auth: Better Auth session (dashboard) or API key via `x-api-key` (extension). `POST /compile` also accepts `Authorization: Bearer ${CRON_SECRET}` for Vercel Cron.

### 2. Synthesis layer — master context compiler

- Vercel Cron (daily) hitting `POST /compile`, plus manual trigger from the dashboard.
- **Full recompile**: reads ALL `chat_summaries` (not just new ones) and synthesizes the master context from scratch. This makes edits/deletes propagate and avoids summary-of-summary drift. Cost is negligible (one Sonnet call/day).
- Synthesis prompt: merge summaries into a master context, dedupe, resolve contradictions (newer wins), keep it under a target size (~8k tokens), organize by project with a short personal profile section on top.
- Stores result in `master_context` table (versioned: id, content, token_estimate, created_at). Latest row is the live one.
- Raw summaries are never sent to meetings directly.

### 3. Serving layer — the extension

- Content script injects the overlay UI (transcript pane + answer pane + "answer" button/hotkey), built in React, rendered inside a **shadow DOM** (Meet's CSS is aggressive).
- STT via Web Speech API behind a `Transcriber` interface:
  - `start()`, `stop()`, event stream of `{ text, timestamp, isFinal, speaker }` segments
  - `speaker` is `"me" | "them" | "unknown"` from day one (Web Speech always emits `"unknown"`; Deepgram diarization fills it in phase 2)
  - Web Speech impl runs in the **content script** (not the MV3 service worker — no DOM APIs there) with an `onend → restart` loop (Web Speech stops itself after silence/~60s/network blips)
- 60-second rolling transcript buffer lives in the content script (MV3 workers die after ~30s idle).
- On "answer" trigger (button or `chrome.commands` hotkey):
  - `POST /answer` with `{ transcriptWindow }`, authenticated via API key from extension storage
  - Server assembles: `[master context — cache_control breakpoint] [system instructions] [transcript window]` and streams the Claude response back as SSE
  - Answer streams into the overlay
- Options page stores: server URL + Huddl API key (generated in the dashboard). **No Anthropic key in the extension.**

## Context Engine dashboard

React + Vite + Tailwind + shadcn/ui web app (deployed on Vercel alongside the API).

Views:

1. **Login** — Better Auth email/password. Single account; signups disabled once created (`ALLOW_SIGNUP` env flag).
2. **Summaries list** — all `chat_summaries` as cards: title, project, date, content preview. Actions: view full, edit, delete. Filter by project.
3. **Add summary** — paste-in form (title, project, content). Primary ingest path for v1.
4. **Master context** — view the current compiled context, its token estimate, and version history. "Recompile now" button hitting `POST /compile`.
5. **API keys** — generate/revoke the extension's API key (Better Auth API key plugin).

## Prompting

System prompt (cached block) contains:

- Master context document.
- Instructions: "You are helping Devanshi answer questions live in a meeting. Answers must be short (2–4 sentences), first person, natural spoken style, drawing on her real project experience. If the context doesn't cover it, say what she could honestly say instead of inventing details."

User message per call:

- Recent transcript window (with speaker tags where available).
- v1: user just triggers; Claude infers the question from the transcript tail.

API details:

- `claude-sonnet-4-6`, thinking disabled on `/answer` (latency-sensitive), streaming always.
- Prompt caching: `cache_control: {type: "ephemeral"}` on the master-context system block (min cacheable prefix on Sonnet 4.6 is 2048 tokens; the ~8k context clears it). 5-min TTL — consecutive triggers in a meeting hit cache.
- Synthesis job uses adaptive thinking (latency doesn't matter there).

## Cost controls

- Claude called only on explicit trigger, never per transcript chunk.
- Prompt caching on the master context block.
- Master context capped at ~8k tokens by the synthesis job.
- Web Speech API is free (no STT cost in v1).
- Vercel + Neon free tiers.

## Out of scope for v1 (phase 2 candidates)

- Vector retrieval: pgvector + `embedding` column on `chat_summaries`; on specific questions pull top 3 raw summaries as a supplement to the master context.
- Deepgram or Whisper STT (via `chrome.tabCapture` + offscreen document) for accuracy and speaker diarization.
- Auto question detection.
- Desktop app / system audio capture.
- Any multi-user or billing features.

## Build order

1. Drizzle schema + Hono API on Vercel (`chat_summaries`, CRUD, Better Auth, API keys).
2. Synthesis job + `master_context` table + `POST /compile` + `GET /context` + `POST /answer` + Vercel Cron.
3. Context Engine dashboard: login, summaries list, add form, master context view, API key management.
4. Extension skeleton: MV3 + CRXJS setup, options page (server URL + API key), overlay injection.
5. Web Speech transcription into the overlay (auto-restart loop, rolling buffer).
6. Answer flow: trigger + hotkey → `POST /answer` → streamed answer in overlay.
7. Polish: error states (mic denied, API errors, offline), session UX.

## Conventions

- Comments in code: minimal and short.
- TypeScript throughout.
- Keep the server tiny: Hono routes + Drizzle, no extra layers.
- Sequential, focused git commits.
