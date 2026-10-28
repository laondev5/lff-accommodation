"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Pager } from "@/components/list-view";
import { ConfirmDialog, EmptyState, PageHeader, StatusBadge } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, useApi } from "@/lib/api";
import { fmtDateTime, naira } from "@/lib/format";

const TABS = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Awaiting confirmation" },
  { value: "success", label: "Paid" },
  { value: "pending", label: "Awaiting payment" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "Failed" },
];

export default function PaymentsPage() {
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const qs = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  if (tab !== "all") qs.set("status", tab);
  const { data, meta, loading, reload } = useApi<any[]>(`admin/payments?${qs}`);

  const [action, setAction] = useState<{ kind: "confirm" | "reject"; p: any } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!action) return;
    setBusy(true);
    try {
      if (action.kind === "confirm") await api(`admin/payments/${action.p._id}/confirm`, { method: "POST" });
      else await api(`admin/payments/${action.p._id}/reject`, { method: "POST", body: { reason } });
      toast.success(action.kind === "confirm" ? "Payment confirmed - booking activated" : "Payment rejected");
      setAction(null);
      setReason("");
      reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Payments" description="Confirm bank transfers once the money reaches your account. Paystack payments confirm automatically." />
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as string);
          setPage(1);
        }}
      >
        <div className="overflow-x-auto pb-1">
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <div className="mt-4">
        {loading ? (
          <Skeleton className="h-64" />
        ) : !data?.length ? (
          <EmptyState title="No payments here" hint={tab === "all" ? "Payments will appear once visitors start booking." : "Nothing in this tab right now."} />
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p) => {
                  const canReview = ["submitted", "pending"].includes(p.status) && p.method === "bank_transfer";
                  return (
                    <TableRow key={p._id}>
                      <TableCell>
                        <p className="font-medium">{p.booking?.visitor?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.booking?.code} · {p.booking?.accommodation?.name}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-64">
                        <p className="truncate text-xs">{p.reference}</p>
                        {p.transfer?.senderName && (
                          <p className="text-xs text-muted-foreground">
                            Sender: {p.transfer.senderName}
                            {p.transfer.senderBank ? ` (${p.transfer.senderBank})` : ""}
                            {p.transfer.transferReference ? ` · ref ${p.transfer.transferReference}` : ""}
                            {p.transfer.proofUrl && (
                              <>
                                {" · "}
                                <a href={p.transfer.proofUrl} target="_blank" rel="noreferrer" className="underline">
                                  proof
                                </a>
                              </>
                            )}
                          </p>
                        )}
                        {p.rejectionReason && <p className="text-xs text-destructive">Rejected: {p.rejectionReason}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant="outline" className="capitalize">
                            {p.method.replace("_", " ")}
                          </Badge>
                          {p.purpose === "extension" && <Badge variant="outline">+{p.extensionDays}d</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={p.status} />
                          {p.needsRefund && <Badge variant="destructive">Refund required</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{naira(p.amount)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(p.paidAt ?? p.createdAt)}</TableCell>
                      <TableCell>
                        {canReview ? (
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" onClick={() => setAction({ kind: "confirm", p })}>
                              <Check /> Confirm
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setAction({ kind: "reject", p })}>
                              <X /> Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="block text-right text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
      </div>

      <ConfirmDialog
        open={!!action}
        onOpenChange={(o) => !o && setAction(null)}
        title={action?.kind === "confirm" ? "Confirm this payment?" : "Reject this payment?"}
        description={
          action?.kind === "confirm"
            ? `Only confirm after you've seen ${naira(action.p.amount)} in your account. The guest gets their accommodation ID and profile link by email.`
            : "The booking is cancelled and the guest is told why."
        }
        confirmLabel={action?.kind === "confirm" ? "Confirm" : "Reject"}
        destructive={action?.kind === "reject"}
        loading={busy}
        onConfirm={() => (action?.kind === "reject" && reason.trim().length < 2 ? toast.error("Please give a reason") : run())}
      >
        {action?.kind === "reject" && <Input placeholder="Reason (e.g. amount not received)" value={reason} onChange={(e) => setReason(e.target.value)} />}
      </ConfirmDialog>
    </>
  );
}
