import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { PlusIcon } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/use-async";
import { SummaryCard } from "@/components/summary-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export function Summaries() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useAsync(() => api.listSummaries());
  const [project, setProject] = useState(ALL);

  const projects = useMemo(
    () => [...new Set((data ?? []).map((s) => s.project))].sort(),
    [data],
  );
  const filtered = useMemo(
    () => (data ?? []).filter((s) => project === ALL || s.project === project),
    [data, project],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Summaries</h1>
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
          <Button onClick={() => navigate("/summaries/new")}>
            <PlusIcon className="size-4" />
            Add summary
          </Button>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Failed to load summaries.</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {data && data.length > 0
            ? "No summaries in this project."
            : "No summaries yet. Add your first one to start building context."}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((s) => (
          <SummaryCard key={s.id} summary={s} onDeleted={refetch} />
        ))}
      </div>
    </div>
  );
}
