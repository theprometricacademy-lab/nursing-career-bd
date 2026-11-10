'use client';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    let tried = false;
    try { tried = sessionStorage.getItem('ncbd_reloaded_g') === '1'; sessionStorage.setItem('ncbd_reloaded_g', '1'); } catch { /* ignore */ }
    if (!tried) window.location.reload();
  }, [error]);
  return (
    <html lang="bn">
      <body style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '80px 16px', background: '#f7fbff', color: '#0f2a4a' }}>
        <h1 style={{ fontSize: 20 }}>কিছু একটা সমস্যা হয়েছে</h1>
        <p style={{ fontSize: 14, color: '#4a6380' }}>পেজটি আবার লোড করুন।</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '10px 18px', borderRadius: 12, border: 0, background: '#1f7ad6', color: '#fff', fontWeight: 700 }}>আবার লোড করুন</button>
      </body>
    </html>
  );
}
