import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { supabaseService } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/payments/common';
import { normalizeBdPhone, phoneToEmail } from '@/lib/phoneAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(10).max(20),
  password: z.string().min(8).max(72),
});

// Creates a mobile-number account (no email needed). The browser then signs in with the number + password.
export async function POST(req: NextRequest) {
  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'x';
  if (!rateLimit(`phone-signup:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।' }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'নাম, মোবাইল নম্বর ও কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড দিন।' }, { status: 400 });
  const phone = normalizeBdPhone(parsed.data.phone);
  if (!phone) return NextResponse.json({ error: 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন (01XXXXXXXXX)' }, { status: 400 });

  const { error } = await supabaseService().auth.admin.createUser({
    email: phoneToEmail(phone),
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.name, phone, signup_method: 'phone' },
  });
  if (error) {
    const taken = /already|registered|exists/i.test(error.message);
    return NextResponse.json(
      { error: taken ? 'এই নম্বরে আগেই অ্যাকাউন্ট আছে। লগইন করুন।' : 'অ্যাকাউন্ট খোলা যায়নি। আবার চেষ্টা করুন।', taken },
      { status: taken ? 409 : 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
