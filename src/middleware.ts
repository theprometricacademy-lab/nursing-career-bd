import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Runs ONLY on pages that need a logged-in user (see matcher below), so public pages
// load without waiting for an auth round-trip.
export async function middleware(req: NextRequest) {
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
  matcher: [
    '/dashboard/:path*', '/exam/:path*', '/result/:path*', '/results/:path*', '/bookmarks/:path*',
    '/wrong-answers/:path*', '/profile/:path*', '/daily-quiz/:path*', '/admin/:path*', '/payment/:path*',
  ],
};
