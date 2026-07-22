import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import { MicIcon, SquareIcon, SparklesIcon, PictureInPicture2Icon } from "lucide-react";
import type { TranscriptSegment } from "@huddl/shared";
import { DeepgramTranscriber } from "@/lib/deepgram";
import { startTabAudioCapture, NoTabAudioError, type TabAudioCapture } from "@/lib/display-capture";
import { streamAnswer } from "@/lib/answer-stream";
import { pipSupported, openPipWindow } from "@/lib/pip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// The rolling transcript window sent to /answer: finals from the last 60 seconds.
const BUFFER_MS = 60_000;
// Min gap between auto-suggested answers, so a burst of questions doesn't spam.
const COOLDOWN_MS = 5_000;

const Q_TRAIL = /\?\s*$/;
const Q_LEAD =
  /^(what|why|how|when|where|who|whose|whom|which|can|could|would|will|shall|should|do|does|did|are|is|am|was|were|have|has|had|may|might|tell me|walk me|explain|describe)\b/i;
function isQuestion(text: string): boolean {
  const s = text.trim();
  return Q_TRAIL.test(s) || Q_LEAD.test(s);
}

export function Live() {
  const [listening, setListening] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [finals, setFinals] = useState<TranscriptSegment[]>([]);
  const [interim, setInterim] = useState("");

  const [answer, setAnswer] = useState("");
  const [answering, setAnswering] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [autoSuggest, setAutoSuggest] = useState(true);

  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  const captureRef = useRef<TabAudioCapture | null>(null);
  const transcriberRef = useRef<DeepgramTranscriber | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastAnsweredRef = useRef<string>("");
  const cooldownRef = useRef<number>(0);

  // Stop capture + transcription and reset to idle. Idempotent.
  function stopListening() {
    transcriberRef.current?.stop();
    transcriberRef.current = null;
    captureRef.current?.stop();
    captureRef.current = null;
    setListening(false);
    setInterim("");
  }

  async function startListening() {
    setCaptureError(null);
    try {
      // onEnded fires when the user clicks Chrome's native "Stop sharing" bar.
      const cap = await startTabAudioCapture(() => stopListening());
      captureRef.current = cap;

      const t = new DeepgramTranscriber();
      t.onSegment((seg) => {
        if (seg.isFinal) {
          setInterim("");
          setFinals((prev) =>
            [...prev, seg].filter((s) => seg.timestamp - s.timestamp <= BUFFER_MS),
          );
        } else {
          setInterim(seg.text);
        }
      });
      t.onError((msg, fatal) => {
        if (fatal) {
          setCaptureError(msg);
          stopListening();
        }
      });
      transcriberRef.current = t;
      t.start(cap.audioTrack);
      setListening(true);
    } catch (e) {
      const err = e as Error;
      // The user dismissing the share picker throws NotAllowedError — not worth surfacing.
      if (err instanceof NoTabAudioError) setCaptureError(err.message);
      else if (err.name !== "NotAllowedError" && err.name !== "AbortError")
        setCaptureError(err.message || "Could not start capture.");
    }
  }

  async function getAnswer() {
    const transcriptWindow = finals.map((s) => s.text).join(" ").trim();
    if (!transcriptWindow) return;

    cooldownRef.current = Date.now();
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setAnswer("");
    setAnswerError(null);
    setAnswering(true);
    try {
      await streamAnswer(transcriptWindow, {
        signal: ac.signal,
        onDelta: (d) => setAnswer((prev) => prev + d),
      });
    } catch (e) {
      const err = e as Error;
      if (err.name !== "AbortError") setAnswerError(err.message || "Answer failed.");
    } finally {
      if (abortRef.current === ac) {
        setAnswering(false);
        abortRef.current = null;
      }
    }
  }

  // Proactive answers: when the latest final looks like a question, auto-answer
  // (respecting the toggle, a cooldown, and not re-answering the same question).
  useEffect(() => {
    if (!autoSuggest || answering) return;
    const last = finals[finals.length - 1];
    if (!last || !isQuestion(last.text)) return;
    if (last.text === lastAnsweredRef.current) return;
    if (Date.now() - cooldownRef.current < COOLDOWN_MS) return;
    lastAnsweredRef.current = last.text;
    void getAnswer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finals, autoSuggest, answering]);

  // Autoscroll the transcript as it grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [finals, interim]);

  // Tear everything down on unmount.
  useEffect(() => {
    return () => {
      transcriberRef.current?.stop();
      captureRef.current?.stop();
      abortRef.current?.abort();
      pipWindow?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function popOut() {
    if (!pipSupported() || pipWindow) return;
    try {
      const win = await openPipWindow(380, 520);
      win.addEventListener("pagehide", () => setPipWindow(null));
      setPipWindow(win);
    } catch {
      /* user dismissed the PiP prompt */
    }
  }

  const hasTranscript = finals.length > 0;

  // The portable copilot panel — rendered inline or inside the PiP window.
  const panel = (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={scrollRef}
            className="h-64 overflow-y-auto rounded-md bg-muted p-4 text-sm leading-relaxed"
          >
            {!hasTranscript && !interim ? (
              <p className="text-muted-foreground">
                {listening
                  ? "Listening… speech from the shared tab will appear here."
                  : "Not listening yet."}
              </p>
            ) : (
              <>
                {finals.map((s, i) => (
                  <span key={i} className="text-foreground">
                    {s.text}{" "}
                  </span>
                ))}
                {interim && <span className="text-muted-foreground">{interim}</span>}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Suggested answer</CardTitle>
            <Button size="sm" onClick={getAnswer} disabled={!hasTranscript || answering}>
              <SparklesIcon className={answering ? "size-4 animate-pulse" : "size-4"} />
              {answering ? "Thinking…" : "Get answer"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {answerError ? (
            <p className="text-sm text-destructive">{answerError}</p>
          ) : answer ? (
            <div className="text-sm leading-relaxed [&_li]:ml-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
              <ReactMarkdown>{answer}</ReactMarkdown>
            </div>
          ) : answering ? (
            <p className="text-sm text-muted-foreground">Generating a suggestion…</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {autoSuggest
                ? "Suggestions appear automatically when a question is asked."
                : "Click “Get answer” for a suggestion based on the recent transcript."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Live</h1>
          <span
            className={`inline-block size-2 rounded-full ${listening ? "bg-green-500" : "bg-muted-foreground/40"}`}
            aria-hidden
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground select-none">
            <input
              type="checkbox"
              checked={autoSuggest}
              onChange={(e) => setAutoSuggest(e.target.checked)}
              className="size-4 accent-primary"
            />
            Auto-suggest
          </label>
          {pipSupported() && (
            <Button variant="outline" size="sm" onClick={popOut} disabled={!!pipWindow}>
              <PictureInPicture2Icon className="size-4" />
              {pipWindow ? "Popped out" : "Pop out"}
            </Button>
          )}
          {listening ? (
            <Button variant="secondary" onClick={stopListening}>
              <SquareIcon className="size-4" />
              Stop
            </Button>
          ) : (
            <Button onClick={startListening}>
              <MicIcon className="size-4" />
              Start listening
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Open your meeting in another tab, click <strong>Start listening</strong>, then pick that
        tab and tick <strong>“Share tab audio”</strong> in the picker. Huddl transcribes the other
        participants and suggests answers grounded in your context. Use <strong>Pop out</strong>{" "}
        for a window that floats over your meeting.
      </p>

      {captureError && <p className="text-sm text-destructive">{captureError}</p>}

      {pipWindow ? (
        <>
          <p className="text-sm text-muted-foreground">
            Copilot is in the floating window. Close it to bring it back here.
          </p>
          {createPortal(
            <div className="bg-background text-foreground flex min-h-svh flex-col gap-4 p-4">
              {panel}
            </div>,
            pipWindow.document.body,
          )}
        </>
      ) : (
        panel
      )}
    </div>
  );
}
