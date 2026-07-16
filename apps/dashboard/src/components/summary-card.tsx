import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import type { Summary } from "@huddl/shared";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SummaryCard({ summary, onDeleted }: { summary: Summary; onDeleted: () => void }) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deleteSummary(summary.id);
      toast.success("Summary deleted");
      setConfirmOpen(false);
      onDeleted();
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) {
        toast.error("Delete failed");
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base">{summary.title}</CardTitle>
          <Badge variant="secondary" className="shrink-0">
            {summary.project}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{summary.date}</p>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-4 text-sm whitespace-pre-wrap text-muted-foreground">
          {summary.content}
        </p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/summaries/${summary.id}/edit`)}
        >
          Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
          Delete
        </Button>
      </CardFooter>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this summary?</DialogTitle>
            <DialogDescription>
              “{summary.title}” will be removed. This can't be undone (recompile to update the
              master context).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
