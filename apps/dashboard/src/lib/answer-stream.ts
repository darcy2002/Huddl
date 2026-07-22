import { SERVER_URL } from "./auth-client";

/**
 * Streams a suggested answer from `POST /answer`.
 *
 * `/answer` is a POST with a JSON body, so `EventSource` (GET-only) can't be used —
 * we read the response body and parse the SSE frames by hand. Cookie-authenticated
 * (`credentials: "include"`), mirroring the 401 -> /login behaviour of `api.ts`.
 *
 * Aborting via `signal` rejects with an `AbortError` — callers should ignore that.
 */
export interface StreamAnswerOptions {
  onDelta: (text: string) => void;
  signal?: AbortSignal;
}

function parseFrame(frame: string): { event: string; data: string } {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
  }
  return { event, data: dataLines.join("\n") };
}

export async function streamAnswer(
  transcriptWindow: string,
  { onDelta, signal }: StreamAnswerOptions,
): Promise<void> {
  const res = await fetch(`${SERVER_URL}/answer`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcriptWindow }),
    signal,
  });

  if (res.status === 401) {
    if (window.location.pathname !== "/login") window.location.assign("/login");
    throw new Error("unauthorized");
  }
  if (!res.ok || !res.body) {
    throw new Error(`Answer request failed (${res.status} ${res.statusText})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line.
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const { event, data } = parseFrame(frame);
        if (event === "delta") onDelta(data);
        else if (event === "done") return;
        else if (event === "error") throw new Error(data || "Answer stream error");
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}
