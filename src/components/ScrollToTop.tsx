'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * On a link/tab change, start the new page at the very top of the window.
 * (Next.js scrolls only the changed part of the page to the top edge of the screen, which leaves the
 * page title hidden behind our sticky header and the "back" links above it out of view.)
 * Back/forward keeps the browser's own scroll position.
 */
export function ScrollToTop() {
  const path = usePathname();
  const first = useRef(true);
  const fromHistory = useRef(false);

  useEffect(() => {
    const onPop = () => { fromHistory.current = true; };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (fromHistory.current) { fromHistory.current = false; return; }
    if (window.location.hash) return;
    window.scrollTo(0, 0);
    const id = requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => cancelAnimationFrame(id);
  }, [path]);

  return null;
}
