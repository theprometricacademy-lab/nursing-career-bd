'use client';
import { useEffect, useState } from 'react';
import { BellRing, Mail } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { disablePush, enablePush, pushState, type PushState } from '@/lib/push';
import { useApp } from './AppProvider';

/** Member's own choices: phone notifications (this device) and email. */
export function NotifySettings({ compact = false }: { compact?: boolean }) {
  const { user, lang } = useApp();
  const bn = lang === 'bn';
  const [push, setPush] = useState<PushState | null>(null);
  const [email, setEmail] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    pushState().then(setPush).catch(() => setPush('unsupported'));
    if (user) supabaseBrowser().from('profiles').select('notify_email').eq('id', user.id).single().then(({ data }) => setEmail(data?.notify_email ?? true));
  }, [user]);
  if (!user) return null;
  const phoneOnly = (user.email ?? '').includes('@phone.');

  async function togglePush() {
    setBusy(true); setMsg('');
    try { setPush(push === 'on' ? await disablePush() : await enablePush()); }
    catch { setMsg(bn ? 'চালু করা যায়নি, আবার চেষ্টা করুন।' : 'Could not turn on, please try again.'); }
    setBusy(false);
  }
  async function toggleEmail() {
    const next = !email; setEmail(next);
    await supabaseBrowser().from('profiles').update({ notify_email: next }).eq('id', user!.id);
  }

  const pushNote = push === 'ios-install' ? (bn ? 'iPhone-এ: Safari-র শেয়ার বোতাম → "Add to Home Screen" দিয়ে সাইটটা যোগ করে সেখান থেকে খুললে চালু করা যাবে।' : 'On iPhone: add the site to your Home Screen first.')
    : push === 'denied' ? (bn ? 'ব্রাউজারে নোটিফিকেশন বন্ধ করা আছে। ব্রাউজারের Site settings থেকে Notifications "Allow" করুন।' : 'Notifications are blocked in your browser settings.')
    : push === 'unsupported' ? (bn ? 'এই ব্রাউজারে ফোনের নোটিফিকেশন চলে না।' : 'Not supported in this browser.') : '';

  return (
    <div className={compact ? 'space-y-2 text-sm' : 'space-y-3'}>
      <div className="flex items-center gap-3">
        <BellRing className="h-5 w-5 shrink-0 text-brand-600" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{bn ? 'ফোনে নোটিফিকেশন' : 'Phone notifications'}</p>
          {!compact && <p className="text-xs text-ink-soft">{bn ? 'নতুন সাপ্তাহিক ফ্রি টেস্ট ও নতুন সরকারি সার্কুলার এলে সঙ্গে সঙ্গে জানাবে।' : 'New weekly test and new government circulars.'}</p>}
        </div>
        {(push === 'on' || push === 'off') && (
          <button disabled={busy} onClick={togglePush} className={push === 'on' ? 'btn-ghost !px-3 !py-1.5 text-xs' : 'btn-primary !px-3 !py-1.5 text-xs'}>
            {busy ? '…' : push === 'on' ? (bn ? 'চালু ✓ (বন্ধ করুন)' : 'On ✓ (turn off)') : (bn ? 'চালু করুন' : 'Turn on')}
          </button>
        )}
      </div>
      {pushNote && <p className="text-xs text-ink-soft">{pushNote}</p>}
      {msg && <p className="text-xs text-red-600">{msg}</p>}
      {!phoneOnly && email !== null && (
        <label className="flex cursor-pointer items-center gap-3">
          <Mail className="h-5 w-5 shrink-0 text-brand-600" />
          <span className="min-w-0 flex-1"><span className="font-semibold text-ink">{bn ? 'ইমেইলে জানাবে' : 'Email updates'}</span>
            {!compact && <span className="block text-xs text-ink-soft">{bn ? 'সপ্তাহে সাধারণত ১টি — নতুন ফ্রি টেস্ট আর নতুন সার্কুলার।' : 'Usually one a week.'}</span>}</span>
          <input type="checkbox" className="h-5 w-5 accent-brand-600" checked={email} onChange={toggleEmail} />
        </label>
      )}
    </div>
  );
}
