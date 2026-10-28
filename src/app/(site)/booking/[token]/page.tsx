"use client";

import { CalendarPlus, Copy, Clock, MessageCircle, Phone, XCircle } from "lucide-react";
import Link from "next/link";
import { Suspense, use, useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog, ErrorNote, Field, SelectField, Spinner, StatusBadge } from "@/components/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, useApi } from "@/lib/api";
import { fmtDateTime, naira, timeLeft } from "@/lib/format";
import { createPusher } from "@/lib/pusher";

const copy = (t: string) => navigator.clipboard.writeText(t).then(() => toast.success("Copied"));

function BankTransferCard({ payment, banks, onDone }: { payment: any; banks: any[]; onDone: () => void }) {
  const [f, setF] = useState({ senderName: "", senderBank: "", transferReference: "", note: "" });
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api(`public/payments/${payment.reference}/transfer-proof`, {
        method: "POST",
        body: { senderName: f.senderName, senderBank: f.senderBank || undefined, transferReference: f.transferReference || undefined, note: f.note || undefined },
      });
      toast.success("Thanks! We'll confirm your transfer shortly.");
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-blue-300 dark:border-blue-900">
      <CardHeader>
        <CardTitle>
          Pay {naira(payment.amount)} by bank transfer{payment.purpose === "extension" ? ` (+${payment.extensionDays} day extension)` : ""}
        </CardTitle>
        <CardDescription>Transfer the exact amount to one of these accounts, then tell us below once you've sent it.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          {banks.length === 0 && <p className="text-sm text-muted-foreground">Bank details are not available yet. Please contact the church office.</p>}
          {banks.map((b, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-muted p-3">
              <div className="text-sm">
                <p className="font-medium">{b.bankName}</p>
                <p className="text-lg font-semibold tracking-wider">{b.accountNumber}</p>
                <p className="text-muted-foreground">{b.accountName}</p>
              </div>
              <Button type="button" size="icon-sm" variant="outline" aria-label="Copy account number" onClick={() => copy(b.accountNumber)}>
                <Copy />
              </Button>
            </div>
          ))}
        </div>
        <p className="text-sm">
          Use <b>{payment.reference}</b> as your transfer narration/remark.
        </p>
        {payment.status === "submitted" ? (
          <Alert>
            <AlertTitle>Transfer details received</AlertTitle>
            <AlertDescription>We're confirming it. You'll get an email as soon as it's approved.</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={submit} className="grid gap-3 border-t pt-4">
            <p className="text-sm font-medium">I've made the transfer</p>
            <Field label="Name on the sending account">
              <Input required value={f.senderName} onChange={(e) => setF({ ...f, senderName: e.target.value })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Sending bank (optional)">
                <Input value={f.senderBank} onChange={(e) => setF({ ...f, senderBank: e.target.value })} />
              </Field>
              <Field label="Transaction reference (optional)">
                <Input value={f.transferReference} onChange={(e) => setF({ ...f, transferReference: e.target.value })} />
              </Field>
            </div>
            <ErrorNote message={error} />
            <Button type="submit" disabled={busy}>
              {busy && <Spinner />} Notify the church I've paid
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function ExtendCard({ b, token, onDone }: { b: any; token: string; onDone: () => void }) {
  const [days, setDays] = useState("1");
  const [method, setMethod] = useState("paystack");
  const [busy, setBusy] = useState(false);
  const valid = Number(days) >= 1 && Number(days) <= 60;
  const quote = useApi<any>(valid ? `public/accommodations/${b.accommodation._id}/quote?startDate=${encodeURIComponent(b.endDate)}&durationDays=${days}` : null);

  async function go() {
    setBusy(true);
    try {
      const res = await api(`public/bookings/profile/${token}/extend`, { method: "POST", body: { extraDays: Number(days), paymentMethod: method } });
      if (res.authorizationUrl) window.location.href = res.authorizationUrl;
      else {
        toast.success("Extension created. Pay using the bank details below.");
        onDone();
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarPlus className="size-4" /> Need more time?
        </CardTitle>
        <CardDescription>Extend your stay before it ends.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Extra days">
            <Input type="number" min={1} max={60} value={days} onChange={(e) => setDays(e.target.value)} />
          </Field>
          <Field label="Pay with">
            <SelectField
              value={method}
              onChange={setMethod}
              options={[
                { value: "paystack", label: "Paystack (online)" },
                { value: "bank_transfer", label: "Bank transfer" },
              ]}
            />
          </Field>
        </div>
        <div className="rounded-lg border p-3 text-sm">
          {quote.loading && !quote.data ? (
            <Skeleton className="h-6" />
          ) : quote.data ? (
            quote.data.available ? (
              <p>
                New check-out <b>{fmtDateTime(quote.data.endDate)}</b> · extra cost <b>{naira(quote.data.total)}</b>
              </p>
            ) : (
              <p className="text-destructive">{quote.data.reasons.join(". ")}</p>
            )
          ) : (
            <p className="text-muted-foreground">Enter the number of extra days.</p>
          )}
        </div>
        <Button onClick={go} disabled={busy || !quote.data?.available}>
          {busy && <Spinner />} Extend stay
        </Button>
      </CardContent>
    </Card>
  );
}

function BookingProfile({ token }: { token: string }) {
  const { data: b, error, loading, reload } = useApi<any>(`public/bookings/profile/${token}`);
  const [now, setNow] = useState(() => Date.now());
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Realtime: status changes and "ending soon" reminders.
  const code = b?.code;
  useEffect(() => {
    if (!code) return;
    const pusher = createPusher({ token });
    if (!pusher) return;
    const channel = pusher.subscribe(`private-booking-${code}`);
    channel.bind("booking:updated", () => reload());
    channel.bind("booking:reminder", (d: { message: string }) => {
      toast.warning("Your stay ends soon", { description: d.message });
      reload();
    });
    channel.bind("booking:expired", () => {
      toast.info("Your stay has ended");
      reload();
    });
    return () => {
      channel.unbind_all();
      pusher.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, token]);

  if (loading) return <Skeleton className="mx-auto h-96 max-w-2xl" />;
  if (error || !b) {
    const expired = error?.status === 410;
    return (
      <div className="mx-auto grid max-w-md gap-3 py-16 text-center">
        <XCircle className="mx-auto size-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">{expired ? "This booking link has expired" : "Booking not found"}</h1>
        <p className="text-muted-foreground">{expired ? "Booking links stop working 12 hours after your stay ends." : "Check that you used the full link from your email."}</p>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to home
        </Link>
      </div>
    );
  }

  const isActive = b.status === "active" && !b.checkedOutAt;
  const ended = new Date(b.endDate).getTime() <= now;
  const hoursLeft = (new Date(b.endDate).getTime() - now) / 3600000;
  const bankPayments = (b.payments ?? []).filter((p: any) => p.method === "bank_transfer" && ["pending", "submitted"].includes(p.status));
  const pendingOnline = (b.payments ?? []).find((p: any) => p.method === "paystack" && p.status === "pending");

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <Card>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Your accommodation ID</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold tracking-wider">{b.code}</p>
                <Button size="icon-sm" variant="ghost" aria-label="Copy ID" onClick={() => copy(b.code)}>
                  <Copy />
                </Button>
              </div>
            </div>
            <StatusBadge status={b.status} />
          </div>

          <div className="grid gap-1 rounded-lg bg-muted p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Accommodation</p>
              <p className="font-medium">{b.accommodation?.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-medium">{naira(b.totalAmount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Check-in</p>
              <p className="font-medium">{fmtDateTime(b.startDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Check-out</p>
              <p className="font-medium">{fmtDateTime(b.endDate)}</p>
            </div>
          </div>

          {isActive && (
            <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${ended ? "border-red-300 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200" : hoursLeft <= 5 ? "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200" : ""}`}>
              <Clock className="size-4" />
              {ended ? "Your stay has ended. Please check out, or extend below." : <>Time remaining: <b>{timeLeft(b.endDate, now)}</b></>}
            </div>
          )}
          {b.status === "completed" && <p className="text-sm text-muted-foreground">You checked out on {fmtDateTime(b.checkedOutAt)}. Thank you for staying with us!</p>}
          {b.status === "cancelled" && <p className="text-sm text-destructive">This booking was cancelled. Contact the church office if you think this is a mistake.</p>}
          {b.status === "expired" && <p className="text-sm text-muted-foreground">The payment window for this booking closed. If you've already paid, please contact the church office with your ID.</p>}
          {b.status === "pending_payment" && b.holdExpiresAt && !bankPayments.length && (
            <p className="text-sm text-amber-700 dark:text-amber-300">We're holding this slot for you until {fmtDateTime(b.holdExpiresAt)}.</p>
          )}
          <p className="text-xs text-muted-foreground">This personal link works until {fmtDateTime(b.profileExpiresAt)}. Keep it private.</p>
        </CardContent>
      </Card>

      {pendingOnline && b.status === "pending_payment" && (
        <Alert>
          <AlertTitle>Online payment not completed</AlertTitle>
          <AlertDescription>If you were debited, this page updates automatically once Paystack confirms. Otherwise, cancel and book again.</AlertDescription>
        </Alert>
      )}

      {bankPayments.map((p: any) => (
        <BankTransferCard key={p.reference} payment={p} banks={b.bankAccounts ?? []} onDone={reload} />
      ))}

      {isActive && !bankPayments.length && <ExtendCard b={b} token={token} onDone={reload} />}

      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm">
          <p className="font-medium">{b.visitor.name}</p>
          <p className="text-muted-foreground">{b.visitor.email}</p>
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="size-3.5" /> {b.visitor.phone} <MessageCircle className="ml-2 size-3.5" /> {b.visitor.whatsapp}
          </p>
        </CardContent>
      </Card>

      {!!b.payments?.length && (
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {b.payments.map((p: any) => (
              <div key={p.reference} className="flex items-center justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium">
                    {naira(p.amount)} <span className="font-normal text-muted-foreground capitalize">· {p.method.replace("_", " ")}{p.purpose === "extension" ? " · extension" : ""}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{p.reference}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {b.status === "pending_payment" && (
        <Button variant="ghost" className="text-destructive" onClick={() => setCancelOpen(true)}>
          Cancel this booking
        </Button>
      )}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this booking?"
        description="The slot is released for others."
        confirmLabel="Cancel booking"
        destructive
        loading={cancelling}
        onConfirm={async () => {
          setCancelling(true);
          try {
            await api(`public/bookings/profile/${token}/cancel`, { method: "POST" });
            setCancelOpen(false);
            reload();
          } catch (e: any) {
            toast.error(e.message);
          } finally {
            setCancelling(false);
          }
        }}
      />
    </div>
  );
}

function WithToken({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return <BookingProfile token={token} />;
}

export default function BookingProfilePage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-2xl" />}>
      <WithToken params={params} />
    </Suspense>
  );
}
