export type Circular = {
  id: number; slug: string; title_bn: string; org_bn: string; ministry_bn: string | null; recruiter_bn: string | null;
  post_name_bn: string | null; total_posts: number | null; grade_bn: string | null; salary_bn: string | null;
  job_type: 'permanent' | 'contract' | 'commission' | 'temporary';
  qualification_bn: string | null; age_limit_bn: string | null; fee_bn: string | null; details_bn: string | null;
  exam_info_bn: string | null; circular_no: string | null;
  publish_at: string | null; apply_start: string | null; apply_end: string | null;
  apply_url: string | null; official_url: string | null; pdf_url: string | null; source_name: string | null; source_url: string | null;
  updated_at: string;
};

export const JOB_TYPE_BN: Record<Circular['job_type'], string> = {
  permanent: 'সরকারি · স্থায়ী', temporary: 'সরকারি · রাজস্ব খাত', contract: 'চুক্তিভিত্তিক', commission: 'কমিশন (সশস্ত্র বাহিনী)',
};

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const bnNum = (n: number | string) => String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

/** Date in Bangladesh time, e.g. "৩০ নভেম্বর ২০২৬" (no Intl dependency, so it renders the same on server and client). */
export function bnDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(new Date(iso).getTime() + 6 * 3600 * 1000); // Asia/Dhaka is UTC+6, no DST
  return `${bnNum(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${bnNum(d.getUTCFullYear())}`;
}

export function status(c: Pick<Circular, 'apply_start' | 'apply_end'>, now = Date.now()) {
  const end = c.apply_end ? new Date(c.apply_end).getTime() : null;
  const start = c.apply_start ? new Date(c.apply_start).getTime() : null;
  if (start && now < start) return { key: 'upcoming' as const, label: 'শীঘ্রই শুরু', tone: 'bg-brand-100 text-brand-800' };
  if (end && now > end) return { key: 'closed' as const, label: 'আবেদন শেষ', tone: 'bg-slate-100 text-slate-600' };
  const days = end ? Math.ceil((end - now) / 86400000) : null;
  if (days !== null && days <= 5) return { key: 'closing' as const, label: days <= 1 ? 'আজই শেষ দিন' : `আর ${bnNum(days)} দিন`, tone: 'bg-blush-100 text-blush-700' };
  return { key: 'open' as const, label: 'আবেদন চলছে', tone: 'bg-mint-100 text-mint-700' };
}

/** Server-side read through the public REST API (RLS shows published rows only). */
export async function fetchCirculars(query: string): Promise<Circular[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const r = await fetch(`${url}/rest/v1/circulars?${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' });
    return r.ok ? ((await r.json()) as Circular[]) : [];
  } catch { return []; }
}
