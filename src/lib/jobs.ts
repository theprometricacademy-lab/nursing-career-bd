export type Job = {
  id: number; slug: string; hospital_id: number | null; hospital_name: string; district: string | null; location: string | null;
  post_title: string; vacancies: number | null; salary: string | null; job_type: string | null;
  qualifications: string | null; description: string | null; deadline: string | null;
  apply_mode: 'site' | 'external'; apply_url: string | null; apply_info: string | null; source_url: string | null;
  status: 'pending' | 'published' | 'closed' | 'rejected'; published_at: string | null; created_at: string; updated_at: string;
};

export type CandidateProfile = {
  full_name: string; phone: string; email: string | null; district: string | null; address: string | null;
  date_of_birth: string | null; gender: string | null; qualification: string; institute: string | null; passing_year: number | null;
  bnmc_reg: string | null; experience_years: number | null; experience: string | null; current_workplace: string | null;
  skills: string | null; about: string | null; cv_path?: string | null;
};

export const DISTRICTS = [
  'ঢাকা', 'গাজীপুর', 'নারায়ণগঞ্জ', 'নরসিংদী', 'মানিকগঞ্জ', 'মুন্সীগঞ্জ', 'টাঙ্গাইল', 'কিশোরগঞ্জ', 'ফরিদপুর', 'গোপালগঞ্জ', 'মাদারীপুর', 'রাজবাড়ী', 'শরীয়তপুর',
  'চট্টগ্রাম', 'কক্সবাজার', 'কুমিল্লা', 'ফেনী', 'নোয়াখালী', 'লক্ষ্মীপুর', 'চাঁদপুর', 'ব্রাহ্মণবাড়িয়া', 'রাঙ্গামাটি', 'খাগড়াছড়ি', 'বান্দরবান',
  'রাজশাহী', 'বগুড়া', 'পাবনা', 'সিরাজগঞ্জ', 'নাটোর', 'নওগাঁ', 'চাঁপাইনবাবগঞ্জ', 'জয়পুরহাট',
  'খুলনা', 'যশোর', 'কুষ্টিয়া', 'সাতক্ষীরা', 'বাগেরহাট', 'ঝিনাইদহ', 'মাগুরা', 'নড়াইল', 'চুয়াডাঙ্গা', 'মেহেরপুর',
  'বরিশাল', 'পটুয়াখালী', 'ভোলা', 'পিরোজপুর', 'বরগুনা', 'ঝালকাঠি',
  'সিলেট', 'মৌলভীবাজার', 'হবিগঞ্জ', 'সুনামগঞ্জ',
  'রংপুর', 'দিনাজপুর', 'গাইবান্ধা', 'কুড়িগ্রাম', 'লালমনিরহাট', 'নীলফামারী', 'পঞ্চগড়', 'ঠাকুরগাঁও',
  'ময়মনসিংহ', 'জামালপুর', 'শেরপুর', 'নেত্রকোনা',
];

export const QUALIFICATIONS = [
  'ডিপ্লোমা ইন নার্সিং সায়েন্স অ্যান্ড মিডওয়াইফারি', 'বিএসসি ইন নার্সিং', 'পোস্ট বেসিক বিএসসি নার্সিং', 'এমএসসি নার্সিং',
  'ডিপ্লোমা ইন মিডওয়াইফারি', 'বিএসসি ইন মিডওয়াইফারি', 'অন্যান্য',
];

export const JOB_TYPES = ['ফুল টাইম', 'পার্ট টাইম', 'চুক্তিভিত্তিক', 'ইন্টার্নশিপ'];

export const APP_STATUS_BN: Record<string, { label: string; tone: string }> = {
  submitted: { label: 'জমা হয়েছে', tone: 'bg-brand-100 text-brand-700' },
  viewed: { label: 'হাসপাতাল দেখেছে', tone: 'bg-gold-100 text-gold-800' },
  shortlisted: { label: 'বাছাই তালিকায়', tone: 'bg-mint-100 text-mint-700' },
  rejected: { label: 'নির্বাচিত হয়নি', tone: 'bg-slate-100 text-slate-600' },
  hired: { label: 'নিয়োগ পেয়েছেন 🎉', tone: 'bg-mint-600 text-white' },
};

/** Today in Bangladesh as YYYY-MM-DD */
export function bdToday() {
  return new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Server-side read through the public REST API (RLS shows published jobs only). */
export async function fetchJobs(query: string): Promise<Job[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const r = await fetch(`${url}/rest/v1/jobs?${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' });
    return r.ok ? ((await r.json()) as Job[]) : [];
  } catch { return []; }
}

/** Open jobs: published and the deadline (if any) not passed yet */
export function openJobsQuery(extra = '') {
  return `select=*&status=eq.published&or=(deadline.is.null,deadline.gte.${bdToday()})&order=published_at.desc.nullslast&limit=200${extra}`;
}

/** Only http(s) links are ever rendered as hrefs (the database also enforces this). */
export const safeUrl = (u: string | null | undefined) => (u && /^https?:\/\//i.test(u) ? u : null);
