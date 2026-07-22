import { Hono } from "hono";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";

export const sttToken = new Hono<AuthEnv>();
sttToken.use("*", requireAuth);

// Mints a short-lived Deepgram token so the browser can open a listen WebSocket
// without ever seeing DEEPGRAM_API_KEY. The token TTL only needs to cover the
// WS handshake — the socket then stays open for the whole meeting.
const GRANT_TTL_SECONDS = 30;

sttToken.post("/", async (c) => {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return c.json({ error: "DEEPGRAM_API_KEY not configured" }, 500);

  const res = await fetch("https://api.deepgram.com/v1/auth/grant", {
    method: "POST",
    headers: {
      Authorization: `Token ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ttl_seconds: GRANT_TTL_SECONDS }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return c.json({ error: "deepgram grant failed", detail }, 502);
  }

  // Deepgram returns { access_token, expires_in }.
  const data = (await res.json()) as { access_token: string; expires_in: number };
  return c.json({ token: data.access_token, expiresIn: data.expires_in });
});
