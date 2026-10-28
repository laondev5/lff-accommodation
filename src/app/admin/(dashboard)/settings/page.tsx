"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ErrorNote, Field, PageHeader, Spinner } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api, useApi } from "@/lib/api";

type Bank = { bankName: string; accountNumber: string; accountName: string; active: boolean };

export default function SettingsPage() {
  const { data, loading } = useApi<any>("admin/settings");
  const [s, setS] = useState({ churchName: "", contactEmail: "", contactPhone: "" });
  const [banks, setBanks] = useState<Bank[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!data) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setS({ churchName: data.churchName ?? "", contactEmail: data.contactEmail ?? "", contactPhone: data.contactPhone ?? "" });
    setBanks((data.bankAccounts ?? []).map((b: any) => ({ bankName: b.bankName, accountNumber: b.accountNumber, accountName: b.accountName, active: b.active })));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [data]);

  const setBank = (i: number, patch: Partial<Bank>) => setBanks((b) => b.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      await api("admin/settings", { method: "PUT", body: { ...s, bankAccounts: banks } });
      toast.success("Settings saved");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-96" />;

  return (
    <>
      <PageHeader title="Settings & accounts" description="Bank accounts shown to visitors who choose to pay by direct transfer." />
      <form onSubmit={save} className="grid max-w-3xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Church details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Church name">
              <Input required value={s.churchName} onChange={(e) => setS({ ...s, churchName: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact email">
                <Input type="email" value={s.contactEmail} onChange={(e) => setS({ ...s, contactEmail: e.target.value })} />
              </Field>
              <Field label="Contact phone">
                <Input value={s.contactPhone} onChange={(e) => setS({ ...s, contactPhone: e.target.value })} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bank accounts</CardTitle>
            <CardDescription>Visitors see the active accounts at checkout and send their transfer here.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {banks.length === 0 && <p className="text-sm text-muted-foreground">No account added yet.</p>}
            {banks.map((b, i) => (
              <div key={i} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <Field label="Bank">
                  <Input required value={b.bankName} onChange={(e) => setBank(i, { bankName: e.target.value })} placeholder="e.g. GTBank" />
                </Field>
                <Field label="Account number">
                  <Input required inputMode="numeric" value={b.accountNumber} onChange={(e) => setBank(i, { accountNumber: e.target.value.replace(/\D/g, "") })} />
                </Field>
                <Field label="Account name">
                  <Input required value={b.accountName} onChange={(e) => setBank(i, { accountName: e.target.value })} />
                </Field>
                <div className="flex items-end gap-3 sm:pb-1">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={b.active} onCheckedChange={(v) => setBank(i, { active: v })} /> Active
                  </label>
                  <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" aria-label="Remove account" onClick={() => setBanks(banks.filter((_, idx) => idx !== i))}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => setBanks([...banks, { bankName: "", accountNumber: "", accountName: "", active: true }])}>
                <Plus /> Add bank account
              </Button>
            </div>
          </CardContent>
        </Card>

        <ErrorNote message={error} />
        <div>
          <Button type="submit" disabled={saving}>
            {saving && <Spinner />} Save settings
          </Button>
        </div>
      </form>

      <PasswordCard />
    </>
  );
}

function PasswordCard() {
  const [f, setF] = useState({ currentPassword: "", newPassword: "" });
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("auth/password", { method: "PATCH", body: f });
      toast.success("Password changed");
      setF({ currentPassword: "", newPassword: "" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="mt-6 max-w-3xl">
      <CardHeader>
        <CardTitle>Change password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Current password">
            <Input type="password" autoComplete="current-password" required value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} />
          </Field>
          <Field label="New password" hint="At least 8 characters">
            <Input type="password" autoComplete="new-password" required minLength={8} value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} />
          </Field>
          <div>
            <Button type="submit" variant="outline" disabled={busy}>
              {busy && <Spinner />} Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
