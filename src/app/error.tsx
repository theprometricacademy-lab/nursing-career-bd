'use client';
import { useEffect } from 'react';
import Link from 'next/link';

// After a new deploy, a page left open may try to load files that no longer exist.
// Reload once automatically in that case; otherwise show a friendly message instead of a blank error.
function isStaleBuild(e: Error) {
  return /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module|Failed to fetch/i.test(`${e.name} ${e.message}`);
}

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    let tried = false;
    try { tried = sessionStorage.getItem('ncbd_reloaded') === '1'; } catch { /* ignore */ }
    if (!tried) {
      try { sessionStorage.setItem('ncbd_reloaded', '1'); } catch { /* ignore */ }
      if (isStaleBuild(error)) window.location.reload();
    }
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-5xl">😕</p>
      <h1 className="mt-3 text-lg font-bold text-ink">কিছু একটা সমস্যা হয়েছে</h1>
      <p className="mt-1 text-sm text-ink-soft">পেজটি আবার লোড করুন। সমস্যা থাকলে 01710921994 নম্বরে জানান।</p>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={() => { try { sessionStorage.removeItem('ncbd_reloaded'); } catch { /* ignore */ } window.location.reload(); }} className="btn-primary">আবার লোড করুন</button>
        <Link href="/" onClick={() => reset()} className="btn-ghost">হোমে যান</Link>
      </div>
    </div>
  );
}
