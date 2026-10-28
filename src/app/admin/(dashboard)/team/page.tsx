"use client";

import { Copy, KeyRound, MoreVertical, Plus, Power, Trash2, UserCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog, EmptyState, ErrorNote, Field, PageHeader, Spinner } from "@/components/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, useApi } from "@/lib/api";
import { fmtDate } from "@/lib/format";

type Credentials = { name: string; email: string; password: string; reset?: boolean };

export default function TeamPage() {
  const { data, loading, error, reload } = useApi<any[]>("admin/team");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "delete" | "reset" | "deactivate"; m: any } | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(undefined);
    try {
      const res = await api("admin/team", { method: "POST", body: { name: form.name, email: form.email, password: form.password || undefined } });
      setCreds({ name: res.name, email: res.email, password: res.password });
      setOpen(false);
      setForm({ name: "", email: "", password: "" });
      reload();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function setActive(m: any, active: boolean) {
    try {
      await api(`admin/team/${m.id}`, { method: "PATCH", body: { active } });
      toast.success(active ? `${m.name} can sign in again` : `${m.name} has been deactivated`);
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === "delete") {
        await api(`admin/team/${confirm.m.id}`, { method: "DELETE" });
        toast.success("Manager removed");
      } else if (confirm.kind === "deactivate") {
        await setActive(confirm.m, false);
      } else {
        const res = await api(`admin/team/${confirm.m.id}/reset-password`, { method: "POST" });
        setCreds({ name: res.name, email: res.email, password: res.password, reset: true });
      }
      setConfirm(null);
      reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const copy = (t: string) => navigator.clipboard.writeText(t).then(() => toast.success("Copied"));

  if (error?.status === 403) {
    return (
      <>
        <PageHeader title="Team" />
        <EmptyState title="Admins only" hint="Only an admin can create and manage managers." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Team"
        description="Managers can use everything in the dashboard except API keys and this Team page."
        actions={
          <Button
            onClick={() => {
              setFormError(undefined);
              setOpen(true);
            }}
          >
            <Plus /> Add manager
          </Button>
        }
      />

      {creds && (
        <Alert className="mb-4">
          <KeyRound />
          <AlertTitle>{creds.reset ? `New password for ${creds.name}` : `Manager account created for ${creds.name}`}</AlertTitle>
          <AlertDescription className="grid gap-2">
            <p>Share these sign-in details privately. The password is shown only now.</p>
            <div className="grid gap-1.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-20 text-muted-foreground">Email</span>
                <code className="rounded bg-muted px-2 py-1 text-xs">{creds.email}</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20 text-muted-foreground">Password</span>
                <code className="rounded bg-muted px-2 py-1 text-xs">{creds.password}</code>
                <Button size="icon-sm" variant="outline" aria-label="Copy password" onClick={() => copy(creds.password)}>
                  <Copy />
                </Button>
              </div>
            </div>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => setCreds(null)}>
              I've saved it
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <Skeleton className="h-48" />
      ) : !data?.length ? (
        <EmptyState title="No team members" />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((m) => (
                <TableRow key={m.id} className={m.active ? "" : "opacity-60"}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-sm">{m.email}</TableCell>
                  <TableCell>
                    <Badge variant={m.role === "admin" ? "default" : "secondary"} className="capitalize">
                      {m.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{m.active ? <Badge variant="outline">Active</Badge> : <Badge variant="destructive">Deactivated</Badge>}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtDate(m.createdAt)}</TableCell>
                  <TableCell>
                    {m.role === "manager" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}>
                          <MoreVertical />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {m.active ? (
                            <DropdownMenuItem onClick={() => setConfirm({ kind: "deactivate", m })}>
                              <Power /> Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setActive(m, true)}>
                              <UserCheck /> Reactivate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setConfirm({ kind: "reset", m })}>
                            <KeyRound /> Reset password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setConfirm({ kind: "delete", m })}>
                            <Trash2 /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add manager</DialogTitle>
          </DialogHeader>
          <form onSubmit={create} className="grid gap-4">
            <Field label="Full name">
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Email (their sign-in)">
              <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Password (optional)" hint="Leave blank to generate a secure one. They can change it in Settings after signing in.">
              <Input type="text" minLength={8} autoComplete="off" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <ErrorNote message={formError} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Spinner />} Create manager
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm?.kind === "delete" ? `Remove ${confirm.m.name}?` : confirm?.kind === "reset" ? `Reset password for ${confirm.m.name}?` : `Deactivate ${confirm?.m.name}?`
        }
        description={
          confirm?.kind === "delete"
            ? "Their account is deleted permanently."
            : confirm?.kind === "reset"
              ? "Their current password stops working and a new one is shown to you once."
              : "They are signed out immediately and can't sign in until you reactivate them."
        }
        confirmLabel={confirm?.kind === "delete" ? "Remove" : confirm?.kind === "reset" ? "Reset password" : "Deactivate"}
        destructive={confirm?.kind !== "reset"}
        loading={busy}
        onConfirm={runConfirm}
      />
    </>
  );
}
