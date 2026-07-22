/**
 * Captures a browser tab's audio via the native screen-share picker.
 *
 * macOS Chrome only exposes *tab* audio this way (not full system/window audio),
 * so the user must pick the meeting tab and tick "Share tab audio". `video: true`
 * is mandatory even though we only want audio — we stop the video track at once.
 */

/** Thrown when the share succeeded but no audio track came back (checkbox left off). */
export class NoTabAudioError extends Error {
  constructor() {
    super(
      'No audio was shared. Re-share and tick "Share tab audio" in the picker, and pick a browser tab (not a window or screen).',
    );
    this.name = "NoTabAudioError";
  }
}

export interface TabAudioCapture {
  audioTrack: MediaStreamTrack;
  /** Stop capture and release the stream. Idempotent. */
  stop(): void;
}

export async function startTabAudioCapture(onEnded: () => void): Promise<TabAudioCapture> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true,
  });

  // We only need the audio — stop the video track immediately to drop the capture load.
  stream.getVideoTracks().forEach((t) => t.stop());

  const audioTrack = stream.getAudioTracks()[0];
  if (!audioTrack) {
    stream.getTracks().forEach((t) => t.stop());
    throw new NoTabAudioError();
  }

  // Fires when the user clicks Chrome's native "Stop sharing" bar.
  const handleEnded = () => onEnded();
  audioTrack.addEventListener("ended", handleEnded);

  return {
    audioTrack,
    stop() {
      audioTrack.removeEventListener("ended", handleEnded);
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}
