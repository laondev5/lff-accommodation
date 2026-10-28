"use client";

import { CalendarPlus, LogOut, MoreVertical, Plus, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Pager, useViewMode, ViewToggle } from "@/components/list-view";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ConfirmDialog, EmptyState, ErrorNote, Field, PageHeader, SelectField, Spinner, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, useApi } from "@/lib/api";
import { dateInputToIso, fmtDateTime, naira, timeLeft, todayInput } from "@/lib/format";

const VIEWS = [
  { value: "occupants", label: "Occupants" },
  { value: "expiring", label: "Expiring 24h" },
  { value: "overdue", label: "Overdue" },
  { value: "upcoming", label: "Upcoming" },
  { value: "all", label: "All bookings" },
];

function BookingsInner() {
  const sp = useSearchParams();
  const [view, setView] = useState(VIEWS.some((v) => v.value === sp.get("view")) ? sp.get("view")! : "occupants");
  const [status, setStatus] = useState("any");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [mode, setMode] = useViewMode("view:bookings", "table");

  const qs = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  if (view !== "all") qs.set("view", view);
  else if (status !== "any") qs.set("status", status);
  if (q) qs.set("q", q);
  const { data, meta, loading, reload } = useApi<any[]>(`admin/bookings?${qs}`);

  const [action, setAction] = useState<{ kind: "checkout" | "cancel" | "extend"; b: any } | null>(null);
  const [days, setDays] = useState("1");
  const [amount, setAmount] = useState("0");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [walkIn, setWalkIn] = useState(false);

  async function run() {
    if (!action) return;
    setBusy(true);
    try {
      const id = action.b._id;
      if (action.kind === "checkout") await api(`admin/bookings/${id}/checkout`, { method: "POST" });
      if (action.kind === "cancel") await api(`admin/bookings/${id}/cancel`, { method: "POST", body: { reason: reason || "Cancelled by admin" } });
      if (action.kind === "extend") await api(`admin/bookings/${id}/extend`, { method: "POST", body: { days: Number(days), amount: Number(amount) } });
      toast.success(action.kind === "checkout" ? "Occupant signed out" : action.kind === "cancel" ? "Booking cancelled" : "Stay extended");
      setAction(null);
      reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const rowActions = (b: any) => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}>
        <MoreVertical />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {b.status === "active" && !b.checkedOutAt && (
          <>
            <DropdownMenuItem onClick={() => setAction({ kind: "checkout", b })}>
              <LogOut /> Sign out
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setDays("1");
                setAmount("0");
                setAction({ kind: "extend", b });
              }}
            >
              <CalendarPlus /> Extend stay
            </DropdownMenuItem>
          </>
        )}
        {["pending_payment", "awaiting_confirmation", "active"].includes(b.status) && (
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => {
              setReason("");
              setAction({ kind: "cancel", b });
            }}
          >
            <XCircle /> Cancel booking
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <PageHeader
        title="Bookings & occupants"
        description="Everyone staying with you, who's leaving soon, and every booking made."
        actions={
          <Button onClick={() => setWalkIn(true)}>
            <Plus /> Walk-in booking
          </Button>
        }
      />

      <Tabs
        value={view}
        onValueChange={(v) => {
          setView(v as string);
          setPage(1);
        }}
      >
        <div className="overflow-x-auto pb-1">
          <TabsList>
            {VIEWS.map((v) => (
              <TabsTrigger key={v.value} value={v.value}>
                {v.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <div className="my-4 flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Search name, ID, email or phone…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className="sm:max-w-xs"
        />
        {view === "all" && (
          <SelectField
            className="sm:w-52"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={[
              { value: "any", label: "Any status" },
              { value: "pending_payment", label: "Awaiting payment" },
              { value: "awaiting_confirmation", label: "Awaiting confirmation" },
              { value: "active", label: "Active" },
              { value: "completed", label: "Checked out" },
              { value: "cancelled", label: "Cancelled" },
              { value: "expired", label: "Expired" },
            ]}
          />
        )}
      </div>

      <div className="mb-3 flex justify-end">
        <ViewToggle value={mode} onChange={setMode} />
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : !data?.length ? (
        <EmptyState title="Nothing here" hint="No bookings match this view." />
      ) : mode === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((b) => (
            <Card key={b._id}>
              <CardContent className="grid gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{b.visitor.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.code} · {b.visitor.phone}
                    </p>
                  </div>
                  {rowActions(b)}
                </div>
                <p className="text-sm">{b.accommodation?.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtDateTime(b.startDate)} → {fmtDateTime(b.endDate)}
                </p>
                <div className="flex items-center justify-between">
                  <StatusBadge status={b.status} />
                  <span className="text-sm font-medium">{naira(b.totalAmount)}</span>
                </div>
                {b.status === "active" && !b.checkedOutAt && <p className="text-xs font-medium text-amber-600">{timeLeft(b.endDate)}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Accommodation</TableHead>
                <TableHead>Stay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((b) => (
                <TableRow key={b._id}>
                  <TableCell>
                    <p className="font-medium">{b.visitor.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.code} · {b.visitor.phone}
                    </p>
                    <p className="text-xs text-muted-foreground">WhatsApp {b.visitor.whatsapp}</p>
                  </TableCell>
                  <TableCell>{b.accommodation?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    <p>{fmtDateTime(b.startDate)}</p>
                    <p className="text-muted-foreground">→ {fmtDateTime(b.endDate)}</p>
                    {b.status === "active" && !b.checkedOutAt && <p className="text-xs font-medium text-amber-600">{timeLeft(b.endDate)}</p>}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={b.status} />
                  </TableCell>
                  <TableCell className="text-right">{naira(b.totalAmount)}</TableCell>
                  <TableCell>{rowActions(b)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && meta && (
        <Pager
          page={page}
          pageSize={pageSize}
          total={meta.total}
          onPage={setPage}
          onPageSize={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      )}

      <ConfirmDialog
        open={!!action}
        onOpenChange={(o) => !o && setAction(null)}
        title={action?.kind === "checkout" ? `Sign out ${action.b.visitor.name}?` : action?.kind === "cancel" ? `Cancel booking ${action.b.code}?` : `Extend ${action?.b.visitor.name}'s stay`}
        description={
          action?.kind === "checkout"
            ? `${action.b.accommodation?.name} will be marked vacant.`
            : action?.kind === "cancel"
              ? "The guest is notified in their booking page. Any refund must be handled manually."
              : `Currently ends ${fmtDateTime(action?.b.endDate)}.`
        }
        confirmLabel={action?.kind === "checkout" ? "Sign out" : action?.kind === "cancel" ? "Cancel booking" : "Extend"}
        destructive={action?.kind === "cancel"}
        loading={busy}
        onConfirm={run}
      >
        {action?.kind === "extend" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Extra days">
              <Input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
            </Field>
            <Field label="Amount received (₦)" hint="0 for a free extension">
              <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
          </div>
        )}
        {action?.kind === "cancel" && <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />}
      </ConfirmDialog>

      <WalkInDialog
        open={walkIn}
        onOpenChange={setWalkIn}
        onDone={() => {
          setWalkIn(false);
          reload();
        }}
      />
    </>
  );
}

function WalkInDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const accs = useApi<any[]>(open ? "admin/accommodations" : null);
  const [f, setF] = useState({ accommodationId: "", startDate: todayInput(), durationDays: "1", name: "", email: "", phone: "", whatsapp: "" });
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      await api("admin/bookings", {
        method: "POST",
        body: {
          accommodationId: f.accommodationId,
          startDate: dateInputToIso(f.startDate, new Date().getHours()),
          durationDays: Number(f.durationDays),
          visitor: { name: f.name, email: f.email, phone: f.phone, whatsapp: f.whatsapp || f.phone },
        },
      });
      toast.success("Booking recorded as paid");
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Walk-in booking</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Accommodation">
            <SelectField
              value={f.accommodationId}
              onChange={(v) => setF({ ...f, accommodationId: v })}
              placeholder="Select…"
              options={(accs.data ?? []).filter((a) => !a.isLocked).map((a) => ({ value: a._id, label: `${a.name} · ${naira(a.basePricePerDay)}/day` }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Check-in date">
              <Input type="date" required value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
            </Field>
            <Field label="Days">
              <Input type="number" min={1} required value={f.durationDays} onChange={(e) => setF({ ...f, durationDays: e.target.value })} />
            </Field>
          </div>
          <Field label="Full name">
            <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Input required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            </Field>
            <Field label="WhatsApp">
              <Input value={f.whatsapp} placeholder="Same as phone" onChange={(e) => setF({ ...f, whatsapp: e.target.value })} />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">The price is calculated automatically (including event pricing) and the booking is marked as paid offline.</p>
          <ErrorNote message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !f.accommodationId}>
              {saving && <Spinner />} Create booking
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function BookingsPage() {
  return (
    <Suspense>
      <BookingsInner />
    </Suspense>
  );
}
