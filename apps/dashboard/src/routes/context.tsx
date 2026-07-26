import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { PlusIcon, RefreshCwIcon } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAsync } from "@/hooks/use-async";
import { SummaryCard } from "@/components/summary-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

function fmt(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function ContextView() {
  const navigate = useNavigate();
  const context = useAsync(() => api.getContext());
  const summaries = useAsync(() => api.listSummaries());
  const [project, setProject] = useState(ALL);
  const [recompiling, setRecompiling] = useState(false);

  const projects = useMemo(
    () => [...new Set((summaries.data ?? []).map((s) => s.project))].sort(),
    [summaries.data],
  );
  const filtered = useMemo(
    () => (summaries.data ?? []).filter((s) => project === ALL || s.project === project),
    [summaries.data, project],
  );

  const current = context.data?.current ?? null;
  const versions = context.data?.versions ?? [];

  async function handleRecompile() {
    setRecompiling(true);
    try {
      const res = await api.recompile();
      if (res && "skipped" in res) {
        toast.info("Nothing to compile — no summaries yet.");
      } else {
        toast.success("Recompiled — new version created.");
        context.refetch();
      }
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) toast.error("Recompile failed");
    } finally {
      setRecompiling(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Context</h1>
        <Button onClick={handleRecompile} disabled={recompiling}>
          <RefreshCwIcon className={recompiling ? "size-4 animate-spin" : "size-4"} />
          {recompiling ? "Recompiling…" : "Recompile now"}
        </Button>
      </div>

      {/* Compiled master context — the "brain" sent to Claude during meetings. */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Master context</CardTitle>
            {current && <Badge variant="secondary">~{current.tokenEstimate} tokens</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {context.loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : current ? (
            <details>
              <summary className="cursor-pointer text-sm text-muted-foreground">
                View compiled context{versions.length > 1 ? ` · ${versions.length} versions` : ""}
              </summary>
              <pre className="mt-3 max-h-[24rem] overflow-auto rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">
                {current.content}
              </pre>
              {versions.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Last compiled {fmt(versions[0].createdAt)}
                </p>
              )}
            </details>
          ) : (
            <p className="text-sm text-muted-foreground">
              No compiled context yet. Add summaries below (or on the Import tab) and hit “Recompile
              now”.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Source summaries — the inputs that get compiled above. */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Summaries</h2>
        <div className="flex items-center gap-3">
          <Select value={project} onValueChange={setProject}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => navigate("/summaries/new")}>
            <PlusIcon className="size-4" />
            Add summary
          </Button>
        </div>
      </div>

      {summaries.loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {summaries.error && <p className="text-sm text-destructive">Failed to load summaries.</p>}
      {!summaries.loading && !summaries.error && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {summaries.data && summaries.data.length > 0
            ? "No summaries in this project."
            : "No summaries yet. Use the Import tab to add some, or add one manually."}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((s) => (
          <SummaryCard key={s.id} summary={s} onDeleted={summaries.refetch} />
        ))}
      </div>
    </div>
  );
}
