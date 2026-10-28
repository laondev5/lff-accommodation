"use client";

import { AlertTriangle, BedDouble, Clock, Lock, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import { PageHeader, StatusBadge } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/lib/api";
import { fmtDateTime, naira } from "@/lib/format";

function Stat({ title, value, icon, href, tone }: { title: string; value: ReactNode; icon: ReactNode; href?: string; tone?: string }) {
  const body = (
    <Card className="h-full transition-colors hover:bg-muted/40">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <span className={tone}>{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default function DashboardPage() {
  const { data, loading } = useApi<any>("admin/dashboard");

  if (loading || !data) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </>
    );
  }
  const a = data.accommodations;
  return (
    <>
      <PageHeader title="Dashboard" description="Overview of accommodations and the people staying in them." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Total accommodations" value={a.total} icon={<BedDouble className="size-4" />} href="/admin/accommodations" />
        <Stat title="With free units" value={a.available} icon={<BedDouble className="size-4" />} tone="text-emerald-600" href="/admin/accommodations" />
        <Stat title="In use" value={a.occupied} icon={<Users className="size-4" />} tone="text-blue-600" href="/admin/bookings?view=occupants" />
        <Stat title="Full (no units left)" value={a.full} icon={<AlertTriangle className="size-4" />} tone="text-red-600" href="/admin/accommodations" />
        <Stat title="Units occupied" value={`${a.occupiedUnits}/${a.totalUnits}`} icon={<Users className="size-4" />} href="/admin/bookings?view=occupants" />
        <Stat title="Locked" value={a.locked} icon={<Lock className="size-4" />} href="/admin/accommodations" />
        <Stat title="Expiring in 24h" value={data.expiringSoon} icon={<Clock className="size-4" />} tone="text-amber-600" href="/admin/bookings?view=expiring" />
        <Stat title="Overdue (not signed out)" value={data.overdue} icon={<AlertTriangle className="size-4" />} tone="text-red-600" href="/admin/bookings?view=overdue" />
        <Stat title="Transfers to confirm" value={data.awaitingConfirmation} icon={<Wallet className="size-4" />} tone="text-blue-600" href="/admin/payments" />
        <Stat title="Revenue this month" value={naira(data.revenueThisMonth)} icon={<Wallet className="size-4" />} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent bookings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {data.recentBookings.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
          {data.recentBookings.map((b: any) => (
            <div key={b._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <div>
                <p className="font-medium">
                  {b.visitor.name} <span className="text-muted-foreground">· {b.code}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {b.accommodation?.name} · {fmtDateTime(b.startDate)} → {fmtDateTime(b.endDate)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{naira(b.totalAmount)}</span>
                <StatusBadge status={b.status} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
