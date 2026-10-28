"use client";

import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog, EmptyState, ErrorNote, Field, PageHeader, Spinner } from "@/components/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api, useApi } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";

export default function ApiKeysPage() {
  const { data, loading, error: loadError, reload } = useApi<any[]>("admin/api-keys");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ key: string; webhookSecret: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      const res = await api("admin/api-keys", { method: "POST", body: { name, webhookUrl: webhookUrl || undefined } });
      setCreated(res);
      setOpen(false);
      setName("");
      setWebhookUrl("");
      reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const copy = (t: string) => navigator.clipboard.writeText(t).then(() => toast.success("Copied"));

  if (loadError?.status === 403) {
    return (
      <>
        <PageHeader title="API keys" />
        <EmptyState title="Admins only" hint="API keys can only be managed by an admin account." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="API keys"
        description="Let third-party websites and apps use the booking API. Send the key in the x-api-key header."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus /> New API key
          </Button>
        }
      />

      {created && (
        <Alert className="mb-4">
          <KeyRound />
          <AlertTitle>Copy your key for "{created.name}" now. It won't be shown again.</AlertTitle>
          <AlertDescription className="grid gap-2">
            <div className="flex items-center gap-2">
              <code className="break-all rounded bg-muted px-2 py-1 text-xs">{created.key}</code>
              <Button size="icon-sm" variant="outline" onClick={() => copy(created.key)} aria-label="Copy key">
                <Copy />
              </Button>
            </div>
            <p className="text-xs">
              Webhook signing secret (HMAC-SHA256 of the body, sent as <code>x-lff-signature</code>):
            </p>
            <div className="flex items-center gap-2">
              <code className="break-all rounded bg-muted px-2 py-1 text-xs">{created.webhookSecret}</code>
              <Button size="icon-sm" variant="outline" onClick={() => copy(created.webhookSecret)} aria-label="Copy secret">
                <Copy />
              </Button>
            </div>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => setCreated(null)}>
              I've saved it
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <Skeleton className="h-32" />
      ) : !data?.length ? (
        <EmptyState title="No API keys yet" hint="Create a key for each third-party app so you can revoke them independently." />
      ) : (
        <div className="grid gap-3">
          {data.map((k) => (
            <Card key={k._id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    {k.name} {!k.active && <Badge variant="destructive">Revoked</Badge>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <code>{k.prefix}…</code> · last used {k.lastUsedAt ? fmtDateTime(k.lastUsedAt) : "never"}
                  </p>
                  {k.webhookUrl && <p className="truncate text-xs text-muted-foreground">Webhook: {k.webhookUrl}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={k.active}
                      onCheckedChange={async (v) => {
                        await api(`admin/api-keys/${k._id}`, { method: "PATCH", body: { active: v } }).catch((e) => toast.error(e.message));
                        reload();
                      }}
                    />
                    Active
                  </label>
                  <Button size="icon-sm" variant="ghost" className="text-destructive" aria-label="Delete key" onClick={() => setDeleting(k)}>
                    <Trash2 />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New API key</DialogTitle>
          </DialogHeader>
          <form onSubmit={create} className="grid gap-4">
            <Field label="App name">
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Church mobile app" />
            </Field>
            <Field label="Webhook URL (optional)" hint="We POST signed booking events here (confirmed, expiring, expired, extended, checked out).">
              <Input type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://yourapp.com/hooks/lff" />
            </Field>
            <ErrorNote message={error} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Spinner />} Create key
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="Apps using this key will immediately lose access."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          await api(`admin/api-keys/${deleting._id}`, { method: "DELETE" }).catch((e) => toast.error(e.message));
          setDeleting(null);
          reload();
        }}
      />
    </>
  );
}
