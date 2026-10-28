"use client";

import { CalendarDays, Search, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState, Field } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/lib/api";
import { dateInputToIso, fmtDate, naira, todayInput } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const [start, setStart] = useState(todayInput(1));
  const [days, setDays] = useState("2");
  const [search, setSearch] = useState<{ start: string; days: string } | null>(null);

  const qs = new URLSearchParams({ limit: "50" });
  if (search) {
    qs.set("startDate", dateInputToIso(search.start));
    qs.set("durationDays", search.days);
  }
  const accs = useApi<any[]>(`public/accommodations?${qs}`);
  const events = useApi<any[]>("public/events");

  return (
    <div className="grid gap-10">
      <section className="rounded-2xl border-b-4 border-b-brand-orange bg-gradient-to-br from-primary to-[oklch(0.28_0.08_152)] p-6 text-white sm:p-10">
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Find a place to stay with us</h1>
        <p className="mt-2 max-w-xl text-white/80">Pick your dates to see what's available and what it costs. Pay online with Paystack or by direct bank transfer.</p>
        <form
          className="mt-6 grid gap-3 rounded-xl bg-white p-4 text-foreground sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch({ start, days });
          }}
        >
          <Field label="Check-in date">
            <Input type="date" required min={todayInput()} value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Number of days">
            <Input type="number" required min={1} max={90} value={days} onChange={(e) => setDays(e.target.value)} />
          </Field>
          <button type="submit" className={cn(buttonVariants(), "h-8 w-full sm:w-auto")}>
            <Search /> Check availability
          </button>
        </form>
      </section>

      {!!events.data?.length && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Upcoming events</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {events.data.map((e) => (
              <Card key={e.id}>
                <CardContent className="grid gap-1">
                  <p className="font-medium">{e.name}</p>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarDays className="size-3.5" /> {fmtDate(e.startDate)} – {fmtDate(e.endDate)}
                  </p>
                  <p className="text-xs text-muted-foreground">{e.availableAccommodations} accommodation(s) open during this event</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">{search ? `Availability for ${search.days} day(s) from ${fmtDate(dateInputToIso(search.start))}` : "Our accommodations"}</h2>
        {accs.loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56" />
            ))}
          </div>
        ) : !accs.data?.length ? (
          <EmptyState title="No accommodations to show" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accs.data.map((a) => {
              const unavailable = (a.quote && !a.quote.available) || (!a.quote && a.isFull);
              const full = a.quote ? a.quote.isFull : a.isFull;
              const left = a.quote ? a.quote.unitsLeft : a.unitsLeft;
              const href = `/accommodations/${a._id}${search ? `?start=${search.start}&days=${search.days}` : ""}`;
              return (
                <Card key={a._id} className={cn("overflow-hidden", unavailable && "opacity-60")}>
                  {a.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.images[0]} alt={a.name} className="h-40 w-full object-cover" />
                  )}
                  <CardContent className="grid gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{a.name}</h3>
                        <p className="flex items-center gap-1 text-sm capitalize text-muted-foreground">
                          {a.type} · <Users className="size-3.5" /> up to {a.capacity}
                        </p>
                      </div>
                      {full ? (
                        <Badge variant="destructive">Full</Badge>
                      ) : a.quote ? (
                        <Badge variant={unavailable ? "secondary" : "default"}>{unavailable ? "Unavailable" : "Available"}</Badge>
                      ) : null}
                    </div>
                    {a.description && <p className="line-clamp-2 text-sm text-muted-foreground">{a.description}</p>}
                    {!!a.amenities?.length && <p className="text-xs text-muted-foreground">{a.amenities.slice(0, 4).join(" · ")}</p>}
                    <div className="mt-1 flex items-center justify-between">
                      <p>
                        {a.quote && !unavailable ? (
                          <>
                            <span className="text-lg font-semibold">{naira(a.quote.total)}</span>
                            <span className="text-xs text-muted-foreground"> total</span>
                          </>
                        ) : (
                          <>
                            <span className="text-lg font-semibold">{naira(a.basePricePerDay)}</span>
                            <span className="text-xs text-muted-foreground"> /day</span>
                          </>
                        )}
                      </p>
                      <Link href={href} className={cn(buttonVariants({ size: "sm", variant: unavailable ? "outline" : "default" }))}>
                        {full ? "Full" : unavailable ? "View" : "Book"}
                      </Link>
                    </div>
                    {unavailable && <p className="text-xs text-muted-foreground">{a.quote?.reasons?.[0] ?? "Currently full"}</p>}
                    {!full && a.totalUnits > 1 && left <= 3 && <p className="text-xs font-medium text-amber-600">Only {left} left</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
