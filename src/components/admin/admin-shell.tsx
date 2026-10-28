"use client";

import { Bell, BedDouble, CalendarDays, ClipboardList, CreditCard, KeyRound, LayoutDashboard, LogOut, Settings, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { api } from "@/lib/api";
import { createPusher } from "@/lib/pusher";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/accommodations", label: "Accommodations", icon: BedDouble },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/bookings", label: "Bookings & Occupants", icon: ClipboardList },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, badge: "payments" },
  { href: "/admin/notifications", label: "Notifications", icon: Bell, badge: "notifications" },
];
// Items marked adminOnly are hidden from managers (the backend enforces this too).
const SETTINGS_NAV: { href: string; label: string; icon: typeof Settings; adminOnly?: boolean }[] = [
  { href: "/admin/settings", label: "Settings & Accounts", icon: Settings },
  { href: "/admin/team", label: "Team (managers)", icon: UsersRound, adminOnly: true },
  { href: "/admin/api-keys", label: "API keys", icon: KeyRound, adminOnly: true },
];

type Me = { name: string; email: string; role: "admin" | "manager" };
const initials = (name?: string) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "AD";

function AppSidebar({ unread, pendingPayments, me }: { unread: number; pendingPayments: number; me: Me | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));
  const counts: Record<string, number> = { notifications: unread, payments: pendingPayments };

  async function logout() {
    await fetch("/api/session", { method: "DELETE" });
    router.replace("/admin/login");
  }

  const renderItem = (item: { href: string; label: string; icon: typeof Settings; exact?: boolean; badge?: string }) => (
    <SidebarMenuItem key={item.href}>
      <SidebarMenuButton
        isActive={isActive(item.href, item.exact)}
        tooltip={item.label}
        render={<Link href={item.href} onClick={() => isMobile && setOpenMobile(false)} />}
      >
        <item.icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
      {"badge" in item && item.badge && counts[item.badge] > 0 && <SidebarMenuBadge>{counts[item.badge]}</SidebarMenuBadge>}
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/admin" />}>
              <Logo tile size={26} className="size-9" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-heading font-bold">{process.env.NEXT_PUBLIC_APP_NAME ?? "LFF Accommodation"}</span>
                <span className="truncate text-xs capitalize text-sidebar-foreground/70">{me?.role ?? "Staff"}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{NAV.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{SETTINGS_NAV.filter((i) => !i.adminOnly || me?.role === "admin").map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign out" onClick={logout}>
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function AdminShell({ children, defaultOpen }: { children: ReactNode; defaultOpen: boolean }) {
  const [unread, setUnread] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [me, setMe] = useState<Me | null>(null);
  const router = useRouter();

  useEffect(() => {
    api<Me>("auth/me")
      .then(setMe)
      .catch(() => {});
  }, []);

  const refreshCounts = useCallback(async () => {
    try {
      const p = await api("admin/dashboard");
      setPendingPayments(p.awaitingConfirmation);
      setUnread(p.unreadNotifications);
    } catch {}
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshCounts();
  }, [refreshCounts]);

  // Realtime: Pusher private channel (no-op when keys are not configured).
  useEffect(() => {
    const pusher = createPusher();
    if (!pusher) return;
    const channel = pusher.subscribe("private-admin");
    channel.bind("notification", (n: { title: string; message: string }) => {
      toast(n.title, { description: n.message });
      refreshCounts();
      router.refresh();
      window.dispatchEvent(new CustomEvent("admin:notification"));
    });
    return () => {
      channel.unbind_all();
      pusher.unsubscribe("private-admin");
      pusher.disconnect();
    };
  }, [refreshCounts, router]);

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar unread={unread} pendingPayments={pendingPayments} me={me} />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <span className="hidden text-sm text-muted-foreground sm:inline">{me?.role === "manager" ? "Manager dashboard" : "Church accommodation management"}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/admin/notifications" aria-label="Notifications" />} className="relative">
              <Bell />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Button>
            <Avatar className="size-8">
              <AvatarFallback title={me ? `${me.name} (${me.role})` : undefined}>{initials(me?.name)}</AvatarFallback>
            </Avatar>
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
