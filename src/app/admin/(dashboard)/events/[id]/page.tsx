"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense, use, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Spinner, StatusBadge } from "@/components/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api, useApi } from "@/lib/api";
import { fmtDate, naira } from "@/lib/format";

type Row = { open: boolean; price: string };

function EventConfig({ id }: { id: string }) {
  const ev = useApi<any>(`admin/events/${id}`);
  const accs = useApi<any[]>("admin/accommodations");
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [saving, setSaving] = useState(false);
  const [warnings, setWarnings] = useState<any[]>([]);

  useEffect(() => {
    if (!ev.data || !accs.data) return;
    const next: Record<string, Row> = {};
    for (const a of accs.data) {
      const entry = ev.data.accommodations.find((x: any) => (x.accommodation?._id ?? x.accommodation) === a._id);
      next[a._id] = { open: !!entry?.isAvailable, price: String(entry?.pricePerDay ?? a.basePricePerDay) };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRows(next);
  }, [ev.data, accs.data]);

  const set = (accId: string, patch: Partial<Row>) => setRows((r) => ({ ...r, [accId]: { ...r[accId], ...patch } }));
  const setAll = (open: boolean) => setRows((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { ...v, open }])));

  async function save() {
    setSaving(true);
    try {
      const accommodations = Object.entries(rows).map(([accommodation, r]) => ({ accommodation, isAvailable: r.open, pricePerDay: Number(r.price) || 0 }));
      const res = await api<{ warnings: any[] }>(`admin/events/${id}/accommodations`, { method: "PUT", body: { accommodations } });
      setWarnings(res.warnings);
      toast.success("Event availability and prices saved");
      ev.reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (ev.loading || accs.loading || !ev.data) return <Skeleton className="h-96" />;
  const openCount = Object.values(rows).filter((r) => r.open).length;

  return (
    <>
      <Link href="/admin/events" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Events
      </Link>
      <PageHeader
        title={ev.data.name}
        description={`${fmtDate(ev.data.startDate)} – ${fmtDate(ev.data.endDate)} · ${openCount} of ${accs.data?.length ?? 0} accommodations open`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setAll(true)}>
              Open all
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAll(false)}>
              Close all
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Spinner />} Save changes
            </Button>
          </>
        }
      />

      {warnings.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>{warnings.length} existing booking(s) fall inside this event on closed accommodations</AlertTitle>
          <AlertDescription>
            {warnings.map((w) => `${w.code} (${w.visitor} · ${w.accommodation})`).join(", ")}. They were not cancelled, so decide how to handle them.
          </AlertDescription>
        </Alert>
      )}

      <p className="mb-3 text-sm text-muted-foreground">Closed accommodations can't be booked on any day of this event. Open ones use the event price below instead of their normal price.</p>

      <div className="grid gap-3">
        {accs.data?.map((a) => {
          const r = rows[a._id];
          if (!r) return null;
          return (
            <Card key={a._id} className={r.open ? "" : "bg-muted/40"}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Switch checked={r.open} onCheckedChange={(v) => set(a._id, { open: v })} aria-label={`Open ${a.name}`} />
                  <div>
                    <p className="font-medium">
                      {a.name} {a.isLocked && <StatusBadge status="locked" />}
                    </p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {a.type} · normal price {naira(a.basePricePerDay)}/day
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Event price ₦</span>
                  <Input type="number" min={0} className="w-32" disabled={!r.open} value={r.price} onChange={(e) => set(a._id, { price: e.target.value })} />
                  <span className="text-sm text-muted-foreground">/day</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function WithId({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <EventConfig id={id} />;
}

export default function EventConfigPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <WithId params={params} />
    </Suspense>
  );
}
