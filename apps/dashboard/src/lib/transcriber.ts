import type { TranscriptSegment } from "@huddl/shared";

/**
 * Swappable speech-to-text backend. v1 = WebSpeechTranscriber (see web-speech.ts);
 * phase 2 = a Deepgram-over-WebSocket impl fed from the same captured audio track.
 */
export interface Transcriber {
  /** Begin recognition on the given audio track (the captured tab audio). */
  start(track: MediaStreamTrack): void;
  /** Stop recognition and release resources. Idempotent. */
  stop(): void;
  onSegment(cb: (segment: TranscriptSegment) => void): void;
  /** `fatal` errors (e.g. permission denied) must not auto-restart. */
  onError(cb: (message: string, fatal: boolean) => void): void;
}
