import { cookies } from "next/headers";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Remember the sidebar state across reloads.
  const open = (await cookies()).get("sidebar_state")?.value !== "false";
  return <AdminShell defaultOpen={open}>{children}</AdminShell>;
}
