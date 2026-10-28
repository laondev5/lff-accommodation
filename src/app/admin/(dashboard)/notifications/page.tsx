"use client";

import { AlertTriangle, Bell, CheckCheck, Clock, CreditCard, Wallet } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, useApi } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICON: Record<string, React.ReactNode> = {
  expiring_soon: <Clock className="size-4 text-amber-600" />,
  expired: <AlertTriangle className="size-4 text-red-600" />,
  transfer_submitted: <Wallet className="size-4 text-blue-600" />,
  booking_confirmed: <CreditCard className="size-4 text-emerald-600" />,
  refund_required: <AlertTriangle className="size-4 text-red-600" />,
};

export default function NotificationsPage() {
  const { data, meta, loading, reload } = useApi<any[]>("admin/notifications?limit=50");

  // New realtime notification arrives -> refresh the list.
  useEffect(() => {
    const h = () => reload();
    window.addEventListener("admin:notification", h);
    return () => window.removeEventListener("admin:notification", h);
  }, [reload]);

  async function markAll() {
    try {
      await api("admin/notifications/read-all", { method: "POST" });
      toast.success("All marked as read");
      reload();
      window.dispatchEvent(new CustomEvent("admin:notification"));
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function markOne(id: string) {
    await api(`admin/notifications/${id}/read`, { method: "PATCH" }).catch(() => {});
    reload();
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description={meta?.unread ? `${meta.unread} unread` : "You're all caught up."}
        actions={
          <Button variant="outline" onClick={markAll} disabled={!meta?.unread}>
            <CheckCheck /> Mark all as read
          </Button>
        }
      />
      {loading ? (
        <Skeleton className="h-48" />
      ) : !data?.length ? (
        <EmptyState title="No notifications yet" hint="You'll see expiring stays, new bookings and transfers to confirm here." />
      ) : (
        <div className="grid gap-2">
          {data.map((n) => (
            <Card key={n._id} className={cn(!n.read && "border-primary/40 bg-primary/5")}>
              <CardContent className="flex items-start gap-3">
                <div className="mt-0.5">{ICON[n.type] ?? <Bell className="size-4" />}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{fmtDateTime(n.createdAt)}</p>
                </div>
                {!n.read && (
                  <Button size="xs" variant="ghost" onClick={() => markOne(n._id)}>
                    Mark read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
