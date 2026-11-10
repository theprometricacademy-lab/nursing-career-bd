// Which build of the site is live right now (see UpdateChecker).
export const dynamic = 'force-dynamic';

export function GET() {
  return new Response(process.env.NEXT_PUBLIC_BUILD_ID || '', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store, max-age=0' },
  });
}
