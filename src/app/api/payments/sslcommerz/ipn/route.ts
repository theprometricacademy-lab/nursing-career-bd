import { NextResponse, type NextRequest } from 'next/server';
import { verifySsl } from '../verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Server-to-server notification from SSLCommerz (works even if the user closes the browser)
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const valId = form?.get('val_id')?.toString();
  if (!valId) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const r = await verifySsl(valId);
    return NextResponse.json({ ok: r.paid });
  } catch (e) {
    console.error('sslcommerz ipn error', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
