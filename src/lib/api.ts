"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

export interface ApiResult<T> {
  data: T;
  meta?: { page: number; limit: number; total: number; unread?: number };
}

/** Calls the backend through the Next.js proxy (/api/backend/*). Returns `{data, meta}`. */
export async function apiFull<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  const res = await fetch(`/api/backend/${path.replace(/^\//, "")}`, {
    method: init.method ?? "GET",
    headers: init.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    if (res.status === 401 && path.startsWith("admin/") && typeof window !== "undefined") window.location.href = "/admin/login";
    throw new ApiError(json?.message ?? "Something went wrong", res.status, json?.code);
  }
  return { data: json.data as T, meta: json.meta };
}

export const api = async <T = any>(path: string, init?: { method?: string; body?: unknown }) => (await apiFull<T>(path, init)).data;

/** Tiny data-fetching hook: refetches when `path` changes, exposes `reload`. Pass null to skip. */
export function useApi<T = any>(path: string | null) {
  const [state, setState] = useState<{ data?: T; meta?: ApiResult<T>["meta"]; error?: ApiError; loading: boolean }>({ loading: !!path });
  const seq = useRef(0);

  const load = useCallback(
    async (silent = false) => {
      if (!path) return;
      const id = ++seq.current;
      if (!silent) setState((s) => ({ ...s, loading: true, error: undefined }));
      try {
        const r = await apiFull<T>(path);
        if (id === seq.current) setState({ data: r.data, meta: r.meta, loading: false });
      } catch (e) {
        if (id === seq.current) setState((s) => ({ ...s, error: e as ApiError, loading: false }));
      }
    },
    [path],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return { ...state, reload: () => load(true), setData: (d: T) => setState((s) => ({ ...s, data: d })) };
}
