'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from './AppProvider';

/** The member's own yes/no to showing their name and photo on the public weekly winner card. */
export function BoardConsent({ className = '' }: { className?: string }) {
  const { user, profile, refresh, lang } = useApp();
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  if (!user || !profile) return null;
  const checked = on ?? !!profile.show_on_board;
  const bn = lang === 'bn';

  async function toggle() {
    setBusy(true);
    const next = !checked;
    const { error } = await supabaseBrowser().from('profiles').update({ show_on_board: next }).eq('id', user!.id);
    setBusy(false);
    if (!error) { setOn(next); refresh(); }
  }

  return (
    <label className={`flex cursor-pointer items-start gap-2 rounded-xl border border-brand-100 bg-brand-50/50 p-3 text-sm text-ink ${className}`}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={checked} disabled={busy} onChange={toggle} />
      <span>
        {bn ? 'সেরা ৩-এ এলে আমার নাম ও ছবি Nursing Career BD-এর ফেসবুক পোস্টে দেখানো যাবে' : 'If I make the top 3, my name and photo may be shown on the Nursing Career BD Facebook post'}
        <span className="block text-xs text-ink-soft">{bn ? 'টিক না দিলে নাম আংশিক লুকানো থাকবে (যেমন: র*** খা***), ছবি দেখানো হবে না। যেকোনো সময় বদলাতে পারবেন।' : 'Unticked, your name is partly hidden (e.g. R*** K***) and no photo is shown. You can change this any time.'}</span>
      </span>
    </label>
  );
}
