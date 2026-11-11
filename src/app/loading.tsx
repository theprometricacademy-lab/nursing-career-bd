// Shown instantly while the next page loads, so a tap never feels ignored.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="লোড হচ্ছে">
      <div className="h-8 w-2/3 rounded-xl bg-brand-100/70" />
      <div className="h-4 w-1/2 rounded bg-brand-100/60" />
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((k) => <div key={k} className="h-24 rounded-2xl bg-brand-50" />)}
      </div>
      <div className="h-40 rounded-2xl bg-brand-50" />
    </div>
  );
}
