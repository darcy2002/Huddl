import { useState } from "react";
import { toast } from "sonner";
import { RefreshCwIcon } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAsync } from "@/hooks/use-async";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function fmt(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function ContextView() {
  const { data, loading, error, refetch } = useAsync(() => api.getContext());
  const [recompiling, setRecompiling] = useState(false);

  async function handleRecompile() {
    setRecompiling(true);
    try {
      const res = await api.recompile();
      if (res && "skipped" in res) {
        toast.info("Nothing to compile — no summaries yet.");
      } else {
        toast.success("Recompiled — new version created.");
        refetch();
      }
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) toast.error("Recompile failed");
    } finally {
      setRecompiling(false);
    }
  }

  const current = data?.current ?? null;
  const versions = data?.versions ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Master context</h1>
        <Button onClick={handleRecompile} disabled={recompiling}>
          <RefreshCwIcon className={recompiling ? "size-4 animate-spin" : "size-4"} />
          {recompiling ? "Recompiling…" : "Recompile now"}
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Failed to load context.</p>}

      {!loading && !error && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Current context</CardTitle>
                {current && <Badge variant="secondary">~{current.tokenEstimate} tokens</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              {current ? (
                <pre className="max-h-[28rem] overflow-auto rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">
                  {current.content}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No compiled context yet. Add summaries and hit “Recompile now”.
                </p>
              )}
            </CardContent>
          </Card>

          {versions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Version history</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.map((v, i) => (
                      <TableRow key={v.id}>
                        <TableCell>{fmt(v.createdAt)}</TableCell>
                        <TableCell className="text-right">~{v.tokenEstimate}</TableCell>
                        <TableCell className="text-right">
                          {i === 0 ? <Badge>Live</Badge> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
