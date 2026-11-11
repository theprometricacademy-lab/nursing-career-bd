'use client';
import { useEffect, useState } from 'react';

// Tiny in-browser cache so a tab you have already opened shows its data instantly
// (then quietly refreshes in the background) — like a phone app, no spinner on return.
const mem = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();
const SS = 'qc:';

function read<T>(key: string): T | undefined {
  if (typeof window === 'undefined') return undefined;
  if (mem.has(key)) return mem.get(key) as T;
  try {
    const s = sessionStorage.getItem(SS + key);
    if (s) { const v = JSON.parse(s) as T; mem.set(key, v); return v; }
  } catch { /* storage blocked */ }
  return undefined;
}

/** Fetch once at a time per key; the result is remembered for this visit. */
export function load<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const running = inflight.get(key);
  if (running) return running as Promise<T>;
  const p = fn().then((v) => {
    mem.set(key, v);
    try { sessionStorage.setItem(SS + key, JSON.stringify(v)); } catch { /* full or blocked */ }
    return v;
  }).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Cached value right away (if any), then the fresh value. `key = null` skips loading. */
export function useCached<T>(key: string | null, fn: () => Promise<T>): T | undefined {
  // only the in-memory copy on first render (no hydration mismatch); session copy right after
  const [v, setV] = useState<T | undefined>(() => (key && typeof window !== 'undefined' ? (mem.get(key) as T | undefined) : undefined));
  useEffect(() => {
    if (!key) { setV(undefined); return; }
    const c = read<T>(key);
    setV(c);
    let alive = true;
    load(key, fn).then((x) => { if (alive) setV(x); }).catch(() => { /* keep cached */ });
    return () => { alive = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}

/** Throw on Supabase errors so failures are never cached. */
export async function sbData<T>(q: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as T;
}
