'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, Crown, HeartPulse } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { avatarUrl } from '@/lib/winnerCard';
import { useApp } from './AppProvider';
import { shrinkPhoto } from './ProfilePhoto';

/**
 * Membership card shown to every signed-in member: gold for lifetime premium, brand blue for free members.
 * The round photo on the left is the member's profile photo; tapping it picks a new one.
 */
export function MemberCard({ upsell = true }: { upsell?: boolean }) {
  const { user, profile, premium, lang, refresh } = useApp();
  const bn = lang === 'bn';
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [since, setSince] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !premium) return;
    supabaseBrowser().from('subscriptions').select('starts_at').eq('user_id', user.id).eq('plan', 'lifetime').eq('status', 'active')
      .order('starts_at', { ascending: true }).limit(1).then(({ data }) => setSince(data?.[0]?.starts_at ?? null));
  }, [user, premium]);

  if (!user) return null;
  const current = profile?.avatar_path ?? null;
  const src = avatarUrl(current);
  const name = profile?.full_name || user.email || '';
  const initial = Array.from(name.trim())[0] ?? '?';
  const joined = (premium && since) || user.created_at;
  const date = joined ? new Date(joined).toLocaleDateString(bn ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

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
      refresh(); setMsg(bn ? 'ছবি সেভ হয়েছে।' : 'Photo saved.');
    } catch { setMsg(bn ? 'ছবি আপলোড হয়নি, আবার চেষ্টা করুন।' : 'Upload failed, please try again.'); }
    setBusy(false);
  }

  const shell = premium
    ? 'gold-card p-5 sm:p-6'
    : 'relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-500 to-mint-500 p-5 text-white shadow-xl ring-1 ring-white/40 sm:p-6';

  return (
    <div className="space-y-2">
      <div className={shell}>
        {premium && <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-gold-400/25 blur-3xl" />}
        <div className="relative flex items-start justify-between">
          <div>
            <div className={`text-xs uppercase tracking-[.2em] ${premium ? 'text-gold-200' : 'text-white/85'}`}>Nursing Career BD</div>
            <div className={`mt-1 text-2xl font-extrabold ${premium ? 'gold-text' : ''}`}>
              {premium ? (bn ? 'লাইফটাইম প্রিমিয়াম' : 'Lifetime Premium') : (bn ? 'সদস্য কার্ড' : 'Member Card')}
            </div>
          </div>
          {premium ? <Crown className="h-9 w-9 text-gold-300" /> : <HeartPulse className="h-9 w-9 text-white" />}
        </div>

        <div className="relative mt-5 flex items-center gap-3.5">
          <button type="button" onClick={() => input.current?.click()} disabled={busy}
            aria-label={bn ? (current ? 'ছবি বদলান' : 'ছবি দিন') : (current ? 'Change photo' : 'Add photo')}
            className={`relative h-[76px] w-[76px] flex-none rounded-full p-[3px] ${premium ? 'bg-gradient-to-br from-gold-300 to-gold-500' : 'bg-gradient-to-br from-white to-brand-100'} ${busy ? 'opacity-60' : ''}`}>
            {src
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={src} alt="" className="h-full w-full rounded-full object-cover" />
              : <span className="grid h-full w-full place-items-center rounded-full bg-brand-50 text-3xl font-extrabold text-brand-700">{initial}</span>}
            <span className={`absolute -bottom-0.5 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 bg-white ${premium ? 'border-gold-500 text-gold-600' : 'border-brand-600 text-brand-700'}`}>
              <Camera className="h-3.5 w-3.5" />
            </span>
          </button>
          <div className="min-w-0">
            <div className="text-xs text-white/65">{bn ? 'সদস্য' : 'Member'}</div>
            <div className="break-words text-lg font-bold leading-tight">{name}</div>
            {(busy || msg || !current) && (
              <div className="mt-1 text-xs text-white/90">
                {busy ? (bn ? 'অপেক্ষা করুন…' : 'Please wait…') : msg || (bn ? 'ক্যামেরায় চাপ দিয়ে ছবি দিন' : 'Tap the camera to add your photo')}
              </div>
            )}
          </div>
        </div>

        <div className="relative mt-5 flex items-end justify-between gap-3">
          <div className={`font-mono text-xs tracking-widest ${premium ? 'text-gold-200/80' : 'text-white/85'}`}>ID · {user.id.slice(0, 8).toUpperCase()}</div>
          <div className="text-right">
            <div className="text-xs text-white/65">{bn ? 'সদস্য হয়েছেন' : 'Member since'}</div>
            <div className="font-semibold">{date}</div>
          </div>
        </div>
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={pick} />
      </div>
      {!premium && upsell && (
        <Link href="/premium" className="flex items-center justify-between rounded-2xl border border-gold-200 bg-white px-4 py-2.5 text-sm font-bold text-gold-800">
          <span className="inline-flex items-center gap-2"><Crown className="h-4 w-4 text-gold-500" />{bn ? 'প্রিমিয়াম নিলে সোনালি কার্ড পাবেন' : 'Go Premium to get the gold card'}</span>
          <span>{bn ? 'দেখুন →' : 'View →'}</span>
        </Link>
      )}
    </div>
  );
}
