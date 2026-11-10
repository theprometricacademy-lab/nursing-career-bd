// Subjects that get a public, Google-indexable MCQ sample page at /mcq/[slug].
export const SEO_SUBJECTS: { slug: string; bn: string; en: string; nursing: boolean }[] = [
  { slug: 'fundamentals', bn: 'নার্সিংয়ের মৌলিক বিষয়', en: 'Fundamentals of Nursing', nursing: true },
  { slug: 'medical-surgical', bn: 'মেডিকেল সার্জিক্যাল নার্সিং', en: 'Medical Surgical Nursing', nursing: true },
  { slug: 'anatomy-physiology', bn: 'অ্যানাটমি ও ফিজিওলজি', en: 'Anatomy & Physiology', nursing: true },
  { slug: 'pharmacology', bn: 'ফার্মাকোলজি', en: 'Pharmacology', nursing: true },
  { slug: 'community-health', bn: 'কমিউনিটি হেলথ নার্সিং', en: 'Community Health Nursing', nursing: true },
  { slug: 'maternal-child', bn: 'মাতৃ ও শিশু স্বাস্থ্য নার্সিং', en: 'Maternal & Child Health Nursing', nursing: true },
  { slug: 'pediatric', bn: 'শিশু নার্সিং', en: 'Pediatric Nursing', nursing: true },
  { slug: 'psychiatric', bn: 'মানসিক স্বাস্থ্য নার্সিং', en: 'Psychiatric Nursing', nursing: true },
  { slug: 'management', bn: 'নার্সিং ব্যবস্থাপনা', en: 'Nursing Management', nursing: true },
  { slug: 'nutrition', bn: 'পুষ্টি', en: 'Nutrition', nursing: true },
  { slug: 'microbiology', bn: 'মাইক্রোবায়োলজি', en: 'Microbiology', nursing: true },
  { slug: 'first-aid', bn: 'প্রাথমিক চিকিৎসা ও জরুরি নার্সিং', en: 'First Aid & Emergency Nursing', nursing: true },
  { slug: 'bangla', bn: 'বাংলা', en: 'Bangla', nursing: false },
  { slug: 'english', bn: 'ইংরেজি', en: 'English', nursing: false },
  { slug: 'bangladesh-affairs', bn: 'বাংলাদেশ বিষয়াবলি', en: 'Bangladesh Affairs', nursing: false },
  { slug: 'international-affairs', bn: 'আন্তর্জাতিক বিষয়াবলি', en: 'International Affairs', nursing: false },
  { slug: 'general-science', bn: 'সাধারণ বিজ্ঞান', en: 'General Science', nursing: false },
  { slug: 'general-knowledge', bn: 'সাধারণ জ্ঞান', en: 'General Knowledge', nursing: false },
  { slug: 'ict', bn: 'তথ্য ও যোগাযোগ প্রযুক্তি', en: 'ICT', nursing: false },
  { slug: 'mathematics', bn: 'গণিত', en: 'Mathematics', nursing: false },
];

export type SampleQ = {
  id: number; subject_slug: string; subject_bn: string; difficulty: string;
  question_bn: string; options_bn: string[]; correct_option: number; explanation_bn: string | null;
};

export async function rpc<T>(fn: string, body: object): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), cache: 'no-store',
    });
    return r.ok ? ((await r.json()) as T) : null;
  } catch { return null; }
}
