/** Who spoke a transcript segment. Web Speech emits only "them"/"unknown"; diarization fills "me" in phase 2. */
export type Speaker = "me" | "them" | "unknown";

export type TranscriptSegment = {
  text: string;
  /** epoch ms when the segment was produced */
  timestamp: number;
  isFinal: boolean;
  speaker: Speaker;
};
