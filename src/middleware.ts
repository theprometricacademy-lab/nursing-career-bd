import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Runs ONLY on pages that need a logged-in user (see matcher below), so public pages
// load without waiting for an auth round-trip.
const PROTECTED = ['/dashboard', '/exam', '/result', '/results', '/bookmarks', '/wrong-answers', '/profile', '/daily-quiz', '/admin', '/payment', '/jobs/my-cv'];
const OLD_HOSTS = ['nursingjob.online', 'www.nursingjob.online', 'www.nursingcareerbd.com'];
const CANONICAL_HOST = 'nursingcareerbd.com';

export async function middleware(req: NextRequest) {
  // Old domain (and www) → permanent redirect to the same page on nursingcareerbd.com
  const host = (req.headers.get('host') || '').toLowerCase().split(':')[0];
  if (OLD_HOSTS.includes(host)) {
    const url = new URL(req.nextUrl.pathname + req.nextUrl.search, `https://${CANONICAL_HOST}`);
    return NextResponse.redirect(url, 301);
  }
  const path = req.nextUrl.pathname;
  if (!PROTECTED.some((p) => path === p || path.startsWith(p + '/'))) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );
  // getSession reads the cookie locally (refreshing only when expired) — no network call per page.
  // This is only a redirect convenience: data is protected by Row Level Security,
  // and /admin re-checks the user server-side.
  const { data: { session } } = await sb.auth.getSession();

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  // Everything except Next.js internals: the old-domain redirect must cover all pages.
  // Auth checks still only run on the protected paths listed above.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
