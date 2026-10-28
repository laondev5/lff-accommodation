"use client";

import { Lock, LockOpen, LogOut, MoreVertical, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { Pager, usePagination, useViewMode, ViewToggle } from "@/components/list-view";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ConfirmDialog, EmptyState, ErrorNote, Field, PageHeader, SelectField, Spinner, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, useApi } from "@/lib/api";
import { fmtDate, naira } from "@/lib/format";

const TYPES = ["room", "suite", "apartment", "hostel", "other"].map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1) }));
const empty = { name: "", type: "room", capacity: "2", totalUnits: "1", basePricePerDay: "", description: "", amenities: "", images: "" };

export default function AccommodationsPage() {
  const [q, setQ] = useState("");
  const [state, setState] = useState("all");
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (state !== "all") qs.set("state", state);
  const { data, loading, reload } = useApi<any[]>(`admin/accommodations?${qs}`);
  const [mode, setMode] = useViewMode("view:accommodations");
  const pg = usePagination(data, 10);

  const [editing, setEditing] = useState<any | null>(null); // null = closed, {} = new
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "delete"; acc: any } | null>(null);
  const [occupants, setOccupants] = useState<any | null>(null); // accommodation whose occupants are listed for sign-out
  const [busy, setBusy] = useState(false);

  function openForm(acc?: any) {
    setError(undefined);
    setForm(
      acc
        ? { name: acc.name, type: acc.type, capacity: String(acc.capacity), totalUnits: String(acc.totalUnits ?? 1), basePricePerDay: String(acc.basePricePerDay), description: acc.description ?? "", amenities: (acc.amenities ?? []).join(", "), images: (acc.images ?? []).join("\n") }
        : empty,
    );
    setEditing(acc ?? {});
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    const body = {
      name: form.name,
      type: form.type,
      capacity: Number(form.capacity),
      totalUnits: Number(form.totalUnits),
      basePricePerDay: Number(form.basePricePerDay),
      description: form.description,
      amenities: form.amenities.split(",").map((s) => s.trim()).filter(Boolean),
      images: form.images.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (editing?._id) await api(`admin/accommodations/${editing._id}`, { method: "PATCH", body });
      else await api("admin/accommodations", { method: "POST", body });
      toast.success(editing?._id ? "Accommodation updated" : "Accommodation added");
      setEditing(null);
      reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function signOut(booking: any) {
    setBusy(true);
    try {
      await api(`admin/bookings/${booking._id}/checkout`, { method: "POST" });
      toast.success(`${booking.visitor.name} signed out`);
      setOccupants(null);
      reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleLock(acc: any) {
    try {
      await api(`admin/accommodations/${acc._id}/lock`, { method: "PATCH", body: { locked: !acc.isLocked } });
      toast.success(acc.isLocked ? `${acc.name} is now visible to visitors` : `${acc.name} locked - hidden from visitors`);
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    setBusy(true);
    try {
      await api(`admin/accommodations/${confirm.acc._id}`, { method: "DELETE" });
      toast.success("Accommodation deleted");
      setConfirm(null);
      reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const rowActions = (a: any) => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}>
        <MoreVertical />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => openForm(a)}>
          <Pencil /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toggleLock(a)}>
          {a.isLocked ? <LockOpen /> : <Lock />} {a.isLocked ? "Unlock" : "Lock"}
        </DropdownMenuItem>
        {a.occupiedUnits > 0 && (
          <DropdownMenuItem onClick={() => setOccupants(a)}>
            <LogOut /> Sign out occupant{a.occupiedUnits > 1 ? "s" : ""}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={() => setConfirm({ kind: "delete", acc: a })}>
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <PageHeader
        title="Accommodations"
        description="Add, edit, lock and sign out accommodations. Locked ones are invisible to everyone except admins."
        actions={
          <Button onClick={() => openForm()}>
            <Plus /> Add accommodation
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs" />
        <SelectField
          className="sm:w-44"
          value={state}
          onChange={setState}
          options={[
            { value: "all", label: "All states" },
            { value: "available", label: "Available" },
            { value: "occupied", label: "Partly / occupied" },
            { value: "full", label: "Full" },
            { value: "locked", label: "Locked" },
          ]}
        />
      </div>

      <div className="mb-3 flex justify-end">
        <ViewToggle value={mode} onChange={setMode} />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState title="No accommodations found" hint="Add your first accommodation to get started." />
      ) : mode === "table" ? (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Accommodation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Occupants</TableHead>
                <TableHead className="text-right">Price / day</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pg.items.map((a) => (
                <TableRow key={a._id} className={a.isLocked ? "opacity-70" : ""}>
                  <TableCell>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {a.type} · sleeps {a.capacity}
                      {a.totalUnits > 1 ? " each" : ""}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={a.state} />
                  </TableCell>
                  <TableCell>
                    <span className={a.state === "full" ? "font-medium text-red-600" : ""}>
                      {a.occupiedUnits}/{a.totalUnits}
                    </span>
                    {a.upcomingCount > 0 && <p className="text-xs text-muted-foreground">{a.upcomingCount} upcoming</p>}
                  </TableCell>
                  <TableCell className="max-w-56 text-sm">
                    {a.currentBookings?.length ? (
                      <>
                        <p className="truncate">{a.currentBookings.slice(0, 2).map((cb: any) => cb.visitor.name).join(", ")}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.currentBookings.length > 2 ? `+${a.currentBookings.length - 2} more · ` : ""}until {fmtDate(a.currentBookings[0].endDate)}
                        </p>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{naira(a.basePricePerDay)}</TableCell>
                  <TableCell>{rowActions(a)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pg.items.map((a) => (
            <Card key={a._id} className={a.isLocked ? "opacity-80" : ""}>
              <CardContent className="grid gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{a.name}</h3>
                    <p className="text-sm capitalize text-muted-foreground">
                      {a.type} · sleeps {a.capacity}
                      {a.totalUnits > 1 ? " each" : ""}
                    </p>
                  </div>
                  {rowActions(a)}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.state} />
                    <span className={`text-xs font-medium ${a.state === "full" ? "text-red-600" : "text-muted-foreground"}`}>
                      {a.occupiedUnits}/{a.totalUnits} occupied
                    </span>
                  </div>
                  <span className="font-medium">
                    {naira(a.basePricePerDay)}
                    <span className="text-xs font-normal text-muted-foreground"> /day</span>
                  </span>
                </div>
                {a.currentBookings?.length > 0 && (
                  <div className="grid gap-1.5 rounded-lg bg-muted p-2.5 text-sm">
                    {a.currentBookings.slice(0, 3).map((cb: any) => (
                      <div key={cb._id}>
                        <p className="flex items-center gap-1.5 font-medium">
                          <Users className="size-3.5" /> {cb.visitor.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cb.code} · until {fmtDate(cb.endDate)}
                        </p>
                      </div>
                    ))}
                    {a.currentBookings.length > 3 && <p className="text-xs text-muted-foreground">+{a.currentBookings.length - 3} more</p>}
                  </div>
                )}
                {a.upcomingCount > 0 && <p className="text-xs text-muted-foreground">{a.upcomingCount} upcoming booking(s)</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {!loading && <Pager page={pg.page} pageSize={pg.pageSize} total={pg.total} onPage={pg.setPage} onPageSize={pg.setPageSize} />}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?._id ? "Edit accommodation" : "Add accommodation"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="grid gap-4">
            <Field label="Name">
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Room A1" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <SelectField value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={TYPES} />
              </Field>
              <Field label="People per unit">
                <Input required type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              </Field>
            </div>
            <Field label="Number of units (count)" hint="How many can be booked at the same time, e.g. 6 for a hostel with 6 beds. It shows as Full when all are taken.">
              <Input required type="number" min={1} value={form.totalUnits} onChange={(e) => setForm({ ...form, totalUnits: e.target.value })} />
            </Field>
            <Field label="Base price per day (₦)" hint="Used outside of events. Events can set their own price.">
              <Input required type="number" min={0} value={form.basePricePerDay} onChange={(e) => setForm({ ...form, basePricePerDay: e.target.value })} />
            </Field>
            <Field label="Description">
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Field label="Amenities" hint="Comma separated, e.g. WiFi, AC, Private bathroom">
              <Input value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} />
            </Field>
            <Field label="Image URLs" hint="One URL per line (optional)">
              <Textarea rows={2} value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} />
            </Field>
            <ErrorNote message={error} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Spinner />} Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!occupants} onOpenChange={(o) => !o && setOccupants(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign out from {occupants?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            {occupants?.currentBookings?.map((cb: any) => (
              <div key={cb._id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                <div className="text-sm">
                  <p className="font-medium">{cb.visitor.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {cb.code} · until {fmtDate(cb.endDate)}
                  </p>
                </div>
                <Button size="sm" disabled={busy} onClick={() => signOut(cb)}>
                  <LogOut /> Sign out
                </Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Signing out frees the unit for new bookings.</p>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Delete ${confirm?.acc.name}?`}
        description="It will disappear from the system. Past bookings are kept for records. This is blocked while it has active or upcoming bookings."
        confirmLabel="Delete"
        destructive
        loading={busy}
        onConfirm={runConfirm}
      />
    </>
  );
}
