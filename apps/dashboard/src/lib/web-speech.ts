import type { TranscriptSegment } from "@huddl/shared";
import type { Transcriber } from "./transcriber";

// Minimal shim for the Web Speech API. `start(track)` (Chrome 135+) is not in
// published DOM types yet, so we type the pieces we use and cast at the call.
interface SpeechRecognitionAlt {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [i: number]: SpeechRecognitionAlt;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [i: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEventLike {
  readonly error: string;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(track?: MediaStreamTrack): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const RESTART_BACKOFF_MS = 300;

export class WebSpeechTranscriber implements Transcriber {
  private rec: SpeechRecognitionLike | null = null;
  private track: MediaStreamTrack | null = null;
  private running = false;
  private stopped = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private segmentCb: ((s: TranscriptSegment) => void) | null = null;
  private errorCb: ((m: string, fatal: boolean) => void) | null = null;

  onSegment(cb: (s: TranscriptSegment) => void) {
    this.segmentCb = cb;
  }
  onError(cb: (m: string, fatal: boolean) => void) {
    this.errorCb = cb;
  }

  start(track: MediaStreamTrack) {
    this.track = track;
    this.stopped = false;
    this.launch();
  }

  stop() {
    this.stopped = true;
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = null;
    try {
      this.rec?.abort();
    } catch {
      /* ignore */
    }
    this.running = false;
    this.rec = null;
  }

  private launch() {
    if (this.running || this.stopped) return;
    const Ctor = getCtor();
    if (!Ctor) {
      this.errorCb?.("SpeechRecognition is unavailable in this browser", true);
      return;
    }

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const text = result[0]?.transcript?.trim();
        if (!text) continue;
        this.segmentCb?.({
          text,
          timestamp: Date.now(),
          isFinal: result.isFinal,
          speaker: "them",
        });
      }
    };

    rec.onerror = (e) => {
      const fatal = e.error === "not-allowed" || e.error === "service-not-allowed";
      if (fatal) this.stopped = true;
      this.errorCb?.(e.error, fatal);
    };

    rec.onend = () => {
      this.running = false;
      if (this.stopped) return;
      // Web Speech self-terminates on silence / ~60s / network blips — restart.
      this.restartTimer = setTimeout(() => this.launch(), RESTART_BACKOFF_MS);
    };

    try {
      // Chrome 135+: pass the captured tab-audio track. Older builds ignore the arg
      // and fall back to the default mic (still functional, just wrong source).
      if (this.track) rec.start(this.track);
      else rec.start();
      this.running = true;
      this.rec = rec;
    } catch (err) {
      this.errorCb?.((err as Error).message, false);
      if (!this.stopped) {
        this.restartTimer = setTimeout(() => this.launch(), RESTART_BACKOFF_MS * 2);
      }
    }
  }
}
