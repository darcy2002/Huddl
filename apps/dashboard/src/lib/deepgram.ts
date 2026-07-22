import type { TranscriptSegment } from "@huddl/shared";
import type { Transcriber } from "./transcriber";
import { SERVER_URL } from "./auth-client";

// nova-3 + smart_format gives punctuated, capitalised output; interim_results
// streams partials so the transcript feels live.
const DG_QUERY = "model=nova-3&smart_format=true&interim_results=true&language=en";
const KEEPALIVE_MS = 8000;
const RECONNECT_MS = 500;

async function fetchToken(): Promise<string> {
  const res = await fetch(`${SERVER_URL}/stt-token`, {
    method: "POST",
    credentials: "include",
  });
  if (res.status === 401) {
    if (window.location.pathname !== "/login") window.location.assign("/login");
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`Could not get a transcription token (${res.status})`);
  const { token } = (await res.json()) as { token: string };
  return token;
}

/**
 * Streams the captured tab-audio track to Deepgram's live endpoint and emits
 * transcript segments. Auth uses a short-lived token minted by our server
 * (`POST /stt-token`), passed as the `access_token` query param — grant tokens
 * must go in the URL, not the Sec-WebSocket-Protocol header.
 */
export class DeepgramTranscriber implements Transcriber {
  private ws: WebSocket | null = null;
  private recorder: MediaRecorder | null = null;
  private keepAlive: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private attempts = 0;
  private segmentCb: ((s: TranscriptSegment) => void) | null = null;
  private errorCb: ((m: string, fatal: boolean) => void) | null = null;

  onSegment(cb: (s: TranscriptSegment) => void) {
    this.segmentCb = cb;
  }
  onError(cb: (m: string, fatal: boolean) => void) {
    this.errorCb = cb;
  }

  start(track: MediaStreamTrack) {
    this.stopped = false;
    void this.launch(track);
  }

  private async launch(track: MediaStreamTrack) {
    let token: string;
    try {
      token = await fetchToken();
    } catch (e) {
      this.errorCb?.((e as Error).message, true);
      return;
    }
    if (this.stopped) return;

    // Grant/temporary tokens authenticate with the Bearer scheme. A browser can't
    // set an Authorization header on a WebSocket, so Deepgram accepts it via the
    // Sec-WebSocket-Protocol sub-protocol: ["bearer", <access_token>]. (The
    // access_token URL query param is rejected → 1006 at handshake.)
    const url = `wss://api.deepgram.com/v1/listen?${DG_QUERY}`;
    const ws = new WebSocket(url, ["bearer", token]);
    this.ws = ws;

    ws.onopen = () => {
      if (this.stopped) {
        ws.close();
        return;
      }
      this.attempts = 0; // connected — reset backoff
      const stream = new MediaStream([track]);
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      this.recorder = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data);
      };
      recorder.start(250);
      // Deepgram closes idle sockets — keep it warm during silence.
      this.keepAlive = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "KeepAlive" }));
      }, KEEPALIVE_MS);
    };

    ws.onmessage = (ev) => {
      let msg: {
        type?: string;
        is_final?: boolean;
        channel?: { alternatives?: { transcript?: string }[] };
      };
      try {
        msg = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      if (msg.type !== "Results") return;
      const text = msg.channel?.alternatives?.[0]?.transcript?.trim();
      if (!text) return;
      this.segmentCb?.({
        text,
        timestamp: Date.now(),
        isFinal: Boolean(msg.is_final),
        speaker: "them",
      });
    };

    ws.onerror = () => {
      console.warn("[deepgram] websocket error");
    };

    ws.onclose = (ev: CloseEvent) => {
      this.teardownLocal();
      this.ws = null;
      if (this.stopped) return;
      this.attempts += 1;
      console.warn(
        `[deepgram] socket closed code=${ev.code} reason=${ev.reason || "(none)"} attempt=${this.attempts}`,
      );
      // Give up after a few fast failures instead of looping forever (which
      // spams token requests). Surface the close code so the cause is visible.
      if (this.attempts >= 4) {
        this.errorCb?.(
          `Transcription keeps disconnecting (code ${ev.code}${ev.reason ? `: ${ev.reason}` : ""}).`,
          true,
        );
        return;
      }
      const delay = Math.min(RECONNECT_MS * 2 ** (this.attempts - 1), 5000);
      this.reconnectTimer = setTimeout(() => {
        if (!this.stopped) void this.launch(track);
      }, delay);
    };
  }

  private teardownLocal() {
    if (this.keepAlive) clearInterval(this.keepAlive);
    this.keepAlive = null;
    try {
      if (this.recorder && this.recorder.state !== "inactive") this.recorder.stop();
    } catch {
      /* ignore */
    }
    this.recorder = null;
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.teardownLocal();
    try {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "CloseStream" }));
      }
      this.ws?.close();
    } catch {
      /* ignore */
    }
    this.ws = null;
  }
}
