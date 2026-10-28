"use client";

import { ChevronLeft, ChevronRight, LayoutGrid, Table2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ViewMode = "cards" | "table";

/** Remembers the chosen layout per list in localStorage (cards on first render to match the server). */
export function useViewMode(key: string, initial: ViewMode = "cards") {
  const [mode, setMode] = useState<ViewMode>(initial);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "cards" || saved === "table") setMode(saved);
    } catch {}
  }, [key]);
  const update = (m: ViewMode) => {
    setMode(m);
    try {
      localStorage.setItem(key, m);
    } catch {}
  };
  return [mode, update] as const;
}

export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (m: ViewMode) => void }) {
  const items: { mode: ViewMode; label: string; icon: typeof Table2 }[] = [
    { mode: "cards", label: "Cards", icon: LayoutGrid },
    { mode: "table", label: "Table", icon: Table2 },
  ];
  return (
    <div className="inline-flex rounded-lg border bg-muted/40 p-0.5" role="group" aria-label="Change layout">
      {items.map((i) => (
        <button
          key={i.mode}
          type="button"
          aria-pressed={value === i.mode}
          onClick={() => onChange(i.mode)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm transition-colors",
            value === i.mode ? "bg-background font-medium text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <i.icon className="size-4" /> {i.label}
        </button>
      ))}
    </div>
  );
}

/** Client-side pagination for lists that are fully loaded. */
export function usePagination<T>(items: T[] | undefined, initialSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);
  const total = items?.length ?? 0;
  const lastPage = Math.max(Math.ceil(total / pageSize), 1);
  const current = Math.min(page, lastPage); // stay valid if the list shrinks (filter, delete)
  const slice = useMemo(() => (items ?? []).slice((current - 1) * pageSize, current * pageSize), [items, current, pageSize]);
  return {
    items: slice,
    page: current,
    pageSize,
    total,
    setPage,
    setPageSize: (n: number) => {
      setPageSize(n);
      setPage(1);
    },
  };
}

const SIZES = [10, 25, 50];

export function Pager({ page, pageSize, total, onPage, onPageSize }: { page: number; pageSize: number; total: number; onPage: (p: number) => void; onPageSize?: (n: number) => void }) {
  if (total === 0) return null;
  const lastPage = Math.max(Math.ceil(total / pageSize), 1);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  if (total <= SIZES[0] && lastPage === 1) return <p className="mt-3 text-sm text-muted-foreground">{total} item{total === 1 ? "" : "s"}</p>;
  return (
    <div className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground">
        Showing {from}–{to} of {total}
      </span>
      <div className="flex flex-wrap items-center gap-3">
        {onPageSize && (
          <label className="flex items-center gap-2 text-muted-foreground">
            Rows
            <select
              value={pageSize}
              onChange={(e) => onPageSize(Number(e.target.value))}
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
            >
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft /> Prev
          </Button>
          <span className="px-2 tabular-nums">
            {page} / {lastPage}
          </span>
          <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => onPage(page + 1)}>
            Next <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
