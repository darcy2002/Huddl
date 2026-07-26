import { useState } from "react";
import { toast } from "sonner";
import { UploadIcon, RefreshCwIcon, FileTextIcon } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type ImportItem = { project: string; title: string; date: string; rawText: string };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Fallback title from the first real line of pasted text.
function deriveTitle(text: string): string {
  const line = text.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  const cleaned = line.replace(/^(human|assistant|user|claude)\s*:\s*/i, "").slice(0, 80).trim();
  return cleaned || "Imported chat";
}

// Send items in batches (server caps a request at 25) and total the inserts.
async function sendInBatches(items: ImportItem[]): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < items.length; i += 20) {
    const res = await api.importChats(items.slice(i, i + 20));
    inserted += res.inserted;
  }
  return inserted;
}

export function Import() {
  const [project, setProject] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(0);
  const [recompiling, setRecompiling] = useState(false);

  const hasProject = Boolean(project.trim());
  const canPaste = hasProject && Boolean(text.trim()) && !busy;
  const canUpload = hasProject && files.length > 0 && !busy;

  async function addPasted() {
    if (!canPaste) return;
    setBusy(true);
    try {
      const inserted = await sendInBatches([
        {
          project: project.trim(),
          title: (title.trim() || deriveTitle(text)).slice(0, 200),
          date: today(),
          rawText: text.trim(),
        },
      ]);
      if (inserted > 0) {
        setAdded((n) => n + inserted);
        toast.success(`Summarized and added to “${project.trim()}”.`);
        setText("");
        setTitle("");
      } else {
        toast.info("Nothing worth keeping in that one — skipped.");
      }
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) toast.error("Import failed.");
    } finally {
      setBusy(false);
    }
  }

  async function importFiles() {
    if (!canUpload) return;
    setBusy(true);
    try {
      const items: ImportItem[] = [];
      for (const f of files) {
        const raw = (await f.text()).trim();
        if (!raw) continue;
        items.push({
          project: project.trim(),
          title: f.name.replace(/\.(md|markdown|txt)$/i, "").slice(0, 200) || "Imported note",
          date: today(),
          rawText: raw,
        });
      }
      if (items.length === 0) {
        toast.info("Those files were empty.");
        return;
      }
      const inserted = await sendInBatches(items);
      setAdded((n) => n + inserted);
      toast.success(`Imported ${inserted} of ${items.length} file(s) into “${project.trim()}”.`);
      setFiles([]);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) toast.error("Import failed.");
    } finally {
      setBusy(false);
    }
  }

  async function recompile() {
    setRecompiling(true);
    try {
      const res = await api.recompile();
      if (res && "skipped" in res) toast.info("Nothing to compile yet.");
      else toast.success("Context recompiled.");
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) toast.error("Recompile failed.");
    } finally {
      setRecompiling(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Import chats</h1>
        {added > 0 && (
          <Button onClick={recompile} disabled={recompiling} variant="secondary">
            <RefreshCwIcon className={recompiling ? "size-4 animate-spin" : "size-4"} />
            {recompiling ? "Recompiling…" : "Recompile context"}
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Upload Markdown files or paste a conversation, and Huddl summarizes each into your context
        store under a project. Add as many as you like, then hit <strong>Recompile context</strong>.
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project">Project</Label>
        <Input
          id="project"
          value={project}
          onChange={(e) => setProject(e.target.value)}
          placeholder="e.g. Huddl, Kakiyo, Personal"
          className="max-w-sm"
        />
        <span className="text-xs text-muted-foreground">
          Applies to everything you add below. {added > 0 && `${added} added this session.`}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload .md files</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            type="file"
            accept=".md,.markdown,.txt"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="cursor-pointer"
          />
          {files.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <FileTextIcon className="size-3.5" />
                  {f.name}
                </li>
              ))}
            </ul>
          )}
          <div>
            <Button onClick={importFiles} disabled={!canUpload}>
              <UploadIcon className={busy ? "size-4 animate-pulse" : "size-4"} />
              {busy ? "Summarizing…" : `Import ${files.length || ""} file${files.length === 1 ? "" : "s"}`.trim()}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Or paste a conversation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Auto from the first line if blank"
              className="max-w-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="text">Conversation / notes</Label>
            <Textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the chat here…"
              className="min-h-52"
            />
          </div>
          <div>
            <Button onClick={addPasted} disabled={!canPaste}>
              <UploadIcon className={busy ? "size-4 animate-pulse" : "size-4"} />
              {busy ? "Summarizing…" : "Summarize & add"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
