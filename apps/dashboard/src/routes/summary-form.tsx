import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { createSummarySchema } from "@huddl/shared";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EMPTY = { title: "", project: "", date: "", content: "" };

export function SummaryForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  // Edit mode: hydrate from the list (no single-summary GET endpoint).
  useEffect(() => {
    if (!isEdit) return;
    let alive = true;
    api
      .listSummaries()
      .then((rows) => {
        const found = rows.find((r) => r.id === id);
        if (!alive) return;
        if (!found) {
          toast.error("Summary not found");
          navigate("/", { replace: true });
          return;
        }
        setForm({
          title: found.title,
          project: found.project,
          date: found.date,
          content: found.content,
        });
      })
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) toast.error("Failed to load summary");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, isEdit, navigate]);

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = createSummarySchema.safeParse(form);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.updateSummary(id!, parsed.data);
        toast.success("Summary updated");
      } else {
        await api.createSummary(parsed.data);
        toast.success("Summary added");
      }
      navigate("/");
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) {
        toast.error(isEdit ? "Update failed" : "Create failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>{isEdit ? "Edit summary" : "Add summary"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <Field label="Title" error={errors.title}>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Project" error={errors.project}>
              <Input
                value={form.project}
                onChange={(e) => set("project", e.target.value)}
                placeholder="e.g. Huddl"
              />
            </Field>
            <Field label="Date" error={errors.date}>
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </Field>
          </div>
          <Field label="Content" error={errors.content}>
            <Textarea
              rows={10}
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder="Paste the chat summary…"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/")}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Add summary"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
      {error?.length ? <p className="text-xs text-destructive">{error[0]}</p> : null}
    </div>
  );
}
