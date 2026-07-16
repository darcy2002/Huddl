import { useState } from "react";
import { toast } from "sonner";
import { CopyIcon, KeyRoundIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useAsync } from "@/hooks/use-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ApiKeyRow = {
  id: string;
  name: string | null;
  start: string | null;
  createdAt: string | Date;
  enabled: boolean;
};

function fmt(v: string | Date) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
}

export function ApiKeys() {
  const { data, loading, error, refetch } = useAsync(async () => {
    const res = await authClient.apiKey.list();
    if (res.error) throw new Error(res.error.message ?? "list failed");
    // The list endpoint returns either a bare array or { apiKeys, total }.
    const raw = res.data as unknown;
    const rows = Array.isArray(raw)
      ? raw
      : ((raw as { apiKeys?: ApiKeyRow[] })?.apiKeys ?? []);
    return rows as ApiKeyRow[];
  });

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [rawKey, setRawKey] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await authClient.apiKey.create({ name: name.trim() || "Huddl extension" });
    setCreating(false);
    if (res.error || !res.data) {
      toast.error(res.error?.message ?? "Failed to create key");
      return;
    }
    setName("");
    setRawKey(res.data.key);
    refetch();
  }

  async function handleRevoke(keyId: string) {
    const res = await authClient.apiKey.delete({ keyId });
    if (res.error) {
      toast.error(res.error.message ?? "Failed to revoke");
      return;
    }
    toast.success("Key revoked");
    refetch();
  }

  async function copyKey() {
    if (!rawKey) return;
    await navigator.clipboard.writeText(rawKey);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">API keys</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate a key for the extension</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex items-end gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Huddl extension"
              />
            </div>
            <Button type="submit" disabled={creating}>
              <KeyRoundIcon className="size-4" />
              {creating ? "Generating…" : "Generate key"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active keys</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && <p className="text-sm text-destructive">Failed to load keys.</p>}
          {!loading && !error && (data?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">No keys yet.</p>
          )}
          {!loading && !error && (data?.length ?? 0) > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell>{k.name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {k.start ? `${k.start}…` : "••••"}
                    </TableCell>
                    <TableCell>{fmt(k.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="sm" onClick={() => handleRevoke(k.id)}>
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Raw key shown exactly once, right after creation. */}
      <Dialog open={rawKey !== null} onOpenChange={(o) => !o && setRawKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy your API key now</DialogTitle>
            <DialogDescription>
              This is the only time the full key is shown. Paste it into the extension's options.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input readOnly value={rawKey ?? ""} className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={copyKey}>
              <CopyIcon className="size-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setRawKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
