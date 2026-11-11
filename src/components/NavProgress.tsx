'use client';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/** Thin bar at the very top while a new page is on its way — the old page stays visible meanwhile, like an app. */
export function NavProgress() {
  const path = usePathname();
  const search = useSearchParams();
  const [on, setOn] = useState(false);

  useEffect(() => { setOn(false); }, [path, search]);
  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      setOn(true);
    };
    document.addEventListener('click', click, true);
    return () => document.removeEventListener('click', click, true);
  }, []);

  if (!on) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden" aria-hidden>
      <div className="h-full w-1/3 animate-[navbar_1s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-brand-500 via-blush-500 to-brand-500" />
      <style>{'@keyframes navbar{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}'}</style>
    </div>
  );
}
