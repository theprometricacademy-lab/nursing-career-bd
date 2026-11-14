'use client';
import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { avatarUrl } from '@/lib/winnerCard';
import { useApp } from './AppProvider';

/** Square-crops and shrinks a picked photo to 400x400 JPEG in the browser before upload. */
export async function shrinkPhoto(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(img.width, img.height), c = document.createElement('canvas'); c.width = 400; c.height = 400;
    c.getContext('2d')!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 400, 400);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', 0.85));
  } finally { URL.revokeObjectURL(url); }
}

export function ProfilePhoto() {
  const { user, profile, refresh, lang } = useApp();
  const bn = lang === 'bn';
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [path, setPath] = useState<string | null | undefined>(undefined);
  if (!user || !profile) return null;
  const current = path === undefined ? profile.avatar_path ?? null : path;
  const src = avatarUrl(current);
  const initial = Array.from((profile.full_name ?? '').trim())[0] ?? '?';

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { setMsg(bn ? 'শুধু ছবি দেওয়া যাবে।' : 'Images only.'); return; }
    setBusy(true); setMsg('');
    try {
      const blob = await shrinkPhoto(f);
      const sb = supabaseBrowser();
      const next = `${user!.id}/${Date.now()}.jpg`;
      const up = await sb.storage.from('avatars').upload(next, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
      if (up.error) throw up.error;
      const { error } = await sb.from('profiles').update({ avatar_path: next }).eq('id', user!.id);
      if (error) throw error;
      if (current) await sb.storage.from('avatars').remove([current]);
      setPath(next); refresh(); setMsg(bn ? 'ছবি সেভ হয়েছে।' : 'Photo saved.');
    } catch { setMsg(bn ? 'ছবি আপলোড হয়নি, আবার চেষ্টা করুন।' : 'Upload failed, please try again.'); }
    setBusy(false);
  }

  async function remove() {
    if (!current) return;
    setBusy(true);
    const sb = supabaseBrowser();
    const { error } = await sb.from('profiles').update({ avatar_path: null }).eq('id', user!.id);
    if (!error) { await sb.storage.from('avatars').remove([current]); setPath(null); refresh(); }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-4">
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt="" className="h-20 w-20 rounded-full object-cover ring-4 ring-brand-100" />
        : <span className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-blush-500 text-3xl font-extrabold text-white">{initial}</span>}
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary !py-1.5" disabled={busy} onClick={() => input.current?.click()}>
            <Camera className="h-4 w-4" />{busy ? (bn ? 'অপেক্ষা করুন…' : 'Please wait…') : current ? (bn ? 'ছবি বদলান' : 'Change photo') : (bn ? 'ছবি দিন' : 'Add photo')}
          </button>
          {current && <button type="button" className="btn-ghost !py-1.5" disabled={busy} onClick={remove}><Trash2 className="h-4 w-4" />{bn ? 'সরান' : 'Remove'}</button>}
        </div>
        <p className="text-xs text-ink-soft">{bn ? 'ঐচ্ছিক · সাপ্তাহিক টেস্টের শেয়ার কার্ডে দেখাবে' : 'Optional · shown on your weekly-test share card'}</p>
        {msg && <p className="text-xs text-mint-700">{msg}</p>}
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={pick} />
    </div>
  );
}
