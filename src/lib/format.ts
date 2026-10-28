export const naira = (n: number | undefined | null) => `₦${(n ?? 0).toLocaleString("en-NG")}`;

export const fmtDateTime = (d: string | Date | undefined) =>
  d ? new Date(d).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "—";
export const fmtDate = (d: string | Date | undefined) => (d ? new Date(d).toLocaleDateString("en-NG", { dateStyle: "medium" }) : "—");

/** `yyyy-mm-dd` (from <input type="date">) -> ISO string at 12:00 local time (check-in time). */
export function dateInputToIso(value: string, hour = 12) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, hour, 0, 0).toISOString();
}
export const todayInput = (offsetDays = 0) => {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
/** ISO -> `yyyy-mm-dd` in local time */
export const isoToDateInput = (iso: string | Date) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function timeLeft(to: string | Date, now = Date.now()) {
  const ms = new Date(to).getTime() - now;
  if (ms <= 0) return "Ended";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 48) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  return `${h}h ${m}m left`;
}

export const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  awaiting_confirmation: "Awaiting confirmation",
  // payment statuses
  pending: "Awaiting payment",
  submitted: "Awaiting confirmation",
  success: "Paid",
  active: "Active",
  completed: "Checked out",
  cancelled: "Cancelled",
  expired: "Expired",
};
