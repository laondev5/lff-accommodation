"use client";

import { ArrowLeft, Banknote, CreditCard, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, use, useState } from "react";
import { ErrorNote, Field, Spinner } from "@/components/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, useApi } from "@/lib/api";
import { dateInputToIso, fmtDate, naira, todayInput } from "@/lib/format";
import { cn } from "@/lib/utils";

function Detail({ id }: { id: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const acc = useApi<any>(`public/accommodations/${id}`);
  const [start, setStart] = useState(sp.get("start") ?? todayInput(1));
  const [days, setDays] = useState(sp.get("days") ?? "2");
  const [method, setMethod] = useState<"paystack" | "bank_transfer">("paystack");
  const [v, setV] = useState({ name: "", email: "", phone: "", whatsapp: "" });
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const validDays = Number(days) >= 1 && Number(days) <= 90;
  const quote = useApi<any>(validDays && start ? `public/accommodations/${id}/quote?startDate=${encodeURIComponent(dateInputToIso(start))}&durationDays=${days}` : null);

  async function book(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(undefined);
    try {
      const res = await api("public/bookings", {
        method: "POST",
        body: { accommodationId: id, startDate: dateInputToIso(start), durationDays: Number(days), paymentMethod: method, visitor: v },
      });
      if (res.authorizationUrl) window.location.href = res.authorizationUrl;
      else router.push(`/booking/${res.profileToken}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (acc.loading) return <Skeleton className="h-96" />;
  if (acc.error || !acc.data)
    return (
      <Alert>
        <AlertDescription>This accommodation isn't available. <Link href="/" className="underline">Back to all accommodations</Link></AlertDescription>
      </Alert>
    );
  const a = acc.data;
  const q = quote.data;
  const unavailable = q && !q.available;
  const full = q ? q.isFull : a.isFull;

  return (
    <>
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All accommodations
      </Link>
      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
        <div className="grid content-start gap-4">
          {a.images?.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {a.images.slice(0, 4).map((src: string) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt={a.name} className="h-48 w-full rounded-xl object-cover" />
              ))}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{a.name}</h1>
            <p className="mt-1 flex items-center gap-1 capitalize text-muted-foreground">
              {a.type} · <Users className="size-4" /> up to {a.capacity} {a.capacity > 1 ? "people" : "person"}
            </p>
          </div>
          {a.description && <p className="whitespace-pre-line">{a.description}</p>}
          {a.amenities?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {a.amenities.map((x: string) => (
                <span key={x} className="rounded-full border px-3 py-1 text-sm">
                  {x}
                </span>
              ))}
            </div>
          )}
          {a.isFull && (
            <Alert variant="destructive">
              <AlertDescription>This accommodation is currently full. You can still check later dates below.</AlertDescription>
            </Alert>
          )}
          {a.totalUnits > 1 && !a.isFull && (
            <p className="text-sm text-muted-foreground">
              {a.unitsLeft} of {a.totalUnits} available right now
            </p>
          )}
          <p className="text-lg font-semibold">
            {naira(a.basePricePerDay)} <span className="text-sm font-normal text-muted-foreground">/ day (event dates may be priced differently)</span>
          </p>
          {a.blockedRanges?.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium">Not available on these dates</p>
              <ul className="grid gap-1 text-sm text-muted-foreground">
                {a.blockedRanges.slice(0, 8).map((r: any, i: number) => (
                  <li key={i}>
                    {fmtDate(r.start)} – {fmtDate(r.end)} <span className="text-xs">({r.reason === "event" ? "event period" : "fully booked"})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>Book this accommodation</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={book} className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Check-in date">
                  <Input type="date" required min={todayInput()} value={start} onChange={(e) => setStart(e.target.value)} />
                </Field>
                <Field label="Days staying">
                  <Input type="number" required min={1} max={90} value={days} onChange={(e) => setDays(e.target.value)} />
                </Field>
              </div>

              <div className={cn("rounded-lg border p-3 text-sm", unavailable && "border-destructive/40 bg-destructive/5")}>
                {quote.loading && !q ? (
                  <Skeleton className="h-10" />
                ) : q ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {fmtDate(q.startDate)} → {fmtDate(q.endDate)}
                      </span>
                      <span className="text-lg font-semibold">{naira(q.total)}</span>
                    </div>
                    {unavailable ? (
                      <p className="mt-1 text-destructive">
                        {full ? "Full for these dates. " : ""}
                        {q.reasons.join(". ")}. Please try other dates.
                      </p>
                    ) : (
                      (q.totalUnits > 1 && q.unitsLeft <= 3 ? (
                        <p className="mt-1 text-xs font-medium text-amber-600">Only {q.unitsLeft} left for these dates</p>
                      ) : null) ||
                      (q.days.some((d: any) => d.source === "event") && (
                        <p className="mt-1 text-xs text-muted-foreground">Includes event pricing ({q.days.find((d: any) => d.event)?.event}).</p>
                      ))
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Enter your dates to see the price.</p>
                )}
              </div>

              <Field label="Full name">
                <Input required autoComplete="name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
              </Field>
              <Field label="Email" hint="Your confirmation and personal booking link are sent here.">
                <Input required type="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone number">
                  <Input required type="tel" autoComplete="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
                </Field>
                <Field label="WhatsApp number">
                  <Input required type="tel" value={v.whatsapp} onChange={(e) => setV({ ...v, whatsapp: e.target.value })} />
                </Field>
              </div>

              <div className="grid gap-2">
                <p className="text-sm font-medium">How would you like to pay?</p>
                {(
                  [
                    { value: "paystack", icon: CreditCard, title: "Pay online (Paystack)", hint: "Card, bank transfer or USSD. Confirmed instantly." },
                    { value: "bank_transfer", icon: Banknote, title: "Direct bank transfer", hint: "Transfer to our account; we confirm after we receive it." },
                  ] as const
                ).map((o) => (
                  <label key={o.value} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3", method === o.value && "border-primary bg-primary/5")}>
                    <input type="radio" name="method" className="mt-1" checked={method === o.value} onChange={() => setMethod(o.value)} />
                    <o.icon className="mt-0.5 size-4 shrink-0" />
                    <span className="text-sm">
                      <span className="block font-medium">{o.title}</span>
                      <span className="text-muted-foreground">{o.hint}</span>
                    </span>
                  </label>
                ))}
              </div>

              <ErrorNote message={error} />
              <Button type="submit" size="lg" disabled={submitting || !!unavailable || !q}>
                {submitting && <Spinner />} {unavailable && full ? "Full for these dates" : method === "paystack" ? `Pay ${q ? naira(q.total) : ""} now` : "Continue to bank details"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">We hold your slot while you pay. Unpaid holds are released automatically.</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function WithId({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Detail id={id} />;
}

export default function AccommodationPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <WithId params={params} />
    </Suspense>
  );
}
