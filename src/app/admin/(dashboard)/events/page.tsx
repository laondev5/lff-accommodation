"use client";

import { CalendarDays, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Pager, usePagination, useViewMode, ViewToggle } from "@/components/list-view";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ConfirmDialog, EmptyState, ErrorNote, Field, PageHeader, Spinner } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api, useApi } from "@/lib/api";
import { fmtDate, isoToDateInput, todayInput } from "@/lib/format";
import { cn } from "@/lib/utils";

const startOfDay = (v: string) => {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0).toISOString();
};
const endOfDay = (v: string) => {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59).toISOString();
};

export default function EventsPage() {
  const { data, loading, reload } = useApi<any[]>("admin/events");
  const [now] = useState(() => Date.now());
  const [mode, setMode] = useViewMode("view:events");
  const pg = usePagination(data, 10);
  const phaseOf = (ev: any) => (new Date(ev.endDate).getTime() < now ? "Past" : new Date(ev.startDate).getTime() <= now ? "Ongoing" : "Upcoming");
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", description: "", startDate: todayInput(), endDate: todayInput(3), isActive: true });
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<any | null>(null);

  function openForm(ev?: any) {
    setError(undefined);
    setForm(
      ev
        ? { name: ev.name, description: ev.description ?? "", startDate: isoToDateInput(ev.startDate), endDate: isoToDateInput(ev.endDate), isActive: ev.isActive }
        : { name: "", description: "", startDate: todayInput(), endDate: todayInput(3), isActive: true },
    );
    setEditing(ev ?? {});
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    const body = { name: form.name, description: form.description, isActive: form.isActive, startDate: startOfDay(form.startDate), endDate: endOfDay(form.endDate) };
    try {
      if (editing?._id) {
        await api(`admin/events/${editing._id}`, { method: "PATCH", body });
        toast.success("Event updated");
      } else {
        await api("admin/events", { method: "POST", body });
        toast.success("Event created. Now choose which accommodations are open for it.");
      }
      setEditing(null);
      reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await api(`admin/events/${deleting._id}`, { method: "DELETE" });
      toast.success("Event deleted");
      setDeleting(null);
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Events"
        description="During an event only the accommodations you open are bookable, at the price you set."
        actions={
          <Button onClick={() => openForm()}>
            <Plus /> Create event
          </Button>
        }
      />

      <div className="mb-3 flex justify-end">
        <ViewToggle value={mode} onChange={setMode} />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : !data?.length ? (
        <EmptyState title="No events yet" hint="Create an event such as a convention or retreat to control availability and pricing for its dates." />
      ) : mode === "table" ? (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Open accommodations</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pg.items.map((ev) => {
                const phase = phaseOf(ev);
                return (
                  <TableRow key={ev._id}>
                    <TableCell className="font-medium">{ev.name}</TableCell>
                    <TableCell className="text-sm">
                      {fmtDate(ev.startDate)} – {fmtDate(ev.endDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Badge variant={phase === "Ongoing" ? "default" : "secondary"}>{phase}</Badge>
                        {!ev.isActive && <Badge variant="outline">Draft</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{ev.openCount}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <Link href={`/admin/events/${ev._id}`} className={cn(buttonVariants({ size: "sm" }))}>
                          <Settings2 /> Availability & pricing
                        </Link>
                        <Button size="icon-sm" variant="outline" aria-label="Edit event" onClick={() => openForm(ev)}>
                          <Pencil />
                        </Button>
                        <Button size="icon-sm" variant="ghost" className="text-destructive" aria-label="Delete event" onClick={() => setDeleting(ev)}>
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pg.items.map((ev) => {
            const phase = phaseOf(ev);
            return (
              <Card key={ev._id}>
                <CardContent className="grid gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{ev.name}</h3>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <CalendarDays className="size-3.5" /> {fmtDate(ev.startDate)} – {fmtDate(ev.endDate)}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Badge variant={phase === "Ongoing" ? "default" : "secondary"}>{phase}</Badge>
                      {!ev.isActive && <Badge variant="outline">Draft</Badge>}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{ev.openCount} accommodation(s) open for this event</p>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/events/${ev._id}`} className={cn(buttonVariants({ size: "sm" }))}>
                      <Settings2 /> Availability & pricing
                    </Link>
                    <Button size="sm" variant="outline" onClick={() => openForm(ev)}>
                      <Pencil /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleting(ev)}>
                      <Trash2 /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {!loading && <Pager page={pg.page} pageSize={pg.pageSize} total={pg.total} onPage={pg.setPage} onPageSize={pg.setPageSize} />}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?._id ? "Edit event" : "Create event"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="grid gap-4">
            <Field label="Event name">
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Annual Convention" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts">
                <Input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </Field>
              <Field label="Ends">
                <Input required type="date" min={form.startDate} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </Field>
            </div>
            <Field label="Description">
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <span>
                <span className="font-medium">Active</span>
                <span className="block text-xs text-muted-foreground">Draft events don't affect availability or pricing.</span>
              </span>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            </label>
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

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="Pricing and availability return to normal for these dates. Existing bookings are not affected."
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </>
  );
}
